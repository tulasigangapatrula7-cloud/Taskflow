(() => {
  const tasks = new Map();
  const dash = $('#dash');
  $('#add-task').innerHTML = icon('plus') + 'Add Task';
  $('#add-task').onclick = () => openTaskForm(null, load);

  dash.addEventListener('click', (e) => {
    const row = e.target.closest('.task-row');
    if (row) openTaskDetails(tasks.get(Number(row.dataset.id)), load);
  });

  async function load() {
    try {
      const d = await api('/dashboard/stats?today=' + todayLocal());
      render(d);
    } catch (err) {
      dash.innerHTML = `<div class="card empty"><h3>Could not load dashboard</h3><p>${esc(err.message)}</p><button type="button" class="btn primary" id="retry">Try again</button></div>`;
      $('#retry').onclick = load;
    }
  }

  function render({ stats: s, recentTasks, upcomingTasks }) {
    [...recentTasks, ...upcomingTasks].forEach((t) => tasks.set(t.id, t));
    if (!s.total) {
      dash.innerHTML = `<div class="card empty"><div class="e-icon">${icon('tasks')}</div><h3>No tasks yet</h3><p>Create your first task to start tracking your progress.</p><button type="button" class="btn primary" id="first">${icon('plus')}Create your first task</button></div>`;
      $('#first').onclick = () => openTaskForm(null, load);
      return;
    }
    const pct = (n) => (s.total ? (n / s.total) * 100 : 0);
    const list = (arr, empty) => arr.length ? arr.map(taskRow).join('') : `<p class="muted" style="padding:12px">${empty}</p>`;
    dash.innerHTML = `
      <div class="stat-grid">
        <div class="stat"><div class="n">${s.total}</div><div class="l">Total Tasks</div></div>
        <div class="stat"><div class="n">${s.pending}</div><div class="l">Pending</div></div>
        <div class="stat s-prog"><div class="n">${s.inProgress}</div><div class="l">In Progress</div></div>
        <div class="stat s-done"><div class="n">${s.completed}</div><div class="l">Completed</div></div>
        <div class="stat s-overdue"><div class="n">${s.overdue}</div><div class="l">Overdue</div></div>
      </div>
      <div class="two-col">
        <div class="card"><h2>Completion progress</h2><p style="margin-bottom:10px"><b style="font-size:1.6rem;color:var(--navy)">${s.completionRate}%</b> <span class="muted">of tasks completed</span></p>
          <div class="progress" role="progressbar" aria-valuenow="${s.completionRate}" aria-valuemin="0" aria-valuemax="100"><i style="width:${s.completionRate}%"></i></div></div>
        <div class="card"><h2>Status distribution</h2><div class="dist" role="img" aria-label="Status distribution"><i class="c-pending" style="width:${pct(s.pending)}%"></i><i class="c-in_progress" style="width:${pct(s.inProgress)}%"></i><i class="c-completed" style="width:${pct(s.completed)}%"></i></div>
          <div class="legend"><span><b class="c-pending"></b>Pending ${s.pending}</span><span><b class="c-in_progress"></b>In Progress ${s.inProgress}</span><span><b class="c-completed"></b>Completed ${s.completed}</span></div></div>
      </div>
      <div class="two-col">
        <div class="card"><h2>Recent tasks</h2>${list(recentTasks, 'No tasks yet.')}</div>
        <div class="card"><h2>Upcoming deadlines</h2>${list(upcomingTasks, 'No upcoming deadlines.')}</div>
      </div>`;
  }

  buildShell('dashboard').then((user) => {
    $('#welcome').textContent = 'Welcome back, ' + user.fullName.split(' ')[0];
    load();
  }).catch((err) => { dash.innerHTML = `<div class="card empty"><h3>Something went wrong</h3><p>${esc(err.message)}</p></div>`; });
})();
