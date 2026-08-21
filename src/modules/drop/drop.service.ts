import { QueryTypes } from 'sequelize';
import { sequelize, Drop } from '../../db/models/index.js';
import { AppError } from '../../utils/AppError.js';
import { emitDropCreated } from '../../sockets/index.js';
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
    GROUP BY d.id
    ORDER BY d.created_at DESC;
    `,
    { type: QueryTypes.SELECT },
  );

  return rows;
};

const getDropById = async (dropId: string) => {
  const drop = await Drop.findByPk(dropId);
  if (!drop) {
    throw new AppError(404, 'Drop not found');
  }
  return drop;
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

export const DropService = { getAllDropsWithActivity, getDropById, createDrop };
