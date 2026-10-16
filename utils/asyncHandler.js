// Express 4 does not catch rejected promises, so async route handlers are wrapped with this.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
