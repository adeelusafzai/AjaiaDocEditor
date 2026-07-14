import bcrypt from 'bcryptjs';
import { pool } from './pool.js';
import { applySchema } from './setup.js';

// Demo accounts reviewers can use to exercise the sharing flow.
export const SEED_PASSWORD = 'password123';

const SEED_USERS = [
  { email: 'alice@demo.com', name: 'Alice Owner' },
  { email: 'bob@demo.com', name: 'Bob Collaborator' },
  { email: 'carol@demo.com', name: 'Carol Reader' },
];

const WELCOME_HTML = `
<h1>Welcome to Ajaia Docs</h1>
<p>This is a <strong>collaborative</strong> document editor. Try the toolbar above to make text
<strong>bold</strong>, <em>italic</em>, or <u>underlined</u>.</p>
<h2>Things you can do</h2>
<ul>
  <li>Create, rename, and edit documents</li>
  <li>Import a <code>.txt</code>, <code>.md</code>, or <code>.docx</code> file as a new document</li>
  <li>Share a document with another user as a viewer or an editor</li>
</ul>
<ol>
  <li>Formatting is preserved across refreshes.</li>
  <li>Shared documents appear in the recipient's "Shared with me" list.</li>
</ol>
`.trim();

const ROADMAP_HTML = `
<h1>Q3 Product Roadmap</h1>
<p>Shared with the team for review. Bob can edit; Carol can only read.</p>
<h2>Priorities</h2>
<ul>
  <li>Ship the collaborative editor MVP</li>
  <li>File import (txt / md / docx)</li>
  <li>Sharing with roles</li>
</ul>
`.trim();

export async function seed(targetPool = pool) {
  await applySchema(targetPool);

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const users = {};
  for (const u of SEED_USERS) {
    const { rows } = await targetPool.query(
      `INSERT INTO users (email, name, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, email, name`,
      [u.email, u.name, passwordHash]
    );
    users[u.email] = rows[0];
  }

  // Reset demo documents so the seed is deterministic on re-run.
  await targetPool.query(
    `DELETE FROM documents WHERE owner_id = $1 AND title IN ($2, $3)`,
    [users['alice@demo.com'].id, 'Welcome to Ajaia Docs', 'Q3 Product Roadmap']
  );

  const welcome = await targetPool.query(
    `INSERT INTO documents (owner_id, title, content) VALUES ($1, $2, $3) RETURNING id`,
    [users['alice@demo.com'].id, 'Welcome to Ajaia Docs', WELCOME_HTML]
  );

  const roadmap = await targetPool.query(
    `INSERT INTO documents (owner_id, title, content) VALUES ($1, $2, $3) RETURNING id`,
    [users['alice@demo.com'].id, 'Q3 Product Roadmap', ROADMAP_HTML]
  );

  // Alice shares the roadmap: Bob as editor, Carol as viewer.
  await targetPool.query(
    `INSERT INTO document_shares (document_id, user_id, role) VALUES ($1, $2, 'editor')
     ON CONFLICT (document_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
    [roadmap.rows[0].id, users['bob@demo.com'].id]
  );
  await targetPool.query(
    `INSERT INTO document_shares (document_id, user_id, role) VALUES ($1, $2, 'viewer')
     ON CONFLICT (document_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
    [roadmap.rows[0].id, users['carol@demo.com'].id]
  );

  return { users, documents: { welcome: welcome.rows[0].id, roadmap: roadmap.rows[0].id } };
}

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const isMain =
  process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const result = await seed();
    console.log('✓ Seeded users:');
    for (const email of Object.keys(result.users)) {
      console.log(`   - ${email}  (password: ${SEED_PASSWORD})`);
    }
    console.log('✓ Seeded 2 documents (1 shared with Bob as editor, Carol as viewer).');
  } catch (err) {
    console.error('✗ Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
