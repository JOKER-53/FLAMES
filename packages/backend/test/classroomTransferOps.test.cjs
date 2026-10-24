const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { randomUUID } = require('node:crypto');
const { mkdtempSync, rmSync, readFileSync, writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { tmpdir } = require('node:os');
const { spawnSync } = require('node:child_process');
const { createApp } = require('../dist/app');
const { PlatformStore } = require('../dist/platform/store');
const { ContentStore } = require('../dist/content/store');
const { assignmentStatus } = require('../dist/classroom/store');
const { learningHints } = require('../../engine/dist');
const { hashPassword, verifyPassword } = require('../dist/platform/auth');
let accounts, content, server, base, groupId, invitation, assignmentId, alice, draft;
const original={...process.env};
async function call(path,who='teacher',body){const response=await fetch(base+path,{headers:{'Content-Type':'application/json',...(who?{Cookie:`fortisim_session=${who}`}:{})},...(body===undefined?{}:{method:'POST',body:JSON.stringify(body)})});return{status:response.status,body:await response.json()};}
before(async()=>{
 process.env.PLATFORM_MODE='standalone';process.env.AUTH_REQUIRED='false';
 accounts=new PlatformStore(':memory:');content=new ContentStore(':memory:');
 for(const who of ['teacher','other','alice','bob']){const user=accounts.createUser(`${who}@test.invalid`,who,'unused',/teacher|other/.test(who)?'instructor':'student');accounts.createSession(user.id,who,Date.now()+600000);if(who==='alice')alice=user;}
 server=createApp(accounts,content).listen(0,'127.0.0.1');await once(server,'listening');base=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{await new Promise(r=>server.close(r));accounts.close();content.close();process.env=original;});
test('classrooms require login, scope ownership, and enroll only authenticated student identities',async()=>{
 assert.equal((await call('/api/classroom/',null)).status,401);
 assert.equal((await call('/api/classroom/groups','alice',{name:'Unauthorized'})).status,403);
 groupId=(await call('/api/classroom/groups','teacher',{name:'Section A'})).body.id;
 const groups=(await call('/api/classroom/')).body.groups;invitation=groups[0].inviteCode;
 assert.equal((await call('/api/classroom/','other')).body.groups.length,0);
 assert.equal((await call(`/api/classroom/groups/${groupId}/rotate-invite`,'other',{})).status,404);
 assert.equal((await call('/api/classroom/join','alice',{code:invitation,userId:'bob'})).status,200);
 assert.equal((await call('/api/classroom/join','alice',{code:invitation})).status,200);
 assert.equal((await call('/api/classroom/')).body.groups[0].members.length,1);
 const student=(await call('/api/classroom/','alice')).body.groups[0];assert.equal(student.inviteCode,undefined);assert.deepEqual(student.members,[]);
 assert.deepEqual((await call('/api/account/classroom','other')).body.students,[]);
 assert.equal((await call('/api/account/classroom')).body.students[0].id,alice.id);
});
test('assignments snapshot modules, validate requirements and show assigned/started/completed/overdue',async()=>{
 const path=`/api/classroom/groups/${groupId}/assignments`;
 const data={vendor:'fortigate',moduleId:'policy',requiredCount:2,dueAt:new Date(Date.now()+86400000).toISOString()};
 assert.equal((await call(path,'other',data)).status,404);
 assert.equal((await call(path,'teacher',{...data,moduleId:'missing'})).status,400);
 assert.equal((await call(path,'teacher',{...data,requiredCount:1000})).status,400);
 assert.equal((await call(path,'teacher',{...data,dueAt:'yesterday'})).status,400);
 assignmentId=(await call(path,'teacher',data)).body.id;
 let assignment=(await call('/api/classroom/')).body.groups[0].assignments[0];assert.equal(assignment.results[0].status,'assigned');assert.equal(assignment.lessonIds.length,11);
 assert.equal((await call(`/api/classroom/assignments/${assignmentId}/start`,'bob',{})).status,404);
 assert.equal((await call(`/api/classroom/assignments/${assignmentId}/start`,'alice',{})).status,200);
 assert.equal((await call('/api/classroom/','alice')).body.groups[0].assignments[0].results[0].status,'started');
 accounts.mergeProgress(alice.id,'fortigate',['web-server-access-01','db-lockdown-01']);
 assignment=(await call('/api/classroom/')).body.groups[0].assignments[0];assert.equal(assignment.results[0].status,'completed');assert.equal(assignment.results[0].completed,2);
 assert.equal(assignmentStatus({...assignment,dueAt:1},[],false).status,'overdue');
 assert.equal(assignmentStatus({...assignment,dueAt:1},assignment.lessonIds,false).status,'completed');
 assert.deepEqual((await call('/api/classroom/','bob')).body.groups,[]);
});
test('invitation rotation and removal revoke roster and assignment access',async()=>{
 await call(`/api/classroom/groups/${groupId}/rotate-invite`,'teacher',{});
 assert.equal((await call('/api/classroom/join','bob',{code:invitation})).status,404);
 assert.equal((await call(`/api/classroom/groups/${groupId}/remove-member`,'other',{userId:alice.id})).status,404);
 await call(`/api/classroom/groups/${groupId}/remove-member`,'teacher',{userId:alice.id});
 assert.deepEqual((await call('/api/classroom/','alice')).body.groups,[]);
 assert.equal((await call(`/api/classroom/assignments/${assignmentId}/start`,'alice',{})).status,404);
 assert.deepEqual((await call('/api/account/classroom')).body.students,[]);
});
test('content transfer is administrator-only, versioned, draft-only and remaps all progress identities',async()=>{
 draft=content.create('fortigate','Transfer lab');
 draft.module.lessons=[{id:`custom-${randomUUID()}`,title:'Read safely',summary:'',body:'<script>alert(1)</script> https://example.invalid',minutes:5,level:'Foundation',tasks:[{id:`task-${randomUUID()}`,type:'answer',prompt:'Which concept?',choices:[],correctIndex:-1,acceptedAnswers:['first match']}]}];
 draft=content.save(draft.module.id,draft.module,draft.revision);draft=content.publish(draft.module.id,draft.revision);
 assert.equal((await call(`/api/admin/modules/${draft.module.id}/export`,'alice')).status,403);
 const exported=(await call(`/api/admin/modules/${draft.module.id}/export`)).body;
 assert.equal(exported.module.lessons[0].tasks[0].acceptedAnswers[0],'first match');
 assert.equal((await call('/api/admin/imports/preview','teacher',{...exported,schemaVersion:99})).status,400);
 assert.equal((await call('/api/admin/imports/preview','teacher',{...exported,assets:'remote'})).status,400);
 assert.equal((await call('/api/admin/imports/preview','alice',exported)).status,403);
 const preview=await call('/api/admin/imports/preview','teacher',exported);assert.equal(preview.body.lessonCount,1);
 const imported=(await call('/api/admin/imports','teacher',exported)).body;
 assert.equal(imported.publishedAt,null);assert.notEqual(imported.module.id,draft.module.id);
 assert.notEqual(imported.module.lessons[0].id,draft.module.lessons[0].id);assert.notEqual(imported.module.lessons[0].tasks[0].id,draft.module.lessons[0].tasks[0].id);
 assert.deepEqual(imported.module.lessons[0].tasks[0].acceptedAnswers,['first match']);
 assert.equal((await call(`/api/content/lessons/${imported.module.lessons[0].id}`,'alice')).status,404);
 const published=content.publish(imported.module.id,imported.revision);
 assert.equal(content.grade(published.module.lessons[0].id,[{taskId:published.module.lessons[0].tasks[0].id,value:'FIRST MATCH'}]).overallPassed,true);
 assert.equal(accounts.progress(alice.id,'fortigate').includes(published.module.lessons[0].id),false);
});
test('targeted concept hints cover common mistakes without expected values or answer disclosure',()=>{
 for(const [failure,concept] of [['Shadowed broad rule','Rule order'],['CIDR overlap','Address scope'],['TCP service','Services and ports'],['Translation type','NAT mapping'],['Gateway distance','Route selection'],['Zone type','Zone ownership'],['Logging check','Traffic logging'],['Management protocol','Management exposure']]){
  const hint=learningHints('policy',[failure]);assert.ok(hint.some(h=>h.concept===concept));assert.doesNotMatch(JSON.stringify(hint),/192\.168|443|correct value|ACCEPT|DENY/);
 }
 assert.equal(learningHints('pan-nat',[])[0].concept,'NAT mapping');
});
test('password recovery preserves identity and progress but revokes all sessions',async()=>{
 const store=new PlatformStore(':memory:');
 try {const user=store.createUser('admin@test.invalid','Admin',await hashPassword('admin123'),'instructor');store.createSession(user.id,'old',Date.now()+60000);store.mergeProgress(user.id,'fortigate',['web-server-access-01']);
 store.rotateInstructorPassword(user.email,await hashPassword('a-long-recovery-password'));
 assert.equal(store.session('old'),undefined);assert.equal(await verifyPassword('a-long-recovery-password',store.findEmail(user.email).password),true);
 assert.deepEqual(store.progress(user.id,'fortigate'),['web-server-access-01']);assert.throws(()=>store.rotateInstructorPassword('missing@test.invalid','hash'));
 } finally{store.close();}
});
test('backup includes committed WAL data, restores in isolation and rejects tampering/overwrite',()=>{
 const temp=mkdtempSync(join(tmpdir(),'flames-backup-'));const source=join(temp,'source');require('node:fs').mkdirSync(source);
 const account=new PlatformStore(join(source,'fortisim.sqlite'));const contents=new ContentStore(join(source,'content.sqlite'));const user=account.createUser('test@test.invalid','Student','hash');account.mergeProgress(user.id,'fortigate',['web-server-access-01']);contents.create('fortigate','Keep my draft');
 const script=resolve('../../scripts/data-backup.cjs');const backup=join(temp,'backup'),target=join(temp,'restored');
 const run=(...args)=>spawnSync(process.execPath,[script,...args],{encoding:'utf8'});
 try {
  assert.equal(run('backup','--source-dir',source,'--output',backup).status,0);
  assert.equal(run('restore','--backup',backup,'--target-dir',target).status,0);
  const restored=new PlatformStore(join(target,'fortisim.sqlite'));assert.deepEqual(restored.progress(user.id,'fortigate'),['web-server-access-01']);restored.close();
  const restoredContent=new ContentStore(join(target,'content.sqlite'));assert.equal(restoredContent.list()[0].title,'Keep my draft');restoredContent.close();
  assert.notEqual(run('restore','--backup',backup,'--target-dir',target).status,0);
  const manifest=JSON.parse(readFileSync(join(backup,'manifest.json'),'utf8'));manifest.files[0].sha256='0'.repeat(64);writeFileSync(join(backup,'manifest.json'),JSON.stringify(manifest));
  assert.notEqual(run('restore','--backup',backup,'--target-dir',join(temp,'tampered')).status,0);
 }finally{account.close();contents.close();rmSync(temp,{recursive:true,force:true});}
});

test('production startup rejects the checking administrator password in an existing database', async()=>{
 const temp=mkdtempSync(join(tmpdir(),'flames-production-guard-'));const path=join(temp,'fortisim.sqlite');const store=new PlatformStore(path);
 store.createUser('checking@test.invalid','Checking',await hashPassword('admin123'),'instructor');store.close();
 try {
  const result=spawnSync(process.execPath,[resolve('dist/server.js')],{cwd:temp,encoding:'utf8',timeout:5000,env:{...process.env,NODE_ENV:'production',PLATFORM_MODE:'standalone',DATABASE_PATH:path,CONTENT_DATABASE_PATH:join(temp,'content.sqlite'),INSTRUCTOR_EMAIL:'',INSTRUCTOR_PASSWORD:''}});
  assert.equal(result.status,1);assert.match(result.stderr,/checking-only administrator password must be rotated/);
 }finally{rmSync(temp,{recursive:true,force:true});}
});
