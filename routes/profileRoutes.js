const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const wrap = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/authMiddleware');
const { normalizeEmail, EMAIL_RE, nameError } = require('../utils/validation');

const router = express.Router();
router.use(requireAuth);

const SEL = 'SELECT id, full_name, email, created_at, updated_at FROM users WHERE id = ?';
const shape = (u) => ({ id: u.id, fullName: u.full_name, email: u.email, createdAt: u.created_at, updatedAt: u.updated_at });

router.get('/', wrap(async (req, res) => {
  res.json({ success: true, profile: shape(await db.get(SEL, [req.user.id])) });
}));

router.put('/', wrap(async (req, res) => {
  const errors = {};
  const ne = nameError(req.body && req.body.fullName);
  if (ne) errors.fullName = ne;
  const email = normalizeEmail(req.body && req.body.email);
  if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
  if (Object.keys(errors).length) return res.status(400).json({ success: false, message: 'Please fix the highlighted fields.', errors });
  const taken = () => res.status(409).json({ success: false, message: 'That email is already in use.', errors: { email: 'Email already in use.' } });
  if (await db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.user.id])) return taken();
  try {
    await db.run("UPDATE users SET full_name = ?, email = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?", [req.body.fullName.trim(), email, req.user.id]);
  } catch (e) { if (/UNIQUE/i.test(e.message)) return taken(); throw e; }
  res.json({ success: true, message: 'Profile updated.', profile: shape(await db.get(SEL, [req.user.id])) });
}));

router.delete('/', wrap(async (req, res) => {
  const password = String((req.body && req.body.password) || '');
  const u = await db.get('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
  if (!password || !(await bcrypt.compare(password, u.password_hash))) {
    return res.status(400).json({ success: false, message: 'Password is incorrect.', errors: { password: 'Incorrect password.' } });
  }
  await db.batch([
    { sql: 'DELETE FROM tasks WHERE user_id = ?', args: [req.user.id] },
    { sql: 'DELETE FROM users WHERE id = ?', args: [req.user.id] }
  ]);
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
  res.json({ success: true, message: 'Account deleted.' });
}));

module.exports = router;
