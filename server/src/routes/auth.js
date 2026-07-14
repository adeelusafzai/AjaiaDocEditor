import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { asyncHandler, unauthorized, conflict } from '../utils/errors.js';
import { validate, loginSchema } from '../utils/validation.js';
import { signToken } from '../utils/tokens.js';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name });

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  name: z.string().trim().min(1, 'Name is required').max(120),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// POST /api/auth/register — optional lightweight signup.
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { email, name, password } = validate(registerSchema, req.body);
    const passwordHash = await bcrypt.hash(password, 10);

    let rows;
    try {
      ({ rows } = await pool.query(
        `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)
         RETURNING id, email, name`,
        [email, name, passwordHash]
      ));
    } catch (err) {
      if (err.code === '23505') throw conflict('An account with that email already exists');
      throw err;
    }

    const user = rows[0];
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  })
);

// POST /api/auth/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = validate(loginSchema, req.body);

    const { rows } = await pool.query(
      `SELECT id, email, name, password_hash FROM users WHERE email = $1`,
      [email]
    );
    const user = rows[0];

    // Same error whether the email is unknown or the password is wrong.
    const ok = user && (await bcrypt.compare(password, user.password_hash));
    if (!ok) throw unauthorized('Invalid email or password');

    res.json({ token: signToken(user), user: publicUser(user) });
  })
);

// GET /api/auth/me
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(`SELECT id, email, name FROM users WHERE id = $1`, [
      req.user.id,
    ]);
    if (!rows[0]) throw unauthorized('Account no longer exists');
    res.json({ user: rows[0] });
  })
);

export default router;
