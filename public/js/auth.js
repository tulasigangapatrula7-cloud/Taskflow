(() => {
  const page = document.body.dataset.page;
  const form = $('#auth-form');
  const alertBox = $('#form-alert');
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  api('/auth/me').then(() => { location.href = '/dashboard.html'; }).catch(() => {});

  $$('[data-toggle]').forEach((b) => b.addEventListener('click', () => {
    const input = document.getElementById(b.dataset.toggle);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    b.textContent = show ? 'Hide' : 'Show';
    b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  }));

  if (page === 'register') {
    $('#password').addEventListener('input', (e) => {
      const p = e.target.value;
      const score = [p.length >= 8, /[a-z]/.test(p), /[A-Z]/.test(p), /\d/.test(p), /[^A-Za-z0-9]/.test(p), p.length >= 12].filter(Boolean).length;
      const levels = [['Too weak', '#dc2626'], ['Too weak', '#dc2626'], ['Weak', '#f59e0b'], ['Fair', '#f59e0b'], ['Good', '#22c55e'], ['Strong', '#16a34a'], ['Very strong', '#16a34a']];
      $('#strength-bar').style.width = (p ? (score / 6) * 100 : 0) + '%';
      $('#strength-bar').style.background = levels[score][1];
      $('#strength-label').textContent = p ? 'Strength: ' + levels[score][0] : 'Use 8+ characters with upper, lower case and a number.';
    });
  }

  function validate(v) {
    const e = {};
    if (page === 'register') {
      if (v.fullName.trim().length < 2) e.fullName = 'Enter your full name (2+ characters).';
    }
    if (!EMAIL_RE.test(v.email.trim())) e.email = 'Enter a valid email address.';
    if (!v.password) e.password = 'Password is required.';
    else if (page === 'register') {
      if (v.password.length < 8) e.password = 'Password must be at least 8 characters.';
      else if (!/[a-z]/.test(v.password) || !/[A-Z]/.test(v.password) || !/\d/.test(v.password)) e.password = 'Include an uppercase letter, a lowercase letter and a number.';
      if (v.password !== v.confirmPassword) e.confirmPassword = 'Passwords do not match.';
      if (!v.acceptTerms) e.acceptTerms = 'You must accept the terms.';
    }
    return e;
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    alertBox.hidden = true;
    const v = Object.fromEntries(Array.from(form.elements).filter((el) => el.name).map((el) => [el.name, el.type === 'checkbox' ? el.checked : el.value]));
    const errors = validate(v);
    showErrors(form, errors);
    if (Object.keys(errors).length) return;
    const btn = $('[type=submit]', form);
    setBusy(btn, true, page === 'login' ? 'Logging in...' : 'Creating account...');
    try {
      await api(page === 'login' ? '/auth/login' : '/auth/register', { method: 'POST', body: v });
      location.href = '/dashboard.html';
    } catch (err) {
      setBusy(btn, false);
      showErrors(form, err.errors);
      alertBox.textContent = err.message; alertBox.hidden = false;
    }
  });
})();
