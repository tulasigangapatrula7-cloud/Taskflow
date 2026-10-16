// Local / traditional hosting entry point. On Vercel, api/index.js is used instead.
const app = require('./app');
const db = require('./database/db');

const port = process.env.PORT || 3000;
const server = app.listen(port, () => console.log(`TaskFlow listening on :${port}`));
const shutdown = () => server.close(() => { db.client.close(); process.exit(0); });
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
