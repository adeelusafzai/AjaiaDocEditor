import pg from 'pg';
import config from '../config.js';

const { Pool } = pg;

// A single shared connection pool for the process. Tests can pass an override
// URL via TEST_DATABASE_URL by constructing their own pool through createPool.
export function createPool(connectionString = config.db.url) {
  return new Pool({
    connectionString,
    ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
    // On Vercel each warm function instance keeps its own pool, so stay tiny and
    // lean on the provider's connection pooler (Vercel Postgres / Neon pooled URL).
    max: config.serverless ? 1 : 10,
    idleTimeoutMillis: 30_000,
  });
}

// Cache the pool on globalThis so warm serverless invocations reuse one pool
// instead of leaking a new one per request.
export const pool = globalThis.__ajaiaDocsPool ?? (globalThis.__ajaiaDocsPool = createPool());

export const query = (text, params) => pool.query(text, params);

export default pool;
