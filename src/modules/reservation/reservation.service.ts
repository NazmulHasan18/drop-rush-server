import { QueryTypes } from 'sequelize';
import { sequelize, Drop, Reservation } from '../../db/models/index.js';
import { ReservationStatus } from '../../db/models/enums.js';
import { AppError } from '../../utils/AppError.js';
import { config } from '../../config/index.js';
import { updateReturning } from '../../utils/rawQuery.js';
import { emitStockUpdate, emitReservationExpired } from '../../sockets/index.js';

interface DropStockRow {
  id: string;
  available_stock: number;
  total_stock: number;
  sold_count: number;
}

interface UserReservationRow {
  id: string;
  dropId: string;
  userId: string;
  status: ReservationStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  dropName: string;
  dropPrice: string;
  dropTotalStock: number;
  dropAvailableStock: number;
  dropStartsAt: Date;
}

/**
 * Reserve one unit of a drop for a user.
 *
 * Concurrency strategy ("Atomic Reservation"):
 * A single conditional UPDATE (`available_stock = available_stock - 1
 * WHERE available_stock > 0`) is executed. In Postgres, an UPDATE statement
 * acquires a row-level lock the instant it starts modifying a row, and
 * concurrent UPDATEs against the *same row* are automatically serialized by
 * the database engine itself - there is no window between "check" and "act"
 * because the check (available_stock > 0) and the act (decrement) happen as
 * one atomic operation evaluated under the row lock. If 100 requests hit
 * this at once for the last unit, 99 of them simply get 0 rows back from the
 * UPDATE and fail cleanly with 409 Conflict; no explicit SELECT ... FOR
 * UPDATE or SERIALIZABLE isolation is required.
 *
 * The stock decrement and reservation insert are wrapped in a single DB
 * transaction so that if the reservation insert fails for any reason, the
 * stock decrement is rolled back too.
 */
const reserveDrop = async (dropId: string, userId: string) => {
  const ttlSeconds = config.reservation.ttlSeconds;

  const result = await sequelize.transaction(async (t) => {
    const existingActive = await Reservation.findOne({
      where: { dropId, userId, status: ReservationStatus.ACTIVE },
      transaction: t,
    });
    if (existingActive) {
      throw new AppError(409, 'You already have an active reservation for this drop');
    }

    const updatedDrop = await updateReturning<DropStockRow>(
      `
      UPDATE drops
      SET available_stock = available_stock - 1, updated_at = now()
      WHERE id = :dropId AND available_stock > 0
      RETURNING id, available_stock, total_stock, sold_count;
      `,
      { dropId },
      t,
    );

    if (!updatedDrop) {
      // Either the drop doesn't exist, or available_stock was already 0.
      const drop = await Drop.findByPk(dropId, { transaction: t });
      if (!drop) {
        throw new AppError(404, 'Drop not found');
      }
      throw new AppError(409, 'This item is out of stock');
    }

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const reservation = await Reservation.create(
      {
        dropId,
        userId,
        status: ReservationStatus.ACTIVE,
        expiresAt,
      },
      { transaction: t },
    );

    return { reservation, drop: updatedDrop };
  });

  emitStockUpdate({
    dropId,
    availableStock: result.drop.available_stock,
    totalStock: result.drop.total_stock,
    soldCount: result.drop.sold_count,
  });

  return result.reservation;
};

const cancelReservation = async (reservationId: string, userId: string) => {
  const result = await sequelize.transaction(async (t) => {
    const reservation = await Reservation.findOne({
      where: { id: reservationId, userId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!reservation) {
      throw new AppError(404, 'Reservation not found');
    }
    if (reservation.status !== ReservationStatus.ACTIVE) {
      throw new AppError(400, `Reservation is already ${reservation.status.toLowerCase()}`);
    }

    reservation.status = ReservationStatus.CANCELLED;
    await reservation.save({ transaction: t });

    const drop = await updateReturning<DropStockRow>(
      `
      UPDATE drops
      SET available_stock = available_stock + 1, updated_at = now()
      WHERE id = :dropId
      RETURNING id, available_stock, total_stock, sold_count;
      `,
      { dropId: reservation.dropId },
      t,
    );

    return { reservation, drop };
  });

  if (result.drop) {
    emitStockUpdate({
      dropId: result.reservation.dropId,
      availableStock: result.drop.available_stock,
      totalStock: result.drop.total_stock,
      soldCount: result.drop.sold_count,
    });
  }

  return result.reservation;
};

const getMyReservations = async (userId: string): Promise<Array<UserReservationRow & { dropName: string }>> => {
  const rows = await sequelize.query<UserReservationRow>(
    `
    SELECT
      r.id,
      r.drop_id       AS "dropId",
      r.user_id       AS "userId",
      r.status,
      r.expires_at    AS "expiresAt",
      r.created_at    AS "createdAt",
      r.updated_at    AS "updatedAt",
      d.name          AS "dropName",
      d.price         AS "dropPrice",
      d.total_stock   AS "dropTotalStock",
      d.available_stock AS "dropAvailableStock",
      d.starts_at     AS "dropStartsAt"
    FROM reservations r
    INNER JOIN drops d ON d.id = r.drop_id
    WHERE r.user_id = :userId
    ORDER BY r.created_at DESC;
    `,
    { replacements: { userId }, type: QueryTypes.SELECT },
  );

  return rows;
};

/**
 * Stock Recovery Mechanism: finds every ACTIVE reservation whose expiry has
 * passed, flips it to EXPIRED, and returns exactly 1 unit to the drop's
 * available_stock - all inside one transaction per reservation so a crash
 * mid-sweep can never lose or duplicate a unit. Called by the cron job in
 * src/jobs/expireReservations.job.ts.
 */
const expireDueReservations = async (): Promise<number> => {
  const dueReservations = await Reservation.findAll({
    where: { status: ReservationStatus.ACTIVE },
    // Cheap because of the (status, expires_at) index; filtering expiry
    // precisely happens per-row below to avoid clock-skew edge cases.
  });

  const now = Date.now();
  const due = dueReservations.filter((r) => r.expiresAt.getTime() <= now);

  let expiredCount = 0;

  for (const reservation of due) {
    try {
      await sequelize.transaction(async (t) => {
        const locked = await Reservation.findOne({
          where: { id: reservation.id, status: ReservationStatus.ACTIVE },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (!locked) return; // already handled by a purchase or another sweep

        locked.status = ReservationStatus.EXPIRED;
        await locked.save({ transaction: t });

        const drop = await updateReturning<DropStockRow>(
          `
          UPDATE drops
          SET available_stock = available_stock + 1, updated_at = now()
          WHERE id = :dropId
          RETURNING id, available_stock, total_stock, sold_count;
          `,
          { dropId: locked.dropId },
          t,
        );

        if (drop) {
          emitReservationExpired({
            dropId: locked.dropId,
            reservationId: locked.id,
            availableStock: drop.available_stock,
          });
          emitStockUpdate({
            dropId: locked.dropId,
            availableStock: drop.available_stock,
            totalStock: drop.total_stock,
            soldCount: drop.sold_count,
          });
        }

        expiredCount += 1;
      });
    } catch (err) {
      // Don't let one bad row kill the whole sweep.
      console.error(`Failed to expire reservation ${reservation.id}:`, err);
    }
  }

  return expiredCount;
};

export const ReservationService = { reserveDrop, cancelReservation, getMyReservations, expireDueReservations };
