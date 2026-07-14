// Vercel serverless entry. A single function at /api handles every API route;
// vercel.json rewrites "/api/(.*)" -> "/api" so requests of ANY depth
// (e.g. /api/auth/login) reach this function. Vercel preserves the original
// request URL, so Express routes on the real path (/api/auth/login).
//
// The defensive prefix restore below covers the case where a rewrite strips the
// "/api" prefix, so Express always sees the "/api/..."-mounted path.
import { createApp } from '../server/src/app.js';

const app = globalThis.__ajaiaDocsApp ?? (globalThis.__ajaiaDocsApp = createApp());

export default function handler(req, res) {
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : `/${req.url}`);
  }
  return app(req, res);
}
