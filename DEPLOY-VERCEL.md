# Deploying Ajaia Docs to Vercel (full-stack)

The whole app runs on **one Vercel project**:

- **Web** — the Vite React SPA is built to static files.
- **API** — the Express app runs as a serverless function via [`api/[...path].js`](./api/%5B...path%5D.js),
  which forwards every `/api/*` request to the same Express app used locally.
- **Database** — a hosted Postgres (Vercel Postgres or Neon; both have a free tier, no card required).

Because the web and API share one origin, the frontend calls `/api/...` directly — **no CORS, no
`VITE_API_URL` needed**.

---

## 1. Push to GitHub

```bash
git init
git add .
git commit -m "Ajaia Docs"
git branch -M main
git remote add origin https://github.com/<you>/ajaia-docs.git
git push -u origin main
```

## 2. Create the Vercel project

1. Vercel → **Add New… → Project** → import the repo.
2. **Root Directory:** leave as the repository root (`.`). Do **not** set it to `web`.
3. Framework preset: **Other** — the included [`vercel.json`](./vercel.json) already defines the build
   (`npm --workspace web run build` → `web/dist`) and the SPA rewrite. Vercel auto-detects the `api/`
   function.
4. Don't deploy yet — add the database and env vars first (below), or deploy once and redeploy after.

## 3. Add a Postgres database

**Option A — Vercel Postgres (simplest).** In the project: **Storage → Create Database → Postgres**,
then **Connect** it to the project. Vercel injects `POSTGRES_URL` (pooled) and
`POSTGRES_URL_NON_POOLING` (direct) automatically — the app reads `POSTGRES_URL` out of the box.

**Option B — Neon.** Create a project at [neon.tech](https://neon.tech), copy the **pooled** connection
string, and add it as an env var `DATABASE_URL` (see next step). Keep the **direct** (non-pooled) string
handy for the one-time schema step.

## 4. Set environment variables (Project → Settings → Environment Variables)

| Name          | Value                                                        | Needed when |
| ------------- | ------------------------------------------------------------ | ----------- |
| `JWT_SECRET`  | any long random string                                       | always      |
| `DATABASE_URL`| your **pooled** Postgres URL                                  | Option B (Neon). Skip for Option A — `POSTGRES_URL` is auto-set |
| `PGSSL`       | `true`                                                       | optional — the app auto-enables SSL for non-local hosts anyway |

> Do **not** set `VITE_API_URL` — the API is same-origin in this setup.

## 5. Initialize the schema + seed (one time)

Run this **locally**, pointed at the **direct/non-pooled** connection string (DDL prefers a direct
connection). Use `POSTGRES_URL_NON_POOLING` (Vercel) or the Neon direct URL.

**PowerShell (Windows):**
```powershell
$env:DATABASE_URL="<direct-postgres-url>"; $env:PGSSL="true"
npm --workspace server run db:setup
npm --workspace server run db:seed
```

**bash/zsh (macOS/Linux):**
```bash
DATABASE_URL="<direct-postgres-url>" PGSSL=true npm --workspace server run db:setup
DATABASE_URL="<direct-postgres-url>" PGSSL=true npm --workspace server run db:seed
```

This creates the tables and seeds the three demo accounts (`alice`/`bob`/`carol@demo.com`,
password `password123`) plus a shared document.

## 6. Deploy

Trigger a deploy (push to `main`, or **Deployments → Redeploy**). When it's live, open the Vercel URL
and sign in as `alice@demo.com` / `password123`.

---

## Deploy from the CLI instead (optional)

```bash
npm i -g vercel
vercel            # first run links/creates the project
# add env vars + database in the dashboard, run the step-5 seed, then:
vercel --prod
```

## Notes & limits

- **Cold starts:** the first request after idle may take ~1–2s while the function warms up. Normal for
  serverless.
- **File import size:** Vercel caps a serverless request body at ~4.5 MB, so imports are effectively
  limited to that (the app's own limit is 5 MB).
- **Connection pooling:** on Vercel the app uses a pool size of 1 per instance and relies on the
  provider's pooler (Vercel Postgres pooled URL / Neon pooled endpoint). Always use the **pooled** URL
  for `DATABASE_URL`/`POSTGRES_URL` at runtime; use the **direct** URL only for the step-5 migration.
- **Re-seeding:** `db:seed` is idempotent — safe to re-run against the same database.

## Alternative: split deployment (web on Vercel, API on Render)

Still supported. Set the Vercel project's **Root Directory** to `web`, deploy the API separately with
[`render.yaml`](./render.yaml), and set `VITE_API_URL` (web) + `CORS_ORIGIN` (API) to point at each
other. See [README → Deployment](./README.md#deployment).
