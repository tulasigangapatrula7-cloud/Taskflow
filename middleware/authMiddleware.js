const jwt = require('jsonwebtoken');
const db = require('../database/db');

const GET_USER = 'SELECT id, full_name, email, token_version FROM users WHERE id = ?';
const unauth = (res) => res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });

async function loadUser(token) {
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET); } catch (e) { return null; }
  const user = await db.get(GET_USER, [payload.sub]);
  return user && user.token_version === payload.tv ? user : null;
}

async function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.token;
  if (!token) return res.status(401).json({ success: false, message: 'Authentication required.' });
  try {
    const user = await loadUser(token);
    if (!user) return unauth(res);
    req.user = { id: user.id, fullName: user.full_name, email: user.email };
  } catch (err) { return next(err); }
  next();
}

// For protected HTML pages (when served by Express): redirect visitors without a valid session.
async function pageGuard(req, res, next) {
  try {
    const user = await loadUser(req.cookies && req.cookies.token);
    if (user) return next();
  } catch (e) { /* fall through */ }
  res.redirect('/login.html');
}

module.exports = { requireAuth, pageGuard };
