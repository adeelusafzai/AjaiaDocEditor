# AI-Native Workflow Note

This project was built with AI assistance, directed by an experienced PERN developer. The goal was to
use AI to move faster on the mechanical parts while keeping human judgment on scope, architecture, and
correctness. This note is honest about where AI helped, where its output was changed or rejected, and
how everything was verified.

## Tools used

- **Claude Code (Claude Opus)** — the primary driver: scaffolding the monorepo, writing route handlers,
  the React components, tests, and docs; running the toolchain (Docker, npm, the test suite) and
  reacting to failures.
- **TipTap / Mammoth / Marked docs** — consulted for exact extension and conversion APIs rather than
  trusting recalled signatures.

## Where AI materially sped up the work

- **Boilerplate & wiring.** The Express app factory, `pg` pool, JWT middleware, zod schemas, the fetch
  client, the auth context, and the CSS design system were generated quickly and needed only light
  edits. This is the highest-leverage, lowest-risk use of AI.
- **The rich-text toolbar.** Wiring TipTap commands (bold/italic/underline/headings/lists/undo) and
  keeping button active-states in sync with the selection is fiddly, repetitive UI code — a good fit
  for generation, then verified by building.
- **Test breadth.** AI drafted a broad integration suite covering the permission matrix (owner vs
  editor vs viewer across view/edit/delete), which would have been tedious to enumerate by hand. I kept
  all of it after review because each case maps to a real authorization rule.
- **Docs & deployment config.** README, this note, the Render blueprint, and Vercel config were drafted
  by AI and edited for accuracy.

## What I changed or rejected

- **Persistence format.** An early instinct was to store ProseMirror JSON. I **rejected** that in favor
  of sanitized **HTML** so the editor, DOCX/MD import, and rendering all share one format — a
  product-architecture call AI shouldn't make unilaterally.
- **Security hardening AI didn't propose.** I added **server-side HTML sanitization on every write**.
  Without it, a shared document is stored attacker input rendered in another user's browser — a
  stored-XSS hole. This was a human-driven requirement; a test now asserts `<script>`/`onerror` are
  stripped.
- **Dependency risk.** The first draft pulled in `multer@1.x`, which npm flagged as vulnerable. I
  **upgraded to `multer@2.x`** and re-audited, confirming the only remaining advisories are dev-only
  (Vite/esbuild), not runtime.
- **Brittle generated code.** The initial "is this module the entrypoint?" check compared raw paths and
  was **wrong on Windows**; I replaced it with a `realpathSync`-based comparison. The test bootstrap
  also initially truncated tables before the schema existed — I reordered it to apply schema first.
- **Scope discipline.** AI is happy to keep adding features. I explicitly **cut** real-time collab,
  attachments, and full account management to protect depth in editing + sharing, and documented those
  cuts in [ARCHITECTURE.md](./ARCHITECTURE.md).

## How I verified correctness, UX, and reliability

I did **not** treat generated code as correct by default. Verification was layered:

1. **Real integration tests** — 20 Vitest/Supertest cases run against an actual Postgres (a throwaway
   `docs_test` DB), asserting the HTTP contract and every permission rule. All pass.
2. **Live end-to-end smoke test** — a script driving the running API confirmed 22 flows (login, bad
   password → 401, owned/shared split, unshared → 404, editor can edit, viewer → 403, non-owner delete
   → 403, share→upgrade→revoke, sanitization, cleanup). All green.
3. **Build gate** — `vite build` compiles all 149 modules with no errors; the dev server serves and
   transforms components; the API fails fast with a clear message when the DB is down.
4. **Manual UX review** — inline rename, autosave with a visible status indicator, the demo-account
   quick-fill on login, and the owner-only Share button were shaped by hand for a coherent flow.

## Takeaway

AI compressed the *typing* — scaffolding, wiring, test enumeration, docs — from hours to minutes. The
decisions that determine whether this is a good product (data format, authorization design,
sanitization, dependency safety, and what to cut) stayed with me, and each was backed by a test or a
manual check rather than trust.
