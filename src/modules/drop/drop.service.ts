import { QueryTypes } from 'sequelize';
import { Drop, Reservation, sequelize } from '../../db/models/index.js';
import { AppError } from '../../utils/AppError.js';
import { emitDropCreated } from '../../sockets/index.js';
import { ReservationStatus } from '../../db/models/enums.js';
import type { CreateDropInput } from './drop.validation.js';

interface LatestPurchaser {
  username: string;
  purchasedAt: string;
}

interface DropWithActivityRow {
  id: string;
  name: string;
  price: string;
  totalStock: number;
  availableStock: number;
  soldCount: number;
  startsAt: Date;
  createdAt: Date;
  updatedAt: Date;
  latestPurchasers: LatestPurchaser[];
}

interface DropSnapshotRow {
  id: string;
  name: string;
  price: string;
  totalStock: number;
  availableStock: number;
  soldCount: number;
  startsAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface DropSnapshotSummary {
  generatedAt: string;
  totalDrops: number;
  liveDrops: number;
  lowStockDrops: number;
  activeReservations: number;
  totalAvailableStock: number;
  totalSoldCount: number;
  featuredDrop: {
    id: string;
    name: string;
    price: number;
    totalStock: number;
    availableStock: number;
    soldCount: number;
    startsAt: string;
    updatedAt: string;
  } | null;
}

const dropWithActivitySelect = `
    SELECT
      d.id,
      d.name,
      d.price,
      d.total_stock       AS "totalStock",
      d.available_stock   AS "availableStock",
      d.sold_count        AS "soldCount",
      d.starts_at         AS "startsAt",
      d.created_at        AS "createdAt",
      d.updated_at        AS "updatedAt",
      COALESCE(
        json_agg(
          json_build_object('username', u.username, 'purchasedAt', p.created_at)
          ORDER BY p.created_at DESC
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'
      ) AS "latestPurchasers"
    FROM drops d
    LEFT JOIN LATERAL (
      SELECT pu.id, pu.created_at, pu.user_id
      FROM purchases pu
      WHERE pu.drop_id = d.id
      ORDER BY pu.created_at DESC
      LIMIT 3
    ) p ON true
    LEFT JOIN users u ON u.id = p.user_id
`;

/**
 * Fetches every drop plus its 3 most recent purchasers in a single round trip.
 *
 * Uses a LATERAL join so Postgres limits to 3 purchase rows *per drop* before
 * joining against users, instead of pulling every purchase for every drop and
 * filtering in application code (N+1 or over-fetch).
 */
const getAllDropsWithActivity = async (): Promise<DropWithActivityRow[]> => {
  const rows = await sequelize.query<DropWithActivityRow>(
    `
    ${dropWithActivitySelect}
    GROUP BY d.id
    ORDER BY d.created_at DESC;
    `,
    { type: QueryTypes.SELECT },
  );

  return rows;
};

const getDropById = async (dropId: string) => {
  const [drop] = await sequelize.query<DropWithActivityRow>(
    `
    ${dropWithActivitySelect}
    WHERE d.id = :dropId
    GROUP BY d.id
    LIMIT 1;
    `,
    { replacements: { dropId }, type: QueryTypes.SELECT },
  );

  if (!drop) {
    throw new AppError(404, 'Drop not found');
  }
  return drop;
};

const getDashboardSummary = async (): Promise<DropSnapshotSummary> => {
  const [drops, activeReservations] = await Promise.all([
    Drop.findAll({
      raw: true,
      attributes: ['id', 'name', 'price', 'totalStock', 'availableStock', 'soldCount', 'startsAt', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'DESC']],
    }) as Promise<DropSnapshotRow[]>,
    Reservation.count({
      where: { status: ReservationStatus.ACTIVE },
    }),
  ]);

  const now = new Date();
  const liveDrops = drops.filter((drop) => new Date(drop.startsAt) <= now && drop.availableStock > 0);
  const lowStockDrops = liveDrops.filter((drop) => drop.availableStock <= 5).length;
  const totalAvailableStock = liveDrops.reduce((sum, drop) => sum + drop.availableStock, 0);
  const totalSoldCount = drops.reduce((sum, drop) => sum + drop.soldCount, 0);
  const featuredDrop =
    liveDrops
      .slice()
      .sort((a, b) => a.availableStock - b.availableStock || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] ??
    drops[0] ??
    null;

  return {
    generatedAt: now.toISOString(),
    totalDrops: drops.length,
    liveDrops: liveDrops.length,
    lowStockDrops,
    activeReservations,
    totalAvailableStock,
    totalSoldCount,
    featuredDrop: featuredDrop
      ? {
          id: featuredDrop.id,
          name: featuredDrop.name,
          price: Number(featuredDrop.price),
          totalStock: featuredDrop.totalStock,
          availableStock: featuredDrop.availableStock,
          soldCount: featuredDrop.soldCount,
          startsAt: new Date(featuredDrop.startsAt).toISOString(),
          updatedAt: new Date(featuredDrop.updatedAt).toISOString(),
        }
      : null,
  };
};

const createDrop = async (payload: CreateDropInput) => {
  const drop = await Drop.create({
    name: payload.name,
    price: payload.price.toFixed(2),
    totalStock: payload.totalStock,
    availableStock: payload.totalStock,
    startsAt: payload.startsAt ? new Date(payload.startsAt) : new Date(),
  });

  emitDropCreated(drop.toJSON());

  return drop;
};

export const DropService = { getAllDropsWithActivity, getDropById, getDashboardSummary, createDrop };
