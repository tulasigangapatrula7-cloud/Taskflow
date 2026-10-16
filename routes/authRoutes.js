const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const wrap = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/authMiddleware');
const { normalizeEmail, EMAIL_RE, validateRegister, validateChangePassword } = require('../utils/validation');

const router = express.Router();
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 12);
const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

const cookieOpts = () => ({ httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: WEEK_MS, path: '/' });
function issueCookie(res, user) {
  const token = jwt.sign({ sub: user.id, tv: user.token_version }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, cookieOpts());
}
const publicUser = (u) => ({ id: u.id, fullName: u.full_name, email: u.email });

router.post('/register', wrap(async (req, res) => {
  const errors = validateRegister(req.body);
  if (!req.body || req.body.acceptTerms !== true) errors.acceptTerms = 'You must accept the terms.';
  if (Object.keys(errors).length) return res.status(400).json({ success: false, message: 'Please fix the highlighted fields.', errors });
  const email = normalizeEmail(req.body.email);
  const dup = () => res.status(409).json({ success: false, message: 'An account with this email already exists.', errors: { email: 'Email already registered.' } });
  if (await db.get('SELECT 1 AS x FROM users WHERE email = ?', [email])) return dup();
  const hash = await bcrypt.hash(req.body.password, 12);
  let r;
  try {
    r = await db.run('INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)', [req.body.fullName.trim(), email, hash]);
  } catch (e) {
    if (/UNIQUE/i.test(e.message)) return dup();
    throw e;
  }
  const user = await db.get('SELECT * FROM users WHERE id = ?', [r.lastId]);
  issueCookie(res, user);
  res.status(201).json({ success: true, message: 'Account created.', user: publicUser(user) });
}));

router.post('/login', wrap(async (req, res) => {
  const email = normalizeEmail(req.body && req.body.email);
  const password = String((req.body && req.body.password) || '');
  const fail = () => res.status(401).json({ success: false, message: 'Invalid email or password.' });
  if (!EMAIL_RE.test(email) || !password || password.length > 72) return fail();
  const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) return fail();
  issueCookie(res, user);
  res.json({ success: true, message: 'Logged in.', user: publicUser(user) });
}));

router.post('/logout', requireAuth, wrap(async (req, res) => {
  await db.run('UPDATE users SET token_version = token_version + 1 WHERE id = ?', [req.user.id]);
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
  res.json({ success: true, message: 'Logged out.' });
}));

router.get('/me', requireAuth, (req, res) => res.json({ success: true, user: req.user }));

router.post('/change-password', requireAuth, wrap(async (req, res) => {
  const errors = validateChangePassword(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ success: false, message: 'Please fix the highlighted fields.', errors });
  const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!(await bcrypt.compare(req.body.currentPassword, user.password_hash))) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect.', errors: { currentPassword: 'Incorrect password.' } });
  }
  const hash = await bcrypt.hash(req.body.newPassword, 12);
  await db.run(`UPDATE users SET password_hash = ?, token_version = token_version + 1, updated_at = ${NOW} WHERE id = ?`, [hash, user.id]);
  issueCookie(res, await db.get('SELECT * FROM users WHERE id = ?', [user.id]));
  res.json({ success: true, message: 'Password updated.' });
}));

module.exports = router;
