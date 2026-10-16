(() => {
  $('#logout-btn').innerHTML = icon('logout') + 'Log out';
  $('#logout-btn').onclick = logout;
  const pf = $('#profile-form'), pw = $('#pw-form');

  async function loadProfile() {
    try {
      const { profile } = await api('/profile');
      pf.elements.fullName.value = profile.fullName; pf.elements.email.value = profile.email;
      $('#p-since').textContent = 'Member since ' + fmtDate(profile.createdAt.slice(0, 10));
    } catch (err) { toast(err.message, 'error'); }
  }

  pf.addEventListener('submit', async (e) => {
    e.preventDefault(); showErrors(pf, {});
    const btn = $('[type=submit]', pf); setBusy(btn, true);
    try {
      const { profile } = await api('/profile', { method: 'PUT', body: { fullName: pf.elements.fullName.value, email: pf.elements.email.value } });
      setShellName(profile.fullName); toast('Profile updated');
    } catch (err) { showErrors(pf, err.errors); toast(err.message, 'error'); }
    setBusy(btn, false);
  });

  pw.addEventListener('submit', async (e) => {
    e.preventDefault(); showErrors(pw, {});
    const body = Object.fromEntries(Array.from(pw.elements).filter((x) => x.name).map((x) => [x.name, x.value]));
    const btn = $('[type=submit]', pw); setBusy(btn, true);
    try { await api('/auth/change-password', { method: 'POST', body }); pw.reset(); toast('Password updated'); }
    catch (err) { showErrors(pw, err.errors); toast(err.message, 'error'); }
    setBusy(btn, false);
  });

  $('#delete-account').onclick = () => {
    const el = document.createElement('form'); el.noValidate = true;
    el.innerHTML = '<p class="muted" style="margin-bottom:14px">This permanently deletes your account and all tasks. Enter your password to confirm.</p><div class="field"><label for="d-pw">Password</label><input id="d-pw" name="password" type="password" autocomplete="current-password"><p class="err" data-err="password"></p></div><div class="form-actions"><button type="button" class="btn ghost" data-cancel>Cancel</button><button type="submit" class="btn danger">Delete account</button></div>';
    const m = openModal('Delete account', el);
    $('[data-cancel]', el).onclick = () => m.close();
    el.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!el.elements.password.value) return showErrors(el, { password: 'Password is required.' });
      const btn = $('[type=submit]', el); setBusy(btn, true, 'Deleting...');
      try { await api('/profile', { method: 'DELETE', body: { password: el.elements.password.value } }); location.href = '/'; }
      catch (err) { setBusy(btn, false); showErrors(el, err.errors); toast(err.message, 'error'); }
    });
  };

  buildShell('profile').then(loadProfile).catch((err) => toast(err.message, 'error'));
})();
