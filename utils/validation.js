const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const normalizeEmail = (e) => String(e || '').trim().toLowerCase();

function passwordErrors(pw) {
  const errs = [];
  const s = String(pw || '');
  if (s.length < 8) errs.push('Password must be at least 8 characters.');
  if (s.length > 72) errs.push('Password must be at most 72 characters.');
  if (!/[a-z]/.test(s)) errs.push('Password needs a lowercase letter.');
  if (!/[A-Z]/.test(s)) errs.push('Password needs an uppercase letter.');
  if (!/[0-9]/.test(s)) errs.push('Password needs a number.');
  return errs;
}

function nameError(name) {
  const n = String(name || '').trim();
  if (n.length < 2 || n.length > 80) return 'Full name must be 2 to 80 characters.';
  return null;
}

function validateRegister(body = {}) {
  const errors = {};
  const e = nameError(body.fullName);
  if (e) errors.fullName = e;
  if (!EMAIL_RE.test(normalizeEmail(body.email))) errors.email = 'Enter a valid email address.';
  const pe = passwordErrors(body.password);
  if (pe.length) errors.password = pe[0];
  if (body.password !== body.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}

function validateChangePassword(body = {}) {
  const errors = {};
  if (!body.currentPassword) errors.currentPassword = 'Current password is required.';
  const pe = passwordErrors(body.newPassword);
  if (pe.length) errors.newPassword = pe[0];
  if (body.newPassword !== body.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}

module.exports = { EMAIL_RE, normalizeEmail, passwordErrors, nameError, validateRegister, validateChangePassword };
