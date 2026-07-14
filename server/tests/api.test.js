import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { ensureTestDatabase, truncateAll } from './helpers.js';

// Point the process at the throwaway test database BEFORE anything imports
// config/pool (which read env at module-load time).
process.env.NODE_ENV = 'test';
const testUrl = await ensureTestDatabase();
process.env.DATABASE_URL = testUrl;

// Now it's safe to import modules that build the pool from env.
const { createApp } = await import('../src/app.js');
const { pool } = await import('../src/db/pool.js');
const { applySchema } = await import('../src/db/setup.js');
const { seed, SEED_PASSWORD } = await import('../src/db/seed.js');

const app = createApp();
const api = () => request(app);

let seeded;
const tokens = {};

async function login(email) {
  const res = await api().post('/api/auth/login').send({ email, password: SEED_PASSWORD });
  expect(res.status).toBe(200);
  return res.body.token;
}

beforeAll(async () => {
  await applySchema(pool); // ensure tables exist in the freshly-created test DB
  await truncateAll(pool);
  seeded = await seed(pool);
  tokens.alice = await login('alice@demo.com');
  tokens.bob = await login('bob@demo.com');
  tokens.carol = await login('carol@demo.com');
});

afterAll(async () => {
  await pool.end();
});

const auth = (req, token) => req.set('Authorization', `Bearer ${token}`);

describe('health & auth', () => {
  it('reports healthy', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('rejects a bad password with 401', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'alice@demo.com', password: 'nope' });
    expect(res.status).toBe(401);
  });

  it('rejects an invalid email with a 400 validation error', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'not-an-email', password: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.details).toBeInstanceOf(Array);
  });

  it('blocks unauthenticated access to documents', async () => {
    const res = await api().get('/api/documents');
    expect(res.status).toBe(401);
  });
});

describe('document listing separates owned from shared', () => {
  it('shows Alice her owned documents and no shared ones', async () => {
    const res = await auth(api().get('/api/documents'), tokens.alice);
    expect(res.status).toBe(200);
    expect(res.body.owned.length).toBe(2);
    expect(res.body.shared.length).toBe(0);
    expect(res.body.owned.every((d) => d.access === 'owner')).toBe(true);
  });

  it('shows Bob the roadmap as an editor under "shared"', async () => {
    const res = await auth(api().get('/api/documents'), tokens.bob);
    expect(res.status).toBe(200);
    expect(res.body.owned.length).toBe(0);
    const shared = res.body.shared.find((d) => d.id === seeded.documents.roadmap);
    expect(shared).toBeTruthy();
    expect(shared.access).toBe('editor');
    expect(shared.owner.email).toBe('alice@demo.com');
  });

  it('shows Carol the roadmap as a viewer', async () => {
    const res = await auth(api().get('/api/documents'), tokens.carol);
    const shared = res.body.shared.find((d) => d.id === seeded.documents.roadmap);
    expect(shared.access).toBe('viewer');
  });
});

describe('access control on editing', () => {
  it('lets an editor (Bob) update shared content', async () => {
    const res = await auth(
      api().patch(`/api/documents/${seeded.documents.roadmap}`),
      tokens.bob
    ).send({ content: '<p>Bob edited this.</p>' });
    expect(res.status).toBe(200);
    expect(res.body.document.content).toContain('Bob edited this.');
  });

  it('forbids a viewer (Carol) from editing', async () => {
    const res = await auth(
      api().patch(`/api/documents/${seeded.documents.roadmap}`),
      tokens.carol
    ).send({ content: '<p>Carol should not be able to write this.</p>' });
    expect(res.status).toBe(403);
  });

  it('forbids a viewer from deleting, and a non-owner editor too', async () => {
    const carolDel = await auth(api().delete(`/api/documents/${seeded.documents.roadmap}`), tokens.carol);
    expect(carolDel.status).toBe(403);
    const bobDel = await auth(api().delete(`/api/documents/${seeded.documents.roadmap}`), tokens.bob);
    expect(bobDel.status).toBe(403); // editor != owner
  });

  it('sanitizes malicious HTML on save', async () => {
    const res = await auth(api().patch(`/api/documents/${seeded.documents.roadmap}`), tokens.alice).send({
      content: '<p>ok</p><script>alert(1)</script><img src=x onerror=alert(1)>',
    });
    expect(res.status).toBe(200);
    expect(res.body.document.content).not.toContain('<script>');
    expect(res.body.document.content).not.toContain('onerror');
  });
});

describe('full sharing lifecycle', () => {
  let docId;

  it('Alice creates a document', async () => {
    const res = await auth(api().post('/api/documents'), tokens.alice).send({ title: 'Shared plan' });
    expect(res.status).toBe(201);
    docId = res.body.document.id;
  });

  it('Bob cannot see it before it is shared', async () => {
    const res = await auth(api().get(`/api/documents/${docId}`), tokens.bob);
    expect(res.status).toBe(404);
  });

  it('sharing with an unknown email returns 404', async () => {
    const res = await auth(api().post(`/api/documents/${docId}/shares`), tokens.alice).send({
      email: 'ghost@demo.com',
      role: 'viewer',
    });
    expect(res.status).toBe(404);
  });

  it('Alice shares it with Bob as a viewer', async () => {
    const res = await auth(api().post(`/api/documents/${docId}/shares`), tokens.alice).send({
      email: 'bob@demo.com',
      role: 'viewer',
    });
    expect(res.status).toBe(201);
    expect(res.body.share.role).toBe('viewer');
  });

  it('Bob can now view but not edit', async () => {
    const view = await auth(api().get(`/api/documents/${docId}`), tokens.bob);
    expect(view.status).toBe(200);
    const edit = await auth(api().patch(`/api/documents/${docId}`), tokens.bob).send({ title: 'Hijack' });
    expect(edit.status).toBe(403);
  });

  it('Alice upgrades Bob to editor, then Bob can edit', async () => {
    await auth(api().post(`/api/documents/${docId}/shares`), tokens.alice).send({
      email: 'bob@demo.com',
      role: 'editor',
    });
    const edit = await auth(api().patch(`/api/documents/${docId}`), tokens.bob).send({ title: 'Co-authored' });
    expect(edit.status).toBe(200);
    expect(edit.body.document.title).toBe('Co-authored');
  });

  it('Alice revokes access and Bob loses it', async () => {
    const del = await auth(
      api().delete(`/api/documents/${docId}/shares/${seeded.users['bob@demo.com'].id}`),
      tokens.alice
    );
    expect(del.status).toBe(204);
    const view = await auth(api().get(`/api/documents/${docId}`), tokens.bob);
    expect(view.status).toBe(404);
  });
});

describe('file import', () => {
  it('imports a Markdown file as a new document', async () => {
    const md = '# Imported Heading\n\nSome **bold** text.\n\n- one\n- two\n';
    const res = await auth(api().post('/api/documents/import'), tokens.alice).attach(
      'file',
      Buffer.from(md),
      'meeting-notes.md'
    );
    expect(res.status).toBe(201);
    expect(res.body.document.title).toBe('meeting-notes');
    expect(res.body.document.content).toContain('<h1>Imported Heading</h1>');
    expect(res.body.document.content).toContain('<strong>bold</strong>');
  });

  it('rejects an unsupported file type', async () => {
    const res = await auth(api().post('/api/documents/import'), tokens.alice).attach(
      'file',
      Buffer.from('binary'),
      'photo.png'
    );
    expect(res.status).toBe(400);
  });
});
