const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
let server, catalogServer, base, LESSONS;
let catalogModules = []; let catalogAvailable = true;
const rows = new Map();
const drafts = new Map();
before(async () => {
  const { createFortisimRouter } = await import('../../../integrations/academy/fortisim.routes.mjs');
  ({ LESSONS } = await import('../../../integrations/academy/lesson-manifest.mjs'));
  const pool = { query: async (sql, values) => {
    if (sql.startsWith('SELECT user_id,platform,task_id')) return [[...values.flatMap(id => ['fortigate','paloalto'].flatMap(platform => [...(rows.get(`${id}:${platform}`) || [])].map(task_id => ({user_id:id,platform,task_id}))))]];
    if (sql.startsWith('SELECT * FROM fortisim_simulator_drafts')) return [[drafts.get(values.slice(0, 3).join(':'))].filter(Boolean)];
    if (sql.startsWith('INSERT IGNORE INTO fortisim_simulator_drafts')) {
      const key = values.slice(0, 3).join(':');
      if (!drafts.has(key)) drafts.set(key, { schema_version: 1, scenario_version: values[3], revision: 0, config_json: null, updated_at: values[4] });
      return [{}];
    }
    if (sql.startsWith('UPDATE fortisim_simulator_drafts')) {
      const key = values.slice(3, 6).join(':'); const row = drafts.get(key);
      if (!row || row.revision !== values[6]) return [{ affectedRows: 0 }];
      drafts.set(key, { schema_version: 1, scenario_version: values[0], revision: row.revision + 1, config_json: values[1], updated_at: values[2] });
      return [{ affectedRows: 1 }];
    }
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
    if (!['Bearer alice', 'Bearer bob', 'Bearer admin'].includes(req.headers.authorization)) return res.status(401).json({ message: 'Login required' });
    req.user = { id: req.headers.authorization === 'Bearer alice' ? 1 : req.headers.authorization === 'Bearer admin' ? 3 : 2, role: req.headers.authorization === 'Bearer admin' ? 'admin' : 'student' }; next();
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

async function draftCall(user, data) {
  const response = await fetch(base + '/drafts/fortigate/routing-static-01', { headers: { Authorization: `Bearer ${user}`, 'Content-Type': 'application/json' }, ...(data === undefined ? {} : { method: 'POST', body: JSON.stringify(data) }) });
  return { status: response.status, body: await response.json() };
}
test('Academy owns simulator drafts, isolates users, and enforces revisioned resets', async () => {
  const data = { ownerId: '1', schemaVersion: 1, scenarioVersion: '1', kind: 'routing', revision: 0, config: [] };
  assert.equal((await draftCall('alice')).body.draft, null);
  assert.equal((await draftCall('alice', data)).body.draft.revision, 1);
  assert.equal((await draftCall('bob')).body.draft, null);
  assert.equal((await draftCall('bob', data)).status, 403);
  assert.equal((await draftCall('alice', data)).status, 409);
  assert.equal((await draftCall('alice', { ...data, revision: 1, config: null })).body.draft.revision, 2);
  assert.equal((await draftCall('alice', { ...data, revision: 1 })).status, 409);
  assert.equal((await draftCall('alice', { ...data, revision: 2, config: [null] })).status, 400);
});
test('the generated Academy simulator contract matches engine kinds and configuration checks', async () => {
  const academy = await import('../../../integrations/academy/simulator-contract.mjs');
  const engine = require('../../engine/dist');
  for (const [platform, ids] of Object.entries(LESSONS)) for (const id of ids) {
    assert.deepEqual(academy.builtinDraftSpec(platform, id), engine.builtinDraftSpec(platform, id));
  }
  for (const kind of ['policy', 'interfaces', 'ports', 'routing', 'pan-security', 'pan-zones', 'pan-nat', 'pan-interfaces', 'pan-ports']) for (const value of [[], [null], {}, null, { addresses: [], services: [], policies: [], webFilterProfiles: [] }]) assert.equal(academy.isSimulatorConfiguration(kind, value), engine.isSimulatorConfiguration(kind, value));
});
test('Academy version-checks custom policy drafts against the published catalog', async () => {
  const id = 'custom-00000000-0000-0000-0000-000000000002';
  catalogModules = [{ vendor: 'fortigate', lessons: [{ id, kind: 'policy', scenarioVersion: 'published-v2' }] }];
  const send = async data => {
    const response = await fetch(base + `/drafts/fortigate/${id}`, { method: 'POST', headers: { Authorization: 'Bearer alice', 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return { status: response.status, body: await response.json() };
  };
  const data = { ownerId: '1', schemaVersion: 1, scenarioVersion: 'published-v2', kind: 'policy', revision: 0, config: { addresses: [], services: [], policies: [], webFilterProfiles: [] } };
  try {
    assert.equal((await send(data)).status, 200);
    catalogModules[0].lessons[0].scenarioVersion = 'published-v3';
    assert.equal((await send({ ...data, revision: 1 })).status, 400);
  } finally { catalogModules = []; }
});

test('Academy classroom progress is admin-only, validated and isolated to requested IDs', async () => {
  const send = async (user, userIds) => {
    const response=await fetch(base+'/classroom/progress',{method:'POST',headers:{Authorization:`Bearer ${user}`,'Content-Type':'application/json'},body:JSON.stringify({userIds})});return {status:response.status,body:await response.json()};
  };
  assert.equal((await send('alice',['1'])).status,403);
  assert.equal((await send('admin',['1 OR 1=1'])).status,400);
  assert.equal((await send('admin',Array(501).fill('1'))).status,400);
  const result=await send('admin',['1','2']);assert.equal(result.status,200);
  assert.ok(result.body.progress['1'].fortigate.includes('web-server-access-01')); // Assignment reports also retain previously earned archived custom credit.
  assert.deepEqual(result.body.progress['2'].fortigate,[]);
  assert.deepEqual(Object.keys((await send('admin',['2'])).body.progress),['2']);
});

test('Academy retains archived custom lesson credit for assignment reports while current course totals stay filtered',async()=>{
 const id='custom-00000000-0000-0000-0000-000000000099';
 catalogModules=[{vendor:'fortigate',lessons:[{id}]}];await call('/progress/fortigate','alice',[id]);catalogModules=[];
 assert.equal((await call('/progress/fortigate','alice')).body.completed.includes(id),false);
 assert.equal((await call('/progress/fortigate?includeArchived=true','alice')).body.completed.includes(id),true);
 const response=await fetch(base+'/classroom/progress',{method:'POST',headers:{Authorization:'Bearer admin','Content-Type':'application/json'},body:JSON.stringify({userIds:['1']})});
 assert.equal((await response.json()).progress['1'].fortigate.includes(id),true);
});

test('Academy drafts recognize published configuration families for both vendors',async()=>{
 const cases=[['fortigate','interfaces',[{name:'wan1',role:'WAN',ip:'',subnet:'',adminAccess:[]}]],['fortigate','routing',[]],['paloalto','pan-security',[]],['paloalto','pan-nat',[]],['paloalto','pan-zones',[]]];
 try{for(let i=0;i<cases.length;i++){
  const [vendor,family,config]=cases[i];const id=`custom-00000000-0000-0000-0000-${String(200+i).padStart(12,'0')}`;catalogModules=[{vendor,lessons:[{id,kind:'configuration',simulatorFamily:family,scenarioVersion:'cfg-1'}]}];
  const response=await fetch(base+`/drafts/${vendor}/${id}`,{method:'POST',headers:{Authorization:'Bearer alice','Content-Type':'application/json'},body:JSON.stringify({ownerId:'1',schemaVersion:1,scenarioVersion:'cfg-1',revision:0,kind:family,config})});assert.equal(response.status,200);assert.deepEqual((await response.json()).draft.config,config);
 }}finally{catalogModules=[];}
});
