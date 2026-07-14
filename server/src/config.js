import dotenv from 'dotenv';

dotenv.config();

const bool = (v, fallback = false) =>
  v === undefined ? fallback : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());

// Accept either DATABASE_URL (our convention / Render / Neon) or POSTGRES_URL
// (what Vercel Postgres injects). Fall back to the local Docker instance.
const dbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  'postgres://docs:docs@localhost:5433/docs';

const isLocalDb = /@(localhost|127\.0\.0\.1|db)[:/]/.test(dbUrl);

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  // Running as a serverless function on Vercel? (used to size the pool)
  serverless: !!process.env.VERCEL,
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-super-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  db: {
    url: dbUrl,
    // Managed Postgres (Vercel/Neon/Render) requires SSL; local Docker does not.
    // Honor an explicit PGSSL override, otherwise infer from the host.
    ssl: process.env.PGSSL !== undefined ? bool(process.env.PGSSL) : !isLocalDb,
  },
  isTest: process.env.NODE_ENV === 'test',
};

export default config;
