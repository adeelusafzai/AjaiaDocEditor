import pg from 'pg';

/**
 * Resolves the connection URLs used by the test suite. Tests run against a
 * dedicated `<db>_test` database so they never touch dev/seed data.
 */
export function resolveTestUrls() {
  const base = process.env.DATABASE_URL || 'postgres://docs:docs@localhost:5433/docs';
  const testUrl =
    process.env.TEST_DATABASE_URL ||
    (() => {
      const u = new URL(base);
      const name = (u.pathname.replace(/^\//, '') || 'docs') + '_test';
      u.pathname = `/${name}`;
      return u.toString();
    })();

  const u = new URL(testUrl);
  const dbName = u.pathname.replace(/^\//, '');
  const adminUrl = (() => {
    const a = new URL(testUrl);
    a.pathname = '/postgres';
    return a.toString();
  })();

  return { testUrl, adminUrl, dbName };
}

/** Creates the test database if it doesn't already exist. */
export async function ensureTestDatabase() {
  const { testUrl, adminUrl, dbName } = resolveTestUrls();
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (!rowCount) {
    await admin.query(`CREATE DATABASE ${dbName}`);
  }
  await admin.end();
  return testUrl;
}

/** Removes all rows so each test run starts from a known state. */
export async function truncateAll(pool) {
  await pool.query('TRUNCATE users, documents, document_shares RESTART IDENTITY CASCADE');
}
