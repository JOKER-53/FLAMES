const test=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const {createApp}=require('../dist/app');
const {PlatformStore}=require('../dist/platform/store');
const {ContentStore}=require('../dist/content/store');
const {assignmentModules}=require('../dist/classroom/modules');
const {PRACTICE_TASKS,builtinDraftSpec}=require('@fortisim/engine');

test('operations modules preserve classroom scopes, draft support, and progress validation',()=>{
 const content=new ContentStore(':memory:');const accounts=new PlatformStore(':memory:');
 try {
  const modules=assignmentModules(content);
  assert.equal(modules.find(m=>m.vendor==='fortigate'&&m.id==='policy').lessons.length,11);
  assert.equal(modules.find(m=>m.vendor==='paloalto'&&m.id==='security').lessons.length,6);
  const user=accounts.createUser('learner@example.invalid','Learner','unused','student');
  for (const vendor of ['fortigate','paloalto']) {
   assert.deepEqual(modules.find(m=>m.vendor===vendor&&m.id==='practice').lessons.map(l=>l.id),PRACTICE_TASKS[vendor]);
   for (const id of PRACTICE_TASKS[vendor]) assert.equal(builtinDraftSpec(vendor,id).kind,vendor==='fortigate'?'policy':'pan-security');
   const progress=accounts.mergeProgress(user.id,vendor,PRACTICE_TASKS[vendor]);
   assert.deepEqual(new Set(progress),new Set(PRACTICE_TASKS[vendor]));
  }
 } finally {content.close();accounts.close();}
});
test('new policy scenarios strip private outcomes and new knowledge checks work without AI',async()=>{
 Object.assign(process.env,{PLATFORM_MODE:'standalone',AUTH_REQUIRED:'false',LLM_API_KEY:'',NVIDIA_NIM_API_KEY:'',OPENAI_API_KEY:'',OPENAI_BASE_URL:'',LLM_BASE_URL:''});
 const accounts=new PlatformStore(':memory:');const content=new ContentStore(':memory:');const server=createApp(accounts,content).listen(0);await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;
 try {
  for (const id of PRACTICE_TASKS.fortigate) {
   const response=await fetch(base+'/api/scenarios/'+id);assert.equal(response.status,200);const scenario=await response.json();assert.ok(scenario.testPackets.length>=4);assert.equal(scenario.expectedOutcomes,undefined);assert.equal(scenario.referenceConfig,undefined);
   const check=await fetch(base+'/api/knowledge-check/'+id);assert.equal(check.status,200);const question=await check.json();assert.equal(question.source,'bank');assert.equal(question.correctIndex,undefined);
  }
  for (const id of PRACTICE_TASKS.paloalto) {
   const response=await fetch(base+'/api/pan/knowledge-check/'+id);assert.equal(response.status,200);const question=await response.json();assert.equal(question.source,'bank');assert.equal(question.correctIndex,undefined);assert.equal(question.choices.length,4);
  }
 } finally {await new Promise(resolve=>server.close(resolve));accounts.close();content.close();}
});
