# Submission — Ajaia Docs

A lightweight collaborative document editor (PERN stack). This file lists exactly what is included and
the current status of each requirement.

## Links

> Fill these in after deploying (see [README → Deployment](./README.md#deployment)).

- **Live product URL:** `______________________________`  *(Vercel web app)*
- **API URL:** `______________________________`  *(Render)*
- **Walkthrough video (3–5 min):** see [`VIDEO.txt`](./VIDEO.txt)
- **Source code:** this repository / Drive folder

## Review credentials (seeded)

Password for all three: **`password123`**

| Email            | Use it to see…                              |
| ---------------- | ------------------------------------------- |
| `alice@demo.com` | Owner — owns docs, shares the roadmap        |
| `bob@demo.com`   | **Editor** on Alice's shared roadmap         |
| `carol@demo.com` | **Viewer** (read-only) on the same roadmap   |

Open Alice and Bob in two browsers to watch sharing work live. You can also self-register a new account.

## What's included

| Item | Location |
| --- | --- |
| Source code (monorepo) | [`server/`](./server), [`web/`](./web) |
| Local setup & run instructions | [`README.md`](./README.md) |
| Architecture note | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| AI workflow note | [`AI-WORKFLOW.md`](./AI-WORKFLOW.md) |
| This file | [`SUBMISSION.md`](./SUBMISSION.md) |
| Walkthrough video link | [`VIDEO.txt`](./VIDEO.txt) |
| Local Postgres | [`docker-compose.yml`](./docker-compose.yml) |
| Deployment (Vercel full-stack) | [`vercel.json`](./vercel.json), [`api/[...path].js`](./api/%5B...path%5D.js), [`DEPLOY-VERCEL.md`](./DEPLOY-VERCEL.md) |
| Deployment (alt: Render) | [`render.yaml`](./render.yaml), [`server/Dockerfile`](./server/Dockerfile) |
| Automated tests | [`server/tests/`](./server/tests) |

## Requirement checklist

| Requirement | Status | Notes |
| --- | --- | --- |
| Create / rename / edit / save / reopen documents | ✅ | Inline rename, debounced autosave, survives refresh |
| Rich text (bold, italic, underline, headings, lists) | ✅ | + strikethrough, blockquote, code block, undo/redo (TipTap) |
| File upload | ✅ | Import `.txt` / `.md` / `.docx` → new editable document |
| Sharing (owner, grant access, owned vs shared) | ✅ | Viewer/editor roles; change + revoke; enforced server-side |
| Persistence | ✅ | PostgreSQL; formatting preserved as sanitized HTML |
| Setup & run instructions | ✅ | README, one-liner start, `.env.example`s |
| Deployment | ⚙️ | Full-stack **Vercel** config ready (`vercel.json` + serverless API + hosted Postgres); URL to be filled after deploy — see [DEPLOY-VERCEL.md](./DEPLOY-VERCEL.md) |
| Validation & error handling | ✅ | zod + central error handler + HTML sanitization |
| At least one meaningful automated test | ✅ | 20 integration tests (Vitest + Supertest) — all passing |
| Architecture note | ✅ | `ARCHITECTURE.md` |
| AI workflow note | ✅ | `AI-WORKFLOW.md` |
| Walkthrough video | ⬜ | To record; link goes in `VIDEO.txt` |

## What's working / incomplete / next

**Working end to end (verified by tests + a live smoke run):**
- Auth (login, self-register, JWT-protected routes)
- Document CRUD, autosave, rich-text formatting, reopen after refresh
- File import (txt / md / docx) into new documents
- Sharing with viewer/editor roles; owned-vs-shared dashboard split; role change & revoke
- Server-side validation, error handling, and HTML sanitization

**Intentionally deprioritized (documented in ARCHITECTURE.md):**
- Real-time multi-user editing / live cursors (single-writer autosave for now)
- Version history, export to PDF/Markdown, share-by-link
- Full account management (password reset, refresh tokens)

**With another 2–4 hours:** real-time collaboration (Yjs + WebSocket), then version history and export.

## Stretch items included

- **Role-based sharing** beyond basic access (viewer vs editor, enforced on every endpoint).
- **Stored-XSS protection** via server-side sanitization on every write.
