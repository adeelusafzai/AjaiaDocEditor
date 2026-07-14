import { HttpError } from '../utils/errors.js';
import config from '../config.js';

/** 404 fallthrough for unknown routes. */
export function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Route not found' });
}

/** Central error handler. Converts thrown errors into JSON responses. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  // Multer file-size / upload errors.
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File is too large (max 5 MB)' });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }

  // Unexpected error: log it, but never leak internals to the client.
  if (!config.isTest) {
    console.error('Unhandled error:', err);
  }
  return res.status(500).json({ error: 'Internal server error' });
}
