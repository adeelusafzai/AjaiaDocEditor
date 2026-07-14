import { createApp } from './app.js';
import config from './config.js';
import { pool } from './db/pool.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`✓ Ajaia Docs API listening on http://localhost:${config.port} (${config.env})`);
});

// Fail fast with a helpful message if the database is unreachable at startup.
pool
  .query('SELECT 1')
  .then(() => console.log('✓ Database connection OK'))
  .catch((err) => {
    console.error('✗ Could not connect to the database.');
    console.error(`  DATABASE_URL=${config.db.url}`);
    console.error(`  ${err.message}`);
    console.error('  Is Postgres running? Try: npm run db:up  (from the repo root)');
  });

const shutdown = (signal) => {
  console.log(`\n${signal} received, shutting down...`);
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
