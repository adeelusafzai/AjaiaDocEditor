# Architecture Note

A short account of **what I built, what I prioritized, and what I deliberately cut** for this
timeboxed assignment.

## The one-paragraph summary

Ajaia Docs is a PERN app in an npm-workspaces monorepo. A stateless Express API owns all data access
to a PostgreSQL database; a React/Vite SPA talks to it over a small JSON API with a JWT bearer token.
Documents are stored as **sanitized HTML** — the same representation the TipTap editor emits and that
file importers (Markdown/DOCX) produce — which keeps the create → edit → import → share pipeline in a
single format end to end. Access control is centralized in one SQL query that resolves a user's
relationship to a document to exactly one of `owner | editor | viewer | none`.

## What I prioritized (and why)

The prompt rewards **depth in a few areas over shallow coverage everywhere**. I invested in the three
things a "collaborative editor" lives or dies on:

1. **A coherent editing experience.** TipTap over a hand-rolled `contentEditable` because rich text is
   a tar pit — TipTap gives real bold/italic/underline/headings/lists with correct selection handling
   for near-zero cost, leaving my time for product logic. Inline rename and debounced **autosave** (no
   "Save" button) make the flow feel like a real doc tool. Save status is always visible.
2. **Sharing + access control that actually enforces.** This is the part most likely to be faked. The
   owned/shared split is real, roles (viewer/editor) are enforced on **every** mutating endpoint, and
   the share → change-role → revoke lifecycle round-trips. Permissions are resolved server-side, never
   trusted from the client.
3. **Verifiable correctness.** 20 integration tests (Supertest against a real Postgres) plus a live
   HTTP smoke script cover the permission matrix, sanitization, and import — the places bugs hide.

## Key decisions & tradeoffs

| Decision | Why | Tradeoff I accepted |
| --- | --- | --- |
| **Store content as HTML** (not ProseMirror JSON or Delta) | One format for editor output, DOCX/MD import, and rendering; trivial persistence | Slightly less structured than JSON for future features like granular comments |
| **Sanitize on write** (allow-list) | A shared doc is attacker-controlled input rendered in someone else's browser; sanitizing server-side closes stored-XSS regardless of client | Small CPU cost per save; a strict tag allow-list |
| **JWT + seeded users** | Multi-user sharing needs real identities, but full session infra would eat the timebox | No refresh tokens / logout revocation; a stolen token is valid until expiry |
| **Single access-resolution query** | One `LEFT JOIN` returns the document *and* the caller's role; avoids scattered permission checks drifting apart | All access goes through one helper — a deliberate single source of truth |
| **Autosave via full-document PATCH** | Simple, robust, and correct for a single-writer-at-a-time model | Not operational-transform; concurrent editors would last-write-wins (see cuts) |
| **Docker Postgres locally** | Reviewers get a real Postgres with one command, no accounts, no engine divergence | Requires Docker installed locally |
| **UUID document ids, serial user ids** | Doc ids appear in shareable URLs (unguessable); users stay simple | — |

## Data model

Three tables (`server/src/db/schema.sql`):

- **`users`** — `id`, `email` (unique), `name`, `password_hash`.
- **`documents`** — `id` (uuid), `owner_id → users`, `title`, `content` (sanitized HTML), timestamps.
- **`document_shares`** — `(document_id, user_id)` unique, `role ∈ {viewer, editor}`. One row per grant.

Access level derivation (the heart of authz):

```sql
CASE WHEN d.owner_id = :me THEN 'owner' ELSE s.role END  -- s is the LEFT JOINed share row; NULL ⇒ no access
```

## Request flow

```
Browser (React SPA)
  └─ fetch + Bearer JWT ─▶ Express
       ├─ requireAuth            (verify token → req.user)
       ├─ zod validation         (400 on bad input)
       ├─ getDocumentAccess()    (owner|editor|viewer|null → 404/403)
       ├─ sanitizeDocumentHtml() (on every content write)
       └─ pg pool ─▶ PostgreSQL
```

Errors flow through a single `HttpError` + central handler, so clients always get
`{ error, details? }` and internals never leak.

## What I intentionally deprioritized

- **Real-time multi-user editing / CRDTs.** The prompt explicitly frames this as a stretch. The model
  is single-writer-with-autosave; two simultaneous editors would last-write-wins. Real-time presence
  and OT/CRDT (Yjs) is the first thing I'd add next.
- **Attachment storage.** I implemented file *import* (file → new document), which is the more
  product-relevant of the suggested upload behaviors, rather than opaque attachments.
- **Full account management** — email verification, password reset, refresh-token rotation, logout
  revocation. Auth is intentionally lightweight.
- **Pagination / search / folders.** Fine for the demo's data volume; a `LIMIT/OFFSET` and full-text
  index are the obvious next step.
- **Deep DOCX fidelity.** `mammoth` covers headings/lists/emphasis well; complex tables/images are out
  of scope.

## What I'd build next with another 2–4 hours

1. **Real-time collaboration** — Yjs + a WebSocket provider for live cursors and conflict-free edits.
2. **Version history** — an append-only `document_versions` table + a restore UI (schema already
   timestamped for this).
3. **Export** to Markdown / PDF (inverse of the import pipeline).
4. **Share-by-link** and a hardened auth story (refresh tokens, rate limiting on `/login`).

## Testing & verification strategy

- **Integration tests** (`server/tests/api.test.js`) drive the real Express app via Supertest against a
  throwaway `docs_test` database — they assert the actual HTTP contract and the full permission matrix,
  not mocks.
- **Live smoke test** — a script hitting the running server confirmed all 22 flows (auth, listing,
  create, cross-user edit/delete permissions, share lifecycle, sanitization, cleanup) end to end.
- **Build gate** — `vite build` transforms all modules cleanly; the API fails fast with a clear message
  if the database is unreachable.
