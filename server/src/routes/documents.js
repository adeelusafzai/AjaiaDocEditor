import { Router } from 'express';
import multer from 'multer';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, notFound, forbidden, badRequest, conflict } from '../utils/errors.js';
import {
  validate,
  createDocumentSchema,
  updateDocumentSchema,
  shareSchema,
} from '../utils/validation.js';
import { sanitizeDocumentHtml } from '../utils/sanitize.js';
import { getDocumentAccess, canEdit, isOwner } from '../services/access.js';
import { importFileToDocument } from '../services/importFile.js';

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// ---------- serializers ----------
const listItem = (row) => ({
  id: row.id,
  title: row.title,
  access: row.access,
  updatedAt: row.updated_at,
  createdAt: row.created_at,
  owner: { id: row.owner_id, name: row.owner_name, email: row.owner_email },
});

const fullDocument = (doc, access) => ({
  id: doc.id,
  title: doc.title,
  content: doc.content,
  access,
  ownerId: doc.owner_id,
  updatedAt: doc.updated_at,
  createdAt: doc.created_at,
});

/** Loads a document + the caller's access, or throws 404/403. */
async function requireDocumentAccess(documentId, userId, { edit = false, owner = false } = {}) {
  const { document, access } = await getDocumentAccess(documentId, userId);
  if (!document || !access) throw notFound('Document not found');
  if (owner && !isOwner(access)) throw forbidden('Only the owner can perform this action');
  if (edit && !canEdit(access)) throw forbidden('You have view-only access to this document');
  return { document, access };
}

// ---------- documents ----------

// GET /api/documents — everything the user owns or has been given access to.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT d.id, d.title, d.updated_at, d.created_at,
              u.id AS owner_id, u.name AS owner_name, u.email AS owner_email,
              CASE WHEN d.owner_id = $1 THEN 'owner' ELSE s.role END AS access
         FROM documents d
         JOIN users u ON u.id = d.owner_id
         LEFT JOIN document_shares s ON s.document_id = d.id AND s.user_id = $1
        WHERE d.owner_id = $1 OR s.user_id = $1
        ORDER BY d.updated_at DESC`,
      [req.user.id]
    );

    const docs = rows.map(listItem);
    res.json({
      owned: docs.filter((d) => d.access === 'owner'),
      shared: docs.filter((d) => d.access !== 'owner'),
    });
  })
);

// POST /api/documents — create a blank (or pre-filled) document.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { title, content } = validate(createDocumentSchema, req.body);
    const { rows } = await pool.query(
      `INSERT INTO documents (owner_id, title, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.id, title?.trim() || 'Untitled document', sanitizeDocumentHtml(content || '')]
    );
    res.status(201).json({ document: fullDocument(rows[0], 'owner') });
  })
);

// POST /api/documents/import — turn an uploaded file into a new document.
router.post(
  '/import',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('Attach a file in the "file" field');
    const { title, content } = await importFileToDocument(req.file);
    const { rows } = await pool.query(
      `INSERT INTO documents (owner_id, title, content) VALUES ($1, $2, $3) RETURNING *`,
      [req.user.id, title, content]
    );
    res.status(201).json({ document: fullDocument(rows[0], 'owner') });
  })
);

// GET /api/documents/:id — full document (view access required).
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { document, access } = await requireDocumentAccess(req.params.id, req.user.id);
    res.json({ document: fullDocument(document, access) });
  })
);

// PATCH /api/documents/:id — rename and/or edit content (edit access required).
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const payload = validate(updateDocumentSchema, req.body);
    await requireDocumentAccess(req.params.id, req.user.id, { edit: true });

    const sets = [];
    const params = [];
    if (payload.title !== undefined) {
      params.push(payload.title.trim());
      sets.push(`title = $${params.length}`);
    }
    if (payload.content !== undefined) {
      params.push(sanitizeDocumentHtml(payload.content));
      sets.push(`content = $${params.length}`);
    }
    params.push(req.params.id);

    const { rows } = await pool.query(
      `UPDATE documents SET ${sets.join(', ')}, updated_at = now()
        WHERE id = $${params.length}
        RETURNING *`,
      params
    );
    // Re-resolve access for the response (it can't change here).
    const { access } = await getDocumentAccess(req.params.id, req.user.id);
    res.json({ document: fullDocument(rows[0], access) });
  })
);

// DELETE /api/documents/:id — owner only.
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await requireDocumentAccess(req.params.id, req.user.id, { owner: true });
    await pool.query(`DELETE FROM documents WHERE id = $1`, [req.params.id]);
    res.status(204).end();
  })
);

// ---------- sharing ----------

// GET /api/documents/:id/shares — who this document is shared with (owner only).
router.get(
  '/:id/shares',
  asyncHandler(async (req, res) => {
    await requireDocumentAccess(req.params.id, req.user.id, { owner: true });
    const { rows } = await pool.query(
      `SELECT s.user_id, s.role, s.created_at, u.name, u.email
         FROM document_shares s
         JOIN users u ON u.id = s.user_id
        WHERE s.document_id = $1
        ORDER BY u.name`,
      [req.params.id]
    );
    res.json({
      shares: rows.map((r) => ({
        userId: r.user_id,
        name: r.name,
        email: r.email,
        role: r.role,
        createdAt: r.created_at,
      })),
    });
  })
);

// POST /api/documents/:id/shares — grant/update access by email (owner only).
router.post(
  '/:id/shares',
  asyncHandler(async (req, res) => {
    const { email, role } = validate(shareSchema, req.body);
    const { document } = await requireDocumentAccess(req.params.id, req.user.id, { owner: true });

    const { rows: userRows } = await pool.query(
      `SELECT id, name, email FROM users WHERE email = $1`,
      [email]
    );
    const target = userRows[0];
    if (!target) throw notFound(`No user found with email "${email}"`);
    if (target.id === document.owner_id) throw conflict('You already own this document');

    const { rows } = await pool.query(
      `INSERT INTO document_shares (document_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (document_id, user_id) DO UPDATE SET role = EXCLUDED.role
       RETURNING user_id, role, created_at`,
      [req.params.id, target.id, role]
    );

    res.status(201).json({
      share: {
        userId: target.id,
        name: target.name,
        email: target.email,
        role: rows[0].role,
        createdAt: rows[0].created_at,
      },
    });
  })
);

// DELETE /api/documents/:id/shares/:userId — revoke access (owner only).
router.delete(
  '/:id/shares/:userId',
  asyncHandler(async (req, res) => {
    await requireDocumentAccess(req.params.id, req.user.id, { owner: true });
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId)) throw badRequest('Invalid user id');
    await pool.query(`DELETE FROM document_shares WHERE document_id = $1 AND user_id = $2`, [
      req.params.id,
      userId,
    ]);
    res.status(204).end();
  })
);

export default router;
