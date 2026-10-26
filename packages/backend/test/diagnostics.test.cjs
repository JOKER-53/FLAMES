const {test}=require('node:test');const assert=require('node:assert/strict');const {DatabaseSync}=require('node:sqlite');const {once}=require('node:events');
const {migrate,schemaStatus}=require('../dist/db/migrations');const {createApp}=require('../dist/app');const {Diagnostics}=require('../dist/diagnostics');const {PlatformStore}=require('../dist/platform/store');const {ContentStore}=require('../dist/content/store');
test('migrations adopt legacy data, are idempotent, reject tampering/future versions, and roll back failed DDL',()=>{
 const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE sample(id INTEGER);INSERT INTO sample VALUES(42)");const baseline={version:1,name:'Adopt',sql:'CREATE TABLE IF NOT EXISTS sample(id INTEGER)'};
 migrate(db,'test',[baseline]);migrate(db,'test',[baseline]);assert.equal(schemaStatus(db).length,1);assert.equal(db.prepare('SELECT id FROM sample').get().id,42);
 assert.throws(()=>migrate(db,'test',[{...baseline,sql:baseline.sql+';'}]),/checksum/);
 assert.throws(()=>migrate(db,'test',[]),/newer/);
 assert.throws(()=>migrate(db,'test',[baseline,{version:2,name:'Broken',sql:'CREATE TABLE pending(id INTEGER); INVALID SQL'}]));assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name='pending'").get(),undefined);assert.equal(schemaStatus(db).length,1);db.close();
});
test('request IDs, private diagnostics, and rate-limit logs exclude identity, body, query, and secrets',async()=>{
 const saved={...process.env};process.env.PLATFORM_MODE='standalone';process.env.AUTH_REQUIRED='false';const accounts=new PlatformStore(':memory:'),content=new ContentStore(':memory:'),logs=[];const admin=accounts.createUser('a@example.invalid','Admin','unused','instructor');accounts.createSession(admin.id,'private-token',Date.now()+60000);const server=createApp(accounts,content,new Diagnostics(entry=>logs.push(entry))).listen(0);await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;
 try{
  assert.equal((await fetch(base+'/api/admin/diagnostics')).status,401);
  let response=await fetch(base+'/api/admin/diagnostics',{headers:{Cookie:'fortisim_session=private-token'}});const report=await response.json();assert.deepEqual([...new Set(report.schemas.map(row=>row.component))],['platform','classroom','content']);
  content.catalog=()=>{throw new Error('SECRET password bearer private-token')};response=await fetch(base+'/api/content/catalog?token=SECRET');const error=await response.json();assert.equal(response.status,500);assert.match(error.requestId,/^[a-f0-9-]{36}$/);assert.equal(response.headers.get('x-request-id'),error.requestId);
  for(let i=0;i<21;i++)response=await fetch(base+'/api/knowledge-check/not-a-task');assert.equal(response.status,429);assert.ok(Number(response.headers.get('retry-after'))>0);
  await new Promise(resolve=>setTimeout(resolve,10));assert.ok(logs.some(entry=>entry.event==='rate_limit'));assert.ok(logs.some(entry=>entry.event==='api_error'));assert.doesNotMatch(JSON.stringify(logs),/SECRET|private-token|a@example|password/);
 }finally{await new Promise(resolve=>server.close(resolve));accounts.close();content.close();process.env=saved;}
});
