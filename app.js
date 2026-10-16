require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const db = require('./database/db');
const wrap = require('./utils/asyncHandler');
const { pageGuard } = require('./middleware/authMiddleware');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be set (32+ chars). See .env.example.');
  throw new Error('Missing JWT_SECRET');
}

const app = express();
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: { useDefaults: true, directives: { 'upgrade-insecure-requests': process.env.NODE_ENV === 'production' ? [] : null } }
}));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// CSRF defence: cookies are SameSite=Lax and mutating calls must declare JSON
// (browsers cannot send that header cross-site without a CORS preflight, which is never allowed).
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !String(req.headers['content-type'] || '').includes('application/json')) {
    return res.status(415).json({ success: false, message: 'Content-Type must be application/json.' });
  }
  next();
});

const limiter = (limit, windowMs, message) => rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, message: { success: false, message } });
app.use('/api/auth/login', limiter(20, 15 * 60 * 1000, 'Too many attempts. Try again in 15 minutes.'));
app.use('/api/auth/register', limiter(20, 15 * 60 * 1000, 'Too many attempts. Try again in 15 minutes.'));
app.use('/api', limiter(300, 60 * 1000, 'Too many requests. Slow down.'));

// Make sure the schema exists before serving any API request.
app.use('/api', wrap(async (req, res, next) => { await db.ready; next(); }));

app.get('/api/health', wrap(async (req, res) => {
  await db.get('SELECT 1 AS ok');
  res.json({ success: true, status: 'ok' });
}));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));

app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'Route not found.' }));
app.get(['/dashboard.html', '/tasks.html', '/profile.html'], pageGuard);
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html'), (e) => e && res.end('Not found')));

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ success: false, message: 'Invalid JSON.' });
  console.error('Unhandled error:', err.message);
  res.status(500).json({ success: false, message: 'Something went wrong.' });
});

module.exports = app;
