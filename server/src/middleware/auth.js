import { verifyToken } from '../utils/tokens.js';
import { unauthorized } from '../utils/errors.js';

/**
 * Requires a valid `Authorization: Bearer <jwt>` header. On success, attaches
 * `req.user = { id, email, name }` for downstream handlers.
 */
export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(unauthorized('Missing or malformed Authorization header'));
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email, name: payload.name };
    return next();
  } catch {
    return next(unauthorized('Invalid or expired token'));
  }
}

export default requireAuth;
