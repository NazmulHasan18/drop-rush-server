import { QueryTypes, type Transaction } from 'sequelize';
import { sequelize } from '../db/models/index.js';

/**
 * Runs a raw `UPDATE ... RETURNING ...` statement and returns the single
 * updated row (or undefined if the WHERE clause matched nothing - e.g. the
 * conditional stock-decrement losing the race, as intended).
 *
 * Centralized here because Sequelize's typed `query<T>()` overloads only
 * cover QueryTypes.SELECT; UPDATE-with-RETURNING needs a manual cast, which
 * this wrapper does once instead of at every call site.
 */
export const updateReturning = async <T extends object>(
  sql: string,
  replacements: Record<string, unknown>,
  transaction: Transaction,
): Promise<T | undefined> => {
  const [rows] = (await sequelize.query(sql, {
    replacements,
    type: QueryTypes.UPDATE,
    transaction,
  })) as unknown as [T[], number];

  return rows[0];
};
