const PRIORITIES = ['low', 'medium', 'high'];
const STATUSES = ['pending', 'in_progress', 'completed'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(s) {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// The client sends its local date as ?today=YYYY-MM-DD so "overdue" respects the user's timezone.
function getToday(req) {
  const t = req.query && req.query.today;
  return typeof t === 'string' && isValidDate(t) ? t : new Date().toISOString().slice(0, 10);
}

function validateTask(body = {}) {
  const errors = {};
  const data = {};
  const title = String(body.title || '').trim();
  if (!title) errors.title = 'Title is required.';
  else if (title.length > 120) errors.title = 'Title must be 120 characters or fewer.';
  data.title = title;

  const description = String(body.description || '').trim();
  if (description.length > 2000) errors.description = 'Description must be 2000 characters or fewer.';
  data.description = description || null;

  data.priority = body.priority === undefined || body.priority === '' ? 'medium' : body.priority;
  if (!PRIORITIES.includes(data.priority)) errors.priority = 'Priority must be low, medium or high.';

  data.status = body.status === undefined || body.status === '' ? 'pending' : body.status;
  if (!STATUSES.includes(data.status)) errors.status = 'Status must be pending, in_progress or completed.';

  const due = body.dueDate === undefined || body.dueDate === null ? '' : String(body.dueDate).trim();
  if (due && !isValidDate(due)) errors.dueDate = 'Due date must be a valid date (YYYY-MM-DD).';
  data.due_date = due || null;

  const category = String(body.category || '').trim();
  if (category.length > 40) errors.category = 'Category must be 40 characters or fewer.';
  data.category = category || null;

  return { errors, data };
}

function serializeTask(t, today) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    dueDate: t.due_date,
    category: t.category,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    completedAt: t.completed_at,
    isOverdue: !!(t.due_date && t.status !== 'completed' && t.due_date < today)
  };
}

module.exports = { PRIORITIES, STATUSES, isValidDate, getToday, validateTask, serializeTask };
