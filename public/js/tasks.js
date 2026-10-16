(() => {
  const tasks = new Map();
  const state = { q: '', status: '', priority: '', overdue: false, due: '', sort: 'newest', page: 1 };
  const list = $('#list'), pager = $('#pager');
  $('#add-task').innerHTML = icon('plus') + 'Add Task';
  $('#add-task').onclick = () => openTaskForm(null, load);
  $('#search-icon').innerHTML = icon('search');

  async function load() {
    list.innerHTML = '<div class="loading"><span class="spinner"></span> Loading tasks...</div>';
    const p = new URLSearchParams({ sort: state.sort, page: state.page, limit: 9, today: todayLocal() });
    if (state.q) p.set('q', state.q);
    if (state.status) p.set('status', state.status);
    if (state.priority) p.set('priority', state.priority);
    if (state.overdue) p.set('overdue', 'true');
    if (state.due) p.set('due', state.due);
    try {
      const { tasks: rows, pagination: pg } = await api('/tasks?' + p);
      if (!rows.length && pg.page > 1) { state.page = pg.totalPages; return load(); }
      tasks.clear(); rows.forEach((t) => tasks.set(t.id, t));
      const filtered = state.q || state.status || state.priority || state.overdue || state.due;
      if (!rows.length) {
        list.innerHTML = `<div class="card empty"><div class="e-icon">${icon('tasks')}</div><h3>${filtered ? 'No tasks match your filters' : 'No tasks yet'}</h3><p>${filtered ? 'Try changing or clearing the filters.' : 'Create your first task to get started.'}</p>${filtered ? '' : `<button type="button" class="btn primary" id="first">${icon('plus')}Create a task</button>`}</div>`;
        const first = $('#first'); if (first) first.onclick = () => openTaskForm(null, load);
        pager.hidden = true; return;
      }
      list.innerHTML = `<div class="task-grid">${rows.map(taskCard).join('')}</div>`;
      pager.hidden = pg.totalPages <= 1;
      pager.innerHTML = `<button type="button" class="btn ghost sm" id="prev" ${pg.page <= 1 ? 'disabled' : ''}>Previous</button><span>Page ${pg.page} of ${pg.totalPages} &middot; ${pg.total} tasks</span><button type="button" class="btn ghost sm" id="next" ${pg.page >= pg.totalPages ? 'disabled' : ''}>Next</button>`;
      $('#prev').onclick = () => { state.page--; load(); window.scrollTo({ top: 0 }); };
      $('#next').onclick = () => { state.page++; load(); window.scrollTo({ top: 0 }); };
    } catch (err) {
      pager.hidden = true;
      list.innerHTML = `<div class="card empty"><h3>Could not load tasks</h3><p>${esc(err.message)}</p><button type="button" class="btn primary" id="retry">Try again</button></div>`;
      $('#retry').onclick = load;
    }
  }

  const apply = (key, el, isCheck) => el.addEventListener(isCheck || el.tagName === 'SELECT' || el.type === 'date' ? 'change' : 'input', () => {
    state[key] = isCheck ? el.checked : el.value.trim(); state.page = 1; load();
  });
  apply('status', $('#f-status')); apply('priority', $('#f-priority')); apply('sort', $('#f-sort'));
  apply('due', $('#f-due')); apply('overdue', $('#f-overdue'), true);
  $('#f-q').addEventListener('input', debounce((e) => { state.q = e.target.value.trim(); state.page = 1; load(); }, 300));
  $('#f-clear').onclick = () => {
    Object.assign(state, { q: '', status: '', priority: '', overdue: false, due: '', sort: 'newest', page: 1 });
    $('#f-q').value = ''; $('#f-status').value = ''; $('#f-priority').value = ''; $('#f-due').value = ''; $('#f-sort').value = 'newest'; $('#f-overdue').checked = false;
    load();
  };

  bindTaskList(list, (id) => tasks.get(id), load);
  buildShell('tasks').then(load).catch((err) => { list.innerHTML = `<div class="card empty"><h3>Something went wrong</h3><p>${esc(err.message)}</p></div>`; });
})();
