const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
let server, catalogServer, base, LESSONS;
let catalogModules = []; let catalogAvailable = true;
const rows = new Map();
before(async () => {
  const { createFortisimRouter } = await import('../../../integrations/academy/fortisim.routes.mjs');
  ({ LESSONS } = await import('../../../integrations/academy/lesson-manifest.mjs'));
  const pool = { query: async (sql, values) => {
    if (sql.startsWith('SELECT')) {
      const key = `${values[0]}:${values[1]}`;
      return [[...(rows.get(key) || [])].sort().map(task_id => ({ task_id }))];
    }
    assert.ok(sql.startsWith('INSERT INTO fortisim_progress'));
    for (let i = 0; i < values.length; i += 3) {
      const key = `${values[i]}:${values[i + 1]}`; const set = rows.get(key) || new Set(); set.add(values[i + 2]); rows.set(key, set);
    }
    return [{}];
  } };
  const catalog = express(); catalog.get('/catalog', (_req, res) => catalogAvailable ? res.json({ modules: catalogModules }) : res.status(503).json({ error: 'Offline' }));
  catalogServer = catalog.listen(0, '127.0.0.1'); await once(catalogServer, 'listening');
  const app = express(); app.use(express.json());
  app.use('/api/integrations/fortisim', createFortisimRouter({ Router: express.Router, pool, catalogUrl: `http://127.0.0.1:${catalogServer.address().port}/catalog`, authenticate: (req, res, next) => {
    if (!['Bearer alice', 'Bearer bob'].includes(req.headers.authorization)) return res.status(401).json({ message: 'Login required' });
    req.user = { id: req.headers.authorization === 'Bearer alice' ? 1 : 2 }; next();
  } }));
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening'); base = `http://127.0.0.1:${server.address().port}/api/integrations/fortisim`;
});
after(async () => { await Promise.all([server, catalogServer].filter(Boolean).map(s => new Promise(resolve => s.close(resolve)))); });
async function call(path, user, completed) {
  const response = await fetch(base + path, { headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${user}` } : {}) }, ...(completed ? { method: 'POST', body: JSON.stringify({ completed }) } : {}) });
  return { status: response.status, body: await response.json() };
}
test('Academy adapter uses the same public task registry as the engine', () => {
  assert.deepEqual(LESSONS, require('../../engine/dist').COMPLETION_TASKS);
});
test('Academy adapter authenticates and merges practice completion idempotently by user', async () => {
  assert.equal((await call('/summary')).status, 401);
  const a = await call('/progress/fortigate', 'alice', ['web-server-access-01', 'web-server-access-01']);
  assert.deepEqual(a.body.completed, ['web-server-access-01']);
  assert.deepEqual((await call('/progress/fortigate', 'bob')).body.completed, []);
  const summary = await call('/summary', 'alice');
  assert.equal(summary.body.courses[0].total, LESSONS.fortigate.length);
  assert.deepEqual(summary.body.courses[0].completed, ['web-server-access-01']);
});
test('Academy adapter rejects unsupported platforms and invalid lesson IDs', async () => {
  assert.equal((await call('/progress/unknown', 'alice')).status, 400);
  assert.equal((await call('/progress/fortigate', 'alice', ['pan-sec-01'])).status, 400);
});

test('Academy recognizes published custom lessons in completion and totals', async () => {
  const id = 'custom-00000000-0000-0000-0000-000000000001';
  catalogModules = [{ vendor: 'fortigate', lessons: [{ id }] }];
  const saved = await call('/progress/fortigate', 'alice', [id]);
  assert.equal(saved.status, 200); assert.ok(saved.body.completed.includes(id));
  const summary = await call('/summary', 'alice');
  assert.equal(summary.body.courses[0].total, LESSONS.fortigate.length + 1);
  catalogModules = [];
  assert.equal((await call('/progress/fortigate', 'alice', [id])).status, 400);
  assert.equal((await call('/progress/fortigate', 'alice')).body.completed.includes(id), false);
});
test('Academy fails visibly when the configured custom catalog is unavailable', async () => {
  catalogAvailable = false;
  try { assert.equal((await call('/summary', 'alice')).status, 503); }
  finally { catalogAvailable = true; }
});
