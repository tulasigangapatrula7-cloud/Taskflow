const express = require('express');
const db = require('../database/db');
const wrap = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/authMiddleware');
const { STATUSES, isValidDate, getToday, validateTask, serializeTask } = require('../utils/taskHelpers');

const router = express.Router();
router.use(requireAuth);

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";
const SORTS = {
  newest: 'created_at DESC, id DESC',
  oldest: 'created_at ASC, id ASC',
  deadline: '(due_date IS NULL) ASC, due_date ASC, id DESC',
  priority: "CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END ASC, created_at DESC"
};

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) { res.status(404).json({ success: false, message: 'Task not found.' }); return null; }
  return id;
}
const findOwned = (id, userId) => db.get('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, userId]);
const notFound = (res) => res.status(404).json({ success: false, message: 'Task not found.' });

router.get('/', wrap(async (req, res) => {
  const today = getToday(req);
  const { q, status, priority, overdue, due, category } = req.query;
  const where = ['user_id = ?'];
  const params = [req.user.id];
  if (q && String(q).trim()) {
    const like = '%' + String(q).trim().slice(0, 100).replace(/[\\%_]/g, '\\$&') + '%';
    where.push("(title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')");
    params.push(like, like);
  }
  if (status) {
    if (!STATUSES.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status filter.' });
    where.push('status = ?'); params.push(status);
  }
  if (priority) {
    if (!['low', 'medium', 'high'].includes(priority)) return res.status(400).json({ success: false, message: 'Invalid priority filter.' });
    where.push('priority = ?'); params.push(priority);
  }
  if (category) { where.push('category = ?'); params.push(String(category)); }
  if (overdue === 'true') { where.push("status != 'completed' AND due_date IS NOT NULL AND due_date < ?"); params.push(today); }
  if (due) {
    if (!isValidDate(due)) return res.status(400).json({ success: false, message: 'Invalid due date filter.' });
    where.push('due_date = ?'); params.push(due);
  }
  const orderBy = SORTS[req.query.sort] || SORTS.newest;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const clause = where.join(' AND ');
  const total = (await db.get(`SELECT COUNT(*) AS n FROM tasks WHERE ${clause}`, params)).n;
  const rows = await db.all(`SELECT * FROM tasks WHERE ${clause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
  res.json({ success: true, tasks: rows.map((t) => serializeTask(t, today)), pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) } });
}));

router.get('/:id', wrap(async (req, res) => {
  const id = parseId(req, res); if (id === null) return;
  const task = await findOwned(id, req.user.id);
  if (!task) return notFound(res);
  res.json({ success: true, task: serializeTask(task, getToday(req)) });
}));

router.post('/', wrap(async (req, res) => {
  const { errors, data } = validateTask(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ success: false, message: 'Please fix the highlighted fields.', errors });
  const completedAt = data.status === 'completed' ? new Date().toISOString() : null;
  const r = await db.run(
    'INSERT INTO tasks (user_id, title, description, priority, status, due_date, category, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [req.user.id, data.title, data.description, data.priority, data.status, data.due_date, data.category, completedAt]
  );
  const task = await findOwned(r.lastId, req.user.id);
  res.status(201).json({ success: true, message: 'Task created.', task: serializeTask(task, getToday(req)) });
}));

router.put('/:id', wrap(async (req, res) => {
  const id = parseId(req, res); if (id === null) return;
  const existing = await findOwned(id, req.user.id);
  if (!existing) return notFound(res);
  const { errors, data } = validateTask(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ success: false, message: 'Please fix the highlighted fields.', errors });
  let completedAt = existing.completed_at;
  if (data.status === 'completed' && existing.status !== 'completed') completedAt = new Date().toISOString();
  if (data.status !== 'completed') completedAt = null;
  await db.run(
    `UPDATE tasks SET title = ?, description = ?, priority = ?, status = ?, due_date = ?, category = ?, completed_at = ?, updated_at = ${NOW} WHERE id = ? AND user_id = ?`,
    [data.title, data.description, data.priority, data.status, data.due_date, data.category, completedAt, id, req.user.id]
  );
  res.json({ success: true, message: 'Task updated.', task: serializeTask(await findOwned(id, req.user.id), getToday(req)) });
}));

router.patch('/:id/status', wrap(async (req, res) => {
  const id = parseId(req, res); if (id === null) return;
  const existing = await findOwned(id, req.user.id);
  if (!existing) return notFound(res);
  const status = req.body && req.body.status;
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.', errors: { status: 'Status must be pending, in_progress or completed.' } });
  }
  let completedAt = existing.completed_at;
  if (status === 'completed' && existing.status !== 'completed') completedAt = new Date().toISOString();
  if (status !== 'completed') completedAt = null;
  await db.run(`UPDATE tasks SET status = ?, completed_at = ?, updated_at = ${NOW} WHERE id = ? AND user_id = ?`, [status, completedAt, id, req.user.id]);
  res.json({ success: true, message: 'Status updated.', task: serializeTask(await findOwned(id, req.user.id), getToday(req)) });
}));

router.delete('/:id', wrap(async (req, res) => {
  const id = parseId(req, res); if (id === null) return;
  const r = await db.run('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, req.user.id]);
  if (r.changes === 0) return notFound(res);
  res.json({ success: true, message: 'Task deleted.' });
}));

module.exports = router;
