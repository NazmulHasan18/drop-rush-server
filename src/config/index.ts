import dotenv from 'dotenv';

dotenv.config();

const required = (name: string, fallback?: string): string => {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 5000),
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:3000',
  database: {
    url: required('DATABASE_URL'),
    ssl: process.env.DB_SSL === 'true',
  },
  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  reservation: {
    ttlSeconds: Number(process.env.RESERVATION_TTL_SECONDS ?? 60),
    expirySweepCron: process.env.EXPIRY_SWEEP_CRON ?? '*/2 * * * * *',
  },
};
