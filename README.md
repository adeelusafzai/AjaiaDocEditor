# Ajaia Docs

A lightweight collaborative document editor inspired by Google Docs — built on the **PERN** stack
(PostgreSQL · Express · React · Node). Create and edit rich-text documents in the browser, import
`.txt` / `.md` / `.docx` files as new documents, and share documents with other users as **viewers**
or **editors**.

> Built as a timeboxed product slice. See [ARCHITECTURE.md](./ARCHITECTURE.md) for what was
> prioritized and cut, and [AI-WORKFLOW.md](./AI-WORKFLOW.md) for how AI tooling was used.

---

## Features

- **Documents** — create, rename (inline), edit, autosave, reopen. Content survives refresh.
- **Rich text** — bold, italic, underline, strikethrough, H1–H3, bulleted/numbered lists, blockquote,
  code block, undo/redo. Powered by [TipTap](https://tiptap.dev) (ProseMirror).
- **File import** — upload a `.txt`, `.md`/`.markdown`, or `.docx` file and it becomes a new editable
  document (Markdown and DOCX are converted to formatted HTML). *Legacy `.doc` is not supported; 5 MB max.*
- **Sharing** — a document has one **owner**; the owner can grant other users **viewer** (read-only) or
  **editor** access by email, change roles, and revoke. The dashboard visibly separates
  **My documents** from **Shared with me**, each tagged with your access level.
- **Auth** — lightweight JWT email/password login, plus optional self-signup. Three seeded demo
  accounts make the sharing flow reviewable in seconds.
- **Quality** — server-side validation (zod), central error handling, HTML sanitization on every write
  (stored documents can't carry XSS to other users), and an automated test suite.

---

## Tech stack

| Layer      | Choice                                                        |
| ---------- | ------------------------------------------------------------- |
| Frontend   | React 18 + Vite, React Router, TipTap editor                  |
| Backend    | Node 20+ / Express (ESM)                                      |
| Database   | PostgreSQL 16 (via `pg`)                                      |
| Auth       | JWT (`jsonwebtoken`) + `bcryptjs`                             |
| Uploads    | `multer` (memory) + `mammoth` (docx) + `marked` (md)          |
| Validation | `zod` · sanitization via `sanitize-html`                      |
| Tests      | Vitest + Supertest (integration against a real Postgres)      |

Repo is an npm-workspaces monorepo: [`server/`](./server) (API) and [`web/`](./web) (React app).

---

## Prerequisites

- **Node.js 20+** and npm 10+
- **Docker Desktop** (used only to run local Postgres via `docker compose`).
  Prefer your own Postgres? Skip Docker and set `DATABASE_URL` in `server/.env` instead.

---

## Quick start (local)

```bash
# 1. Install all workspace dependencies (from the repo root)
npm install

# 2. Start Postgres (Docker). Exposes it on host port 5433.
npm run db:up

# 3. Configure env (defaults already match docker-compose, so this is optional)
cp server/.env.example server/.env
cp web/.env.example web/.env

# 4. Create the schema and seed demo users + documents
npm --workspace server run db:setup
npm --workspace server run db:seed

# 5. Run the API (:4000) and the web app (:5173) together
npm run dev
```

Open **http://localhost:5173** and sign in with a demo account below.

> **One-liner after step 1:** `npm run db:up && npm --workspace server run db:setup && npm --workspace server run db:seed && npm run dev`

### Seeded demo accounts

All three share the password **`password123`**:

| Email            | Role in demo data                                   |
| ---------------- | --------------------------------------------------- |
| `alice@demo.com` | Owns 2 documents; shares "Q3 Product Roadmap"       |
| `bob@demo.com`   | **Editor** on Alice's roadmap                       |
| `carol@demo.com` | **Viewer** on Alice's roadmap                       |

**To see sharing live:** sign in as Alice in one browser and Bob in an incognito window. Alice's
"Q3 Product Roadmap" appears under Bob's **Shared with me**; Bob (editor) can edit it, Carol (viewer)
cannot.

---

## Running the tests

The suite runs against a **dedicated `docs_test` database** (auto-created; it never touches your dev
data). Postgres must be running first.

```bash
npm run db:up          # if not already running
npm test               # -> server: vitest run  (20 integration tests)
```

The tests exercise auth, the owned/shared split, per-role edit/delete permissions, the full
share → upgrade → revoke lifecycle, HTML sanitization, and file import.

---

## Configuration reference

**`server/.env`** (see [`server/.env.example`](./server/.env.example))

| Var             | Default                                          | Notes                                              |
| --------------- | ------------------------------------------------ | -------------------------------------------------- |
| `PORT`          | `4000`                                           | API port                                           |
| `DATABASE_URL`  | `postgres://docs:docs@localhost:5433/docs`       | Matches `docker-compose.yml` (host port **5433**)  |
| `PGSSL`         | `false`                                          | Set `true` for managed Postgres (Render/Neon)      |
| `JWT_SECRET`    | dev fallback                                     | **Set a strong secret in production**              |
| `JWT_EXPIRES_IN`| `7d`                                             | Token lifetime                                     |
| `CORS_ORIGIN`   | `http://localhost:5173`                          | Comma-separated allowed web origins                |

**`web/.env`**

| Var            | Default                 | Notes                                            |
| -------------- | ----------------------- | ------------------------------------------------ |
| `VITE_API_URL` | `http://localhost:4000` | Base URL of the API (set to deployed API in prod)|

---

## Deployment

**Primary path: everything on [Vercel](https://vercel.com)** — the React SPA plus the Express API as a
serverless function ([`api/[...path].js`](./api/%5B...path%5D.js)), backed by hosted Postgres (Vercel
Postgres or [Neon](https://neon.tech) — free, no card). Web and API share one origin, so there's no
CORS and no `VITE_API_URL` to configure.

👉 **Full step-by-step guide: [DEPLOY-VERCEL.md](./DEPLOY-VERCEL.md)** (GitHub → import → add Postgres →
set `JWT_SECRET` → run `db:setup`/`db:seed` once → deploy).

<details>
<summary><b>Alternative: split deploy (API + DB on Render, web on Vercel)</b></summary>

- **Render** — `New + → Blueprint` with [`render.yaml`](./render.yaml) provisions Postgres + the API,
  runs schema + seed on build, and generates `JWT_SECRET`. Then set the API's `CORS_ORIGIN` to the web URL.
- **Vercel** — import the repo, set **Root Directory** to `web`, add `VITE_API_URL` = the Render API URL.
- A portable [`server/Dockerfile`](./server/Dockerfile) is also included for Fly.io / any container host.
</details>

---

## Project layout

```
ajaia-docs/
├─ docker-compose.yml        # local Postgres
├─ vercel.json               # full-stack Vercel config (build web + api function)
├─ render.yaml               # alt: Render blueprint (API + DB)
├─ api/
│  └─ [...path].js           # Vercel serverless entry → forwards to the Express app
├─ server/                   # Express API (ESM)
│  ├─ src/
│  │  ├─ app.js index.js     # app factory + entrypoint
│  │  ├─ config.js
│  │  ├─ db/                 # pool, schema.sql, setup, seed
│  │  ├─ middleware/         # requireAuth, error handler
│  │  ├─ routes/             # auth, documents (CRUD + import + shares)
│  │  ├─ services/           # access resolution, file import
│  │  └─ utils/              # errors, validation, sanitize, tokens
│  └─ tests/                 # vitest + supertest integration suite
└─ web/                      # React + Vite SPA
   └─ src/
      ├─ api/client.js       # fetch wrapper + token store
      ├─ auth/AuthContext.jsx
      ├─ components/         # Editor, Toolbar, ShareModal, TopBar
      └─ pages/              # Login, Dashboard, DocumentPage
```

## API overview

| Method | Path                                  | Access        |
| ------ | ------------------------------------- | ------------- |
| POST   | `/api/auth/register` · `/login`       | public        |
| GET    | `/api/auth/me`                        | authenticated |
| GET    | `/api/documents`                      | owned + shared|
| POST   | `/api/documents` · `/import`          | authenticated |
| GET    | `/api/documents/:id`                  | view access   |
| PATCH  | `/api/documents/:id`                  | edit access   |
| DELETE | `/api/documents/:id`                  | owner only    |
| GET/POST/DELETE | `/api/documents/:id/shares[...]`| owner only    |

## Troubleshooting

- **API logs "Could not connect to the database"** — run `npm run db:up` and re-run. Confirm nothing
  else uses host port 5433 (change the mapping in `docker-compose.yml` + `DATABASE_URL` if so).
- **`npm test` fails to connect** — Postgres must be up (`npm run db:up`); the test DB is created
  automatically.
- **CORS error in the browser** — ensure `CORS_ORIGIN` (API) includes the web origin and
  `VITE_API_URL` (web) points at the API.

## Security note

The only outstanding `npm audit` findings are in the **dev-only** Vite/Vitest/esbuild toolchain (the
well-known esbuild dev-server advisory) and do not affect the production runtime or shipped bundles.
