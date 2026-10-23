const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const { createApp } = require('../dist/app');
const { PlatformStore } = require('../dist/platform/store');
let upstream, lab, store, base, academyBase;
const savedEnv = { ...process.env };
const progress = new Map();
let upstreamCalls = 0;
async function call(path, token, data, cookie) {
  const response = await fetch(base + path, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(cookie ? { Cookie: cookie } : {}), 'Content-Type': 'application/json' },
    ...(data === undefined ? {} : { method: 'POST', body: JSON.stringify(data) }),
  });
  return { status: response.status, body: await response.json() };
}
before(async () => {
  const parent = express(); parent.use(express.json());
  parent.use('/api', (req, res, next) => {
    upstreamCalls++;
    const token = req.headers.authorization?.slice(7);
    if (!['alice-token', 'bob-token', 'admin-token'].includes(token)) return res.status(401).json({ message: 'Expired' });
    req.parentId = token === 'alice-token' ? 1 : token === 'admin-token' ? 3 : 2; next();
  });
  parent.get('/api/auth/me', (req, res) => res.json({ user: { id: req.parentId, username: req.parentId === 1 ? 'Alice' : 'Bob', role: req.parentId === 3 ? 'admin' : 'operator' } }));
  parent.all('/api/integrations/fortisim/progress/:platform', (req, res) => {
    const key = `${req.parentId}:${req.params.platform}`;
    const ids = progress.get(key) || new Set();
    for (const id of req.body?.completed || []) ids.add(id);
    progress.set(key, ids); res.json({ completed: [...ids] });
  });
  upstream = parent.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  academyBase = `http://127.0.0.1:${upstream.address().port}/api`;
  process.env.PLATFORM_MODE = 'academy'; process.env.ACADEMY_ORIGIN = 'http://academy.example:5173'; process.env.ACADEMY_API_URL = academyBase;
  store = new PlatformStore(':memory:');
  lab = createApp(store).listen(0, '127.0.0.1'); await once(lab, 'listening');
  base = `http://127.0.0.1:${lab.address().port}`;
});
after(async () => {
  await Promise.all([lab, upstream].filter(Boolean).map(server => new Promise(resolve => server.close(resolve))));
  store?.close(); process.env = savedEnv;
});
test('runtime configuration identifies Academy without exposing backend URL or secrets', async () => {
  const result = await call('/api/integration/config');
  assert.equal(result.body.mode, 'academy'); assert.equal(result.body.parentOrigin, 'http://academy.example:5173');
  assert.equal(JSON.stringify(result.body).includes(academyBase), false);
});
test('Academy validates identity; local sessions cannot bypass parent authentication', async () => {
  assert.equal((await call('/api/account/session')).body.user, null);
  const local = store.createUser('local@example.org', 'Local', 'unused'); store.createSession(local.id, 'local-token', Date.now() + 60000);
  assert.equal((await call('/api/scenarios/web-server-access-01', undefined, undefined, 'fortisim_session=local-token')).status, 401);
  assert.equal((await call('/api/account/session', 'expired')).status, 401);
  const alice = await call('/api/account/session', 'alice-token');
  assert.equal(alice.body.user.name, 'Alice'); assert.equal(alice.body.registrationEnabled, false);
});
test('completion is stored only in Academy and remains isolated by parent identity', async () => {
  assert.equal((await call('/api/account/progress/fortigate', 'alice-token', { completed: ['web-server-access-01'] })).status, 200);
  assert.deepEqual((await call('/api/account/progress/fortigate', 'alice-token')).body.completed, ['web-server-access-01']);
  assert.deepEqual((await call('/api/account/progress/fortigate', 'bob-token')).body.completed, []);
  assert.deepEqual(store.progress('1', 'fortigate'), []);
  assert.equal((await call('/api/account/progress/fortigate', 'alice-token', { completed: ['pan-sec-01'] })).status, 400);
  assert.equal((await call('/api/account/login', 'alice-token', {})).status, 409);
});
test('missing or malformed credentials do not reach the parent API', async () => {
  const before = upstreamCalls;
  assert.equal((await call('/api/account/progress/fortigate')).status, 401);
  assert.equal((await call('/api/account/progress/fortigate', 'bad token')).status, 401);
  assert.equal(upstreamCalls, before);
});
test('parent outages fail closed without falling back to local progress', async () => {
  const old = process.env.ACADEMY_API_URL; process.env.ACADEMY_API_URL = 'http://127.0.0.1:1/api';
  try { assert.equal((await call('/api/account/session', 'alice-token')).status, 503); }
  finally { process.env.ACADEMY_API_URL = old; }
});

test('only a verified Academy admin can author FLAMES content', async () => {
  assert.equal((await call('/api/admin/modules', 'alice-token')).status, 403);
  const admin = await call('/api/account/session', 'admin-token');
  assert.equal(admin.body.user.canManageContent, true);
  assert.equal((await call('/api/admin/modules', 'admin-token', { vendor: 'paloalto', title: 'Academy-admin module' })).status, 201);
});
