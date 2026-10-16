// libSQL (SQLite-compatible) client.
//  - Local development: a plain SQLite file (DATABASE_PATH, default ./database/taskflow.db)
//  - Vercel / cloud: Turso, via TURSO_DATABASE_URL + TURSO_AUTH_TOKEN
const fs = require('fs');
const path = require('path');

const remote = !!process.env.TURSO_DATABASE_URL;
const { createClient } = remote ? require('@libsql/client/web') : require('@libsql/client');

let config;
if (remote) {
  config = { url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN };
} else {
  const file = process.env.DATABASE_PATH || './database/taskflow.db';
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  config = { url: 'file:' + file };
}
const client = createClient(config);

const rowsOf = (res) => res.rows.map((row) => {
  const o = {};
  res.columns.forEach((c, i) => { o[c] = row[i]; });
  return o;
});
const all = async (sql, args = []) => rowsOf(await client.execute({ sql, args }));
const get = async (sql, args = []) => (await all(sql, args))[0];
const run = async (sql, args = []) => {
  const r = await client.execute({ sql, args });
  return { changes: r.rowsAffected, lastId: r.lastInsertRowid !== undefined ? Number(r.lastInsertRowid) : null };
};
const batch = (stmts) => client.batch(stmts, 'write');

const ready = (async () => {
  if (!remote) await client.execute('PRAGMA foreign_keys = ON');
  await client.executeMultiple(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
})();
ready.catch((e) => console.error('Database init failed:', e.message));

module.exports = { client, all, get, run, batch, ready };
