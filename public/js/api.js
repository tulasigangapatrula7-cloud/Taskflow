const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
  tasks: '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  alert: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'
};
const icon = (n) => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const LOGO = '<span class="logo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const fmtDateTime = (iso) => iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch('/api' + path, {
      method, credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : (method === 'GET' ? undefined : '{}')
    });
  } catch (e) {
    throw { message: 'Network error. Check your connection and try again.', errors: {}, network: true };
  }
  let data = {};
  try { data = await res.json(); } catch (e) { /* non-JSON */ }
  if (!res.ok) {
    if (res.status === 401 && document.body.dataset.protected) location.href = '/login.html';
    throw { status: res.status, message: data.message || 'Something went wrong. Please try again.', errors: data.errors || {} };
  }
  return data;
}

function toast(msg, type = 'success') {
  let c = $('#toasts');
  if (!c) { c = document.createElement('div'); c.id = 'toasts'; c.setAttribute('aria-live', 'polite'); document.body.append(c); }
  const t = document.createElement('div');
  t.className = 'toast ' + type; t.textContent = msg; c.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3500);
}

function showErrors(form, errors = {}) {
  $$('[data-err]', form).forEach((p) => { p.textContent = errors[p.dataset.err] || ''; });
  Array.from(form.elements).forEach((el) => { if (el.name) el.setAttribute('aria-invalid', errors[el.name] ? 'true' : 'false'); });
  const first = Object.keys(errors)[0];
  if (first && form.elements[first]) form.elements[first].focus();
}

function setBusy(btn, busy, label) {
  if (busy) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> ' + esc(label || 'Saving...'); }
  else { btn.disabled = false; btn.innerHTML = btn.dataset.label || btn.innerHTML; }
}

// ---- Modal with focus handling ----
function openModal(title, contentEl, { onRequestClose } = {}) {
  const prev = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><h2 id="modal-title"></h2><button type="button" class="icon-btn" aria-label="Close" data-x>${icon('x')}</button></div><div class="modal-body"></div></div>`;
  $('h2', overlay).textContent = title;
  $('.modal-body', overlay).append(contentEl);
  const focusables = () => $$('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])', overlay).filter((e) => !e.disabled && !e.hidden);
  const isTop = () => { const all = $$('.overlay'); return all[all.length - 1] === overlay; };
  function close(force) {
    if (!force && onRequestClose && onRequestClose() === false) return;
    overlay.remove(); document.removeEventListener('keydown', onKey);
    if (!$('.overlay')) document.body.classList.remove('no-scroll');
    if (prev && prev.focus) prev.focus();
  }
  function onKey(e) {
    if (!isTop()) return;
    if (e.key === 'Escape') { e.preventDefault(); close(false); }
    if (e.key === 'Tab') {
      const f = focusables(); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  $('[data-x]', overlay).addEventListener('click', () => close(false));
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(false); });
  document.addEventListener('keydown', onKey);
  document.body.append(overlay); document.body.classList.add('no-scroll');
  const body = $$('input,select,textarea,button', $('.modal-body', overlay))[0];
  (body || $('[data-x]', overlay)).focus();
  return { close: () => close(true), requestClose: () => close(false) };
}

function confirmDialog(title, message, label = 'Confirm', danger = false) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.innerHTML = '<p class="muted" data-msg></p><div class="form-actions"><button type="button" class="btn ghost" data-no>Cancel</button><button type="button" class="btn ' + (danger ? 'danger' : 'primary') + '" data-yes></button></div>';
    $('[data-msg]', el).textContent = message; $('[data-yes]', el).textContent = label;
    let done = false;
    const finish = (v) => { if (done) return; done = true; m.close(); resolve(v); };
    const m = openModal(title, el, { onRequestClose: () => { finish(false); return false; } });
    $('[data-no]', el).onclick = () => finish(false);
    $('[data-yes]', el).onclick = () => finish(true);
  });
}

// ---- App shell (sidebar + top bar) ----
async function logout() {
  try { await api('/auth/logout', { method: 'POST' }); } catch (e) { /* ignore */ }
  location.href = '/login.html';
}

async function buildShell(active) {
  const { user } = await api('/auth/me');
  const nav = [['dashboard', '/dashboard.html', 'Dashboard', 'dashboard'], ['tasks', '/tasks.html', 'All Tasks', 'tasks'], ['profile', '/profile.html', 'Profile', 'user']];
  $('#sidebar').innerHTML = `<a class="brand" href="/dashboard.html">${LOGO}<span>TaskFlow</span></a><nav aria-label="Main">${nav.map(([k, h, l, i]) => `<a class="nav-link ${k === active ? 'active' : ''}" href="${h}" ${k === active ? 'aria-current="page"' : ''}>${icon(i)}<span>${l}</span></a>`).join('')}</nav><button type="button" class="nav-link" data-logout>${icon('logout')}<span>Log out</span></button>`;
  const initials = user.fullName.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  $('#topbar').innerHTML = `<button type="button" class="icon-btn menu-btn" id="menu-btn" aria-label="Open menu" aria-expanded="false">${icon('menu')}</button><div class="topbar-spacer"></div><div class="user-menu"><button type="button" class="user-btn" id="user-btn" aria-haspopup="true" aria-expanded="false"><span class="avatar" id="avatar"></span><span class="user-name" id="user-name"></span></button><div class="dropdown" id="user-dd" hidden><a href="/profile.html">Profile &amp; settings</a><button type="button" data-logout>Log out</button></div></div>`;
  $('#avatar').textContent = initials; $('#user-name').textContent = user.fullName;
  const backdrop = document.createElement('div'); backdrop.className = 'backdrop'; document.body.append(backdrop);
  const toggle = (open) => { $('#sidebar').classList.toggle('open', open); backdrop.classList.toggle('show', open); $('#menu-btn').setAttribute('aria-expanded', String(open)); };
  $('#menu-btn').onclick = () => toggle(!$('#sidebar').classList.contains('open'));
  backdrop.onclick = () => toggle(false);
  const dd = $('#user-dd'), ub = $('#user-btn');
  ub.onclick = (e) => { e.stopPropagation(); dd.hidden = !dd.hidden; ub.setAttribute('aria-expanded', String(!dd.hidden)); };
  document.addEventListener('click', () => { dd.hidden = true; ub.setAttribute('aria-expanded', 'false'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { dd.hidden = true; toggle(false); } });
  $$('[data-logout]').forEach((b) => b.addEventListener('click', logout));
  return user;
}
function setShellName(name) {
  $('#user-name').textContent = name;
  $('#avatar').textContent = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}
