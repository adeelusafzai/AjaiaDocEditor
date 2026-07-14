import { pool } from '../db/pool.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

/**
 * Resolves a user's access to a document in a single query.
 *
 * @returns {Promise<{ document: object|null, access: 'owner'|'editor'|'viewer'|null }>}
 *   - document is null when the id doesn't exist (or isn't a valid uuid).
 *   - access is null when the document exists but the user has no grant.
 */
export async function getDocumentAccess(documentId, userId, db = pool) {
  if (!isUuid(documentId)) return { document: null, access: null };

  const { rows } = await db.query(
    `SELECT d.*,
            CASE WHEN d.owner_id = $2 THEN 'owner' ELSE s.role END AS access
       FROM documents d
       LEFT JOIN document_shares s
         ON s.document_id = d.id AND s.user_id = $2
      WHERE d.id = $1`,
    [documentId, userId]
  );

  if (rows.length === 0) return { document: null, access: null };
  const { access, ...document } = rows[0];
  return { document, access: access ?? null };
}

export const canEdit = (access) => access === 'owner' || access === 'editor';
export const canView = (access) => access === 'owner' || access === 'editor' || access === 'viewer';
export const isOwner = (access) => access === 'owner';
