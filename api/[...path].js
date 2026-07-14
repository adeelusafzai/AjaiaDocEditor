// Vercel serverless entry. This catch-all function receives every request to
// /api/* (Vercel preserves the original URL, e.g. "/api/documents"), and hands
// it to the same Express app we run locally — so there is one source of truth
// for routing, auth, validation, and error handling.
//
// The app is cached on globalThis so warm invocations reuse a single instance.
import { createApp } from '../server/src/app.js';

const app = globalThis.__ajaiaDocsApp ?? (globalThis.__ajaiaDocsApp = createApp());

export default function handler(req, res) {
  return app(req, res);
}
