import { sequelize, Reservation, Purchase, User, Drop } from '../../db/models/index.js';
import { ReservationStatus } from '../../db/models/enums.js';
import { AppError } from '../../utils/AppError.js';
import { updateReturning } from '../../utils/rawQuery.js';
import { emitStockUpdate, emitActivityFeedUpdate } from '../../sockets/index.js';

interface DropSoldRow {
  id: string;
  available_stock: number;
  total_stock: number;
  sold_count: number;
}

/**
 * Completes a purchase for a reservation the user currently holds.
 *
 * Note: available_stock was already decremented at reservation time, so
 * purchasing does NOT touch available_stock again - it only flips the
 * reservation to COMPLETED, records the Purchase row, and bumps sold_count
 * (a display/reporting counter). This keeps "how many can still be
 * reserved" and "how many have actually sold" as two independent numbers.
 */
const purchaseReservation = async (reservationId: string, userId: string) => {
  const result = await sequelize.transaction(async (t) => {
    const reservation = await Reservation.findOne({
      where: { id: reservationId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!reservation) {
      throw new AppError(404, 'Reservation not found');
    }
    if (reservation.userId !== userId) {
      throw new AppError(403, 'This reservation does not belong to you');
    }
    if (reservation.status !== ReservationStatus.ACTIVE) {
      throw new AppError(400, `Reservation is ${reservation.status.toLowerCase()} and can no longer be purchased`);
    }
    if (reservation.expiresAt.getTime() <= Date.now()) {
      // The cron sweep hasn't caught this one yet - fail fast rather than
      // let a stale reservation convert into a sale.
      reservation.status = ReservationStatus.EXPIRED;
      await reservation.save({ transaction: t });
      throw new AppError(410, 'Your reservation window has expired');
    }

    const drop = await Drop.findByPk(reservation.dropId, { transaction: t });
    if (!drop) {
      throw new AppError(404, 'Drop not found');
    }

    reservation.status = ReservationStatus.COMPLETED;
    await reservation.save({ transaction: t });

    const purchase = await Purchase.create(
      {
        dropId: drop.id,
        userId,
        reservationId: reservation.id,
        price: drop.price,
      },
      { transaction: t },
    );

    const updatedDrop = await updateReturning<DropSoldRow>(
      `
      UPDATE drops
      SET sold_count = sold_count + 1, updated_at = now()
      WHERE id = :dropId
      RETURNING id, available_stock, total_stock, sold_count;
      `,
      { dropId: drop.id },
      t,
    );

    const buyer = await User.findByPk(userId, { transaction: t });

    return { purchase, drop: updatedDrop, buyerUsername: buyer?.username ?? 'unknown' };
  });

  if (result.drop) {
    emitStockUpdate({
      dropId: result.drop.id,
      availableStock: result.drop.available_stock,
      totalStock: result.drop.total_stock,
      soldCount: result.drop.sold_count,
    });

    emitActivityFeedUpdate({
      dropId: result.drop.id,
      latestPurchasers: [{ username: result.buyerUsername, purchasedAt: result.purchase.createdAt }],
    });
  }

  return result.purchase;
};

export const PurchaseService = { purchaseReservation };
