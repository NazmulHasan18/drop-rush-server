require('dotenv').config();

const useUrl = process.env.DATABASE_URL;
const sslEnabled = process.env.DB_SSL === 'true';

const dialectOptions = sslEnabled
  ? { ssl: { require: true, rejectUnauthorized: false } }
  : {};

const shared = {
  use_env_variable: useUrl ? 'DATABASE_URL' : undefined,
  dialect: 'postgres',
  dialectOptions,
  logging: false,
};

module.exports = {
  development: shared,
  test: shared,
  production: shared,
};
