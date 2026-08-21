/**
 * Quick manual setup: executes sql/schema.sql against DATABASE_URL.
 *
 * This is the scripted equivalent of pasting sql/schema.sql into the Neon
 * SQL editor by hand. It does NOT touch the sequelize-cli migrations table,
 * so it should only be used for fresh/throwaway databases (e.g. local dev,
 * a demo instance) — not as a substitute for `pnpm migrate` on a database
 * that's already being tracked by migrations.
 *
 * Usage: pnpm db:create-schema
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { sequelize } from '../config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, '../../sql/schema.sql');

const run = async (): Promise<void> => {
  const sql = readFileSync(schemaPath, 'utf-8');

  console.log(`Running schema from ${schemaPath} ...`);

  try {
    await sequelize.authenticate();
    // schema.sql contains multiple statements (CREATE TABLE, CREATE TYPE,
    // CREATE INDEX, INSERT ...). Sequelize's query() sends the whole string
    // to pg as a single simple-query call, which supports multi-statement
    // bodies, so no manual splitting is needed here.
    await sequelize.query(sql);
    console.log('Schema created successfully.');
  } catch (err) {
    console.error('Failed to create schema:');
    console.error(err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

void run();
