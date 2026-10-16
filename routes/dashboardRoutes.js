const express = require('express');
const db = require('../database/db');
const wrap = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/authMiddleware');
const { getToday, serializeTask } = require('../utils/taskHelpers');

const router = express.Router();
router.use(requireAuth);

router.get('/stats', wrap(async (req, res) => {
  const today = getToday(req);
  const uid = req.user.id;
  const c = await db.get(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(status = 'pending'), 0) AS pending,
            COALESCE(SUM(status = 'in_progress'), 0) AS inProgress,
            COALESCE(SUM(status = 'completed'), 0) AS completed,
            COALESCE(SUM(status != 'completed' AND due_date IS NOT NULL AND due_date < ?), 0) AS overdue
     FROM tasks WHERE user_id = ?`, [today, uid]);
  const recent = await db.all('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 5', [uid]);
  const upcoming = await db.all(
    "SELECT * FROM tasks WHERE user_id = ? AND status != 'completed' AND due_date IS NOT NULL AND due_date >= ? ORDER BY due_date ASC LIMIT 5", [uid, today]);
  res.json({
    success: true,
    stats: { ...c, completionRate: c.total ? Math.round((c.completed / c.total) * 100) : 0 },
    recentTasks: recent.map((t) => serializeTask(t, today)),
    upcomingTasks: upcoming.map((t) => serializeTask(t, today))
  });
}));

module.exports = router;
