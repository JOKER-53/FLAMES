const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const { createApp } = require('../dist/app');
const { PlatformStore } = require('../dist/platform/store');
let upstream, lab, store, base, academyBase;
const savedEnv = { ...process.env };
const progress = new Map();
const drafts = new Map();
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
    if (!['alice-token', 'bob-token', 'admin-token', 'malformed-token'].includes(token)) return res.status(401).json({ message: 'Expired' });
    req.parentId = token === 'alice-token' ? 1 : token === 'admin-token' ? 3 : 2; next();
  });
  parent.get('/api/auth/me', (req, res) => req.headers.authorization==='Bearer malformed-token' ? res.json({user:{id:'',username:'Malformed admin',role:'admin'}}) : res.json({ user: { id: req.parentId, username: req.parentId === 1 ? 'Alice' : 'Bob', role: req.parentId === 3 ? 'admin' : 'operator' } }));
  parent.all('/api/integrations/fortisim/progress/:platform', (req, res) => {
    const key = `${req.parentId}:${req.params.platform}`;
    const ids = progress.get(key) || new Set();
    for (const id of req.body?.completed || []) ids.add(id);
    progress.set(key, ids); res.json({ completed: [...ids] });
  });
  parent.post('/api/integrations/fortisim/classroom/progress', (req,res) => {
    if(req.parentId!==3)return res.status(403).json({message:'Admin only'});
    res.json({progress:Object.fromEntries(req.body.userIds.map(id=>[id,{fortigate:[...(progress.get(`${id}:fortigate`)||[])],paloalto:[...(progress.get(`${id}:paloalto`)||[])]}]))});
  });
  parent.all('/api/integrations/fortisim/drafts/:platform/:id', (req, res) => {
    const key = `${req.parentId}:${req.params.platform}:${req.params.id}`;
    const current = drafts.get(key) || null;
    if (req.method === 'GET') return res.json({ draft: current });
    if ((current?.revision || 0) !== req.body.revision) return res.status(409).json({ message: 'Conflict' });
    const draft = { schemaVersion: 1, scenarioVersion: req.body.scenarioVersion, revision: req.body.revision + 1, config: req.body.config, updatedAt: Date.now() };
    drafts.set(key, draft); res.json({ draft });
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

test('Academy-mode simulator saves never create local account draft records', async () => {
  const response = await fetch(base + '/api/drafts/fortigate/routing-static-01', { method: 'PUT', headers: { Authorization: 'Bearer alice-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ ownerId: '1', schemaVersion: 1, scenarioVersion: '1', revision: 0, config: [] }) });
  assert.equal(response.status, 200);
  assert.equal((await (await fetch(base + '/api/drafts/fortigate/routing-static-01', { headers: { Authorization: 'Bearer bob-token' } })).json()).draft, null);
  assert.equal(store.simulatorDraft('1', 'fortigate', 'routing-static-01'), null);
});

test('Academy classroom uses parent identity/progress without creating local student records', async () => {
  const made=await call('/api/classroom/groups','admin-token',{name:'Academy lab group'});assert.equal(made.status,201);
  const teacher=await call('/api/classroom/','admin-token');const group=teacher.body.groups[0];
  assert.equal((await call('/api/classroom/join','alice-token',{code:group.inviteCode})).status,200);
  const assigned=await call(`/api/classroom/groups/${group.id}/assignments`,'admin-token',{vendor:'fortigate',moduleId:'policy',requiredCount:1,dueAt:new Date(Date.now()+86400000).toISOString()});assert.equal(assigned.status,201);
  const view=await call('/api/classroom/','admin-token');assert.equal(view.status,200);assert.equal(view.body.groups[0].assignments[0].results[0].status,'completed');
  assert.deepEqual((await call('/api/classroom/','bob-token')).body.groups,[]);
  assert.deepEqual(store.roster().map(user=>user.email),['local@example.org']); // Deliberate bypass fixture exists; no Academy accounts are copied.
  assert.deepEqual(store.progress('1','fortigate'),[]);
});

test('malformed parent identities fail closed before administrative access',async()=>{
 assert.equal((await call('/api/admin/modules','malformed-token')).status,502);
 const {academyIdentity}=require('../dist/integration/academy');
 for(const id of ['',0,-1,NaN,Infinity,{},[],'with spaces','x'.repeat(129)])assert.equal(academyIdentity({id,username:'Admin',role:'admin'}),null);
 assert.equal(academyIdentity({id:1,username:' ',role:'admin'}),null);assert.equal(academyIdentity(null),null);
 assert.equal(academyIdentity({id:1,username:'Admin',role:'admin'}).canManageContent,true);
 assert.equal(academyIdentity({id:1,username:'Admin',role:'admin',email:null}).email,'');
 assert.equal(academyIdentity({id:'u-1',username:'Student',role:'unknown'}).role,'student');
});
