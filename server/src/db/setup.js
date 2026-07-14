import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Applies schema.sql to the given pool. Safe to run repeatedly
 * (every statement is IF NOT EXISTS).
 */
export async function applySchema(targetPool = pool) {
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  await targetPool.query(sql);
}

// Allow running directly: `npm run db:setup`
const isMain =
  process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    await applySchema();
    console.log('✓ Schema applied.');
  } catch (err) {
    console.error('✗ Schema setup failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
