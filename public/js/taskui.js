const STATUS_LABEL = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' };
const PRIORITY_LABEL = { low: 'Low', medium: 'Medium', high: 'High' };
const statusOptions = (sel) => Object.entries(STATUS_LABEL).map(([v, l]) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${l}</option>`).join('');

function taskCard(t) {
  const done = t.status === 'completed';
  return `<article class="task-card ${done ? 'done' : ''}" data-id="${t.id}">
    <div class="task-top"><button type="button" class="check ${done ? 'on' : ''}" data-action="toggle" aria-label="${done ? 'Mark as pending' : 'Mark as complete'}">${icon('check')}</button>
      <div class="task-main"><h3 class="task-title">${esc(t.title)}</h3>${t.description ? `<p class="task-desc">${esc(t.description)}</p>` : ''}</div></div>
    <div class="badges"><span class="badge pri-${t.priority}">${PRIORITY_LABEL[t.priority]} priority</span><span class="badge st-${t.status}">${STATUS_LABEL[t.status]}</span>${t.category ? `<span class="badge cat">${esc(t.category)}</span>` : ''}${t.isOverdue ? '<span class="badge overdue">Overdue</span>' : ''}</div>
    <div class="task-dates"><span>Due: ${t.dueDate ? fmtDate(t.dueDate) : 'No due date'}</span><span>Created: ${fmtDate(t.createdAt.slice(0, 10))}</span><span>Updated: ${fmtDate(t.updatedAt.slice(0, 10))}</span></div>
    <div class="task-actions"><select data-action="status" aria-label="Change status">${statusOptions(t.status)}</select>
      <button type="button" class="btn sm ghost" data-action="view">View</button>
      <button type="button" class="btn sm ghost" data-action="edit">${icon('edit')}Edit</button>
      <button type="button" class="btn sm danger-ghost" data-action="delete">${icon('trash')}Delete</button></div></article>`;
}

function taskRow(t) {
  return `<button type="button" class="task-row" data-id="${t.id}"><span class="dot p-${t.priority}"></span><span class="row-main"><span class="row-title">${esc(t.title)}</span><span class="row-sub">${t.dueDate ? 'Due ' + fmtDate(t.dueDate) : 'No due date'} &middot; ${STATUS_LABEL[t.status]}</span></span>${t.isOverdue ? '<span class="badge overdue">Overdue</span>' : ''}</button>`;
}

async function changeStatus(id, status) {
  await api(`/tasks/${id}/status?today=${todayLocal()}`, { method: 'PATCH', body: { status } });
  toast('Status updated');
}

async function deleteTask(task) {
  const ok = await confirmDialog('Delete task?', `"${task.title}" will be permanently deleted. This cannot be undone.`, 'Delete', true);
  if (!ok) return false;
  await api(`/tasks/${task.id}`, { method: 'DELETE' });
  toast('Task deleted');
  return true;
}

function openTaskForm(task, onSaved) {
  const form = document.createElement('form');
  form.noValidate = true;
  form.innerHTML = `
    <div class="field"><label for="tf-title">Title *</label><input id="tf-title" name="title" maxlength="120" autocomplete="off"><p class="err" data-err="title"></p></div>
    <div class="field"><label for="tf-desc">Description</label><textarea id="tf-desc" name="description" maxlength="2000"></textarea><p class="err" data-err="description"></p></div>
    <div class="form-grid">
      <div class="field"><label for="tf-pri">Priority</label><select id="tf-pri" name="priority"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select><p class="err" data-err="priority"></p></div>
      <div class="field"><label for="tf-status">Status</label><select id="tf-status" name="status">${statusOptions('pending')}</select><p class="err" data-err="status"></p></div>
      <div class="field"><label for="tf-due">Due date</label><input id="tf-due" type="date" name="dueDate"><p class="err" data-err="dueDate"></p></div>
      <div class="field"><label for="tf-cat">Category</label><input id="tf-cat" name="category" maxlength="40" autocomplete="off"><p class="err" data-err="category"></p></div>
    </div>
    <div class="form-actions"><button type="button" class="btn ghost" data-cancel>Cancel</button><button type="submit" class="btn primary">Save task</button></div>`;
  const f = (n) => form.elements[n];
  f('priority').value = task ? task.priority : 'medium';
  f('status').value = task ? task.status : 'pending';
  if (task) { f('title').value = task.title; f('description').value = task.description || ''; f('dueDate').value = task.dueDate || ''; f('category').value = task.category || ''; }
  const snap = () => JSON.stringify(['title', 'description', 'priority', 'status', 'dueDate', 'category'].map((n) => f(n).value));
  const initial = snap();
  let saving = false;
  const modal = openModal(task ? 'Edit task' : 'New task', form, {
    onRequestClose: () => {
      if (!saving && snap() !== initial) { confirmDialog('Discard changes?', 'You have unsaved changes. Discard them?', 'Discard', true).then((ok) => ok && modal.close()); return false; }
      return true;
    }
  });
  $('[data-cancel]', form).onclick = () => modal.requestClose();
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(['title', 'description', 'priority', 'status', 'dueDate', 'category'].map((n) => [n, f(n).value.trim()]));
    if (!body.title) return showErrors(form, { title: 'Title is required.' });
    showErrors(form, {});
    const btn = $('[type=submit]', form);
    saving = true; setBusy(btn, true);
    try {
      await api(task ? `/tasks/${task.id}?today=${todayLocal()}` : `/tasks?today=${todayLocal()}`, { method: task ? 'PUT' : 'POST', body });
      toast(task ? 'Task updated' : 'Task created');
      modal.close(); onSaved && onSaved();
    } catch (err) {
      saving = false; setBusy(btn, false);
      showErrors(form, err.errors); toast(err.message, 'error');
    }
  });
}

function openTaskDetails(task, onChange) {
  const el = document.createElement('div');
  el.innerHTML = `${task.isOverdue ? `<div class="alert danger">${icon('alert')} This task is overdue.</div>` : ''}
    <h3 class="d-title">${esc(task.title)}</h3>
    <p class="d-desc">${task.description ? esc(task.description) : '<span class="muted">No description.</span>'}</p>
    <dl class="meta">
      <div><dt>Priority</dt><dd>${PRIORITY_LABEL[task.priority]}</dd></div><div><dt>Status</dt><dd>${STATUS_LABEL[task.status]}</dd></div>
      <div><dt>Due date</dt><dd>${task.dueDate ? fmtDate(task.dueDate) : 'None'}</dd></div><div><dt>Category</dt><dd>${task.category ? esc(task.category) : 'None'}</dd></div>
      <div><dt>Created</dt><dd>${fmtDateTime(task.createdAt)}</dd></div><div><dt>Last updated</dt><dd>${fmtDateTime(task.updatedAt)}</dd></div>
      ${task.completedAt ? `<div><dt>Completed</dt><dd>${fmtDateTime(task.completedAt)}</dd></div>` : ''}
    </dl>
    <div class="field"><label for="d-status">Update status</label><select id="d-status">${statusOptions(task.status)}</select></div>
    <div class="form-actions"><button type="button" class="btn danger-ghost" data-del>${icon('trash')}Delete</button><button type="button" class="btn primary" data-edit>${icon('edit')}Edit</button></div>`;
  const modal = openModal('Task details', el);
  $('#d-status', el).onchange = async (e) => {
    try { await changeStatus(task.id, e.target.value); modal.close(); onChange(); } catch (err) { toast(err.message, 'error'); }
  };
  $('[data-edit]', el).onclick = () => { modal.close(); openTaskForm(task, onChange); };
  $('[data-del]', el).onclick = async () => {
    try { if (await deleteTask(task)) { modal.close(); onChange(); } } catch (err) { toast(err.message, 'error'); }
  };
}

// Click/change handling for lists of task cards. getTask(id) returns the task object.
function bindTaskList(container, getTask, onChange) {
  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]'); if (!btn || btn.tagName === 'SELECT') return;
    const card = btn.closest('[data-id]'); const task = getTask(Number(card.dataset.id)); if (!task) return;
    try {
      if (btn.dataset.action === 'view') openTaskDetails(task, onChange);
      if (btn.dataset.action === 'edit') openTaskForm(task, onChange);
      if (btn.dataset.action === 'toggle') { await changeStatus(task.id, task.status === 'completed' ? 'pending' : 'completed'); onChange(); }
      if (btn.dataset.action === 'delete') { if (await deleteTask(task)) onChange(); }
    } catch (err) { toast(err.message, 'error'); }
  });
  container.addEventListener('change', async (e) => {
    if (e.target.dataset.action !== 'status') return;
    const task = getTask(Number(e.target.closest('[data-id]').dataset.id));
    try { await changeStatus(task.id, e.target.value); onChange(); } catch (err) { toast(err.message, 'error'); onChange(); }
  });
}
