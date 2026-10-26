const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { once } = require('node:events');
const { createApp } = require('../dist/app');
const { PlatformStore } = require('../dist/platform/store');
const { ContentStore } = require('../dist/content/store');
let accounts, content, server, base, aliceId, admin, custom, version;
const original = { ...process.env };
const matrix = [
 ['fortigate','web-server-access-01','policy',{addresses:[],services:[],policies:[],webFilterProfiles:[]}],
 ['fortigate','interface-ip-01','interfaces',[{name:'wan1',role:'WAN',ip:'10.0.0.2',subnet:'24',adminAccess:['PING']}]],
 ['fortigate','port-assignment-01','ports',[{portId:'port1',zone:'WAN',label:'P1'}]],
 ['fortigate','routing-static-01','routing',[{id:'route1',destination:'0.0.0.0/0',gateway:'192.168.1.254',interfaceName:'port1',distance:10}]],
 ['paloalto','pan-sec-01','pan-security',[{id:1,name:'Web',srcZone:'Trust',dstZone:'Untrust',apps:['ssl'],action:'allow'}]],
 ['paloalto','pan-zone-01','pan-zones',[{id:1,name:'Trust',type:'layer3',profile:'none',interfaces:['ethernet1/2'],logForwarding:false}]],
 ['paloalto','pan-nat-01','pan-nat',[{id:1,name:'SNAT',type:'source',srcZone:'Trust',dstZone:'Untrust',dstAddr:'any',translated:'interface'}]],
 ['paloalto','pan-iface-01','pan-interfaces',[{id:'ethernet1/1',type:'layer3',zone:'Untrust',ip:'203.0.113.1/30',link:true,speed:'1G',comment:''}]],
 ['paloalto','pan-port-01','pan-ports',[{id:'ethernet1/1',zone:'Untrust',label:'eth1/1'}]],
];
function exercise() {
 const reference = {id:'allow',name:'Permit HTTPS',srcIntf:'WAN',dstIntf:'DMZ',srcAddrIds:['all'],dstAddrIds:['web'],serviceIds:['https'],action:'ACCEPT',log:true,enabled:true};
 return {schemaVersion:1,starterAddresses:[{id:'all',name:'All',type:'subnet',value:'0.0.0.0/0'},{id:'web',name:'Web',type:'subnet',value:'10.0.2.10/32'}],starterServices:[{id:'https',name:'HTTPS',protocol:'TCP',port:'443'}],starterWebFilterProfiles:[],starterPolicies:[],testPackets:[{id:'good',description:'Allow HTTPS',srcIntf:'WAN',dstIntf:'DMZ',srcIp:'203.0.113.5',dstIp:'10.0.2.10',protocol:'TCP',port:443},{id:'bad',description:'Deny HTTP',srcIntf:'WAN',dstIntf:'DMZ',srcIp:'203.0.113.5',dstIp:'10.0.2.10',protocol:'TCP',port:80}],expectedOutcomes:[{testPacketId:'good',expectedAction:'ACCEPT',expectedLog:true},{testPacketId:'bad',expectedAction:'DENY'}],referencePolicies:[reference]};
}
async function call(path, method='GET', body, who='alice') {
 const res=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(who?{Cookie:`fortisim_session=${who}-token`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {status:res.status,body:await res.json()};
}
before(async()=>{
 process.env.PLATFORM_MODE='standalone';process.env.AUTH_REQUIRED='false';
 accounts=new PlatformStore(':memory:');content=new ContentStore(':memory:');
 for(const who of ['alice','bob','admin']){const u=accounts.createUser(`${who}@test.invalid`,who,'unused',who==='admin'?'instructor':'student');accounts.createSession(u.id,`${who}-token`,Date.now()+600000);if(who==='alice')aliceId=u.id;}
 server=createApp(accounts,content).listen(0,'127.0.0.1');await once(server,'listening');base=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{if(server)await new Promise(r=>server.close(r));accounts?.close();content?.close();process.env=original;});
test('all nine simulator configuration families save and restore by account and lesson',async()=>{
 for(const [platform,id,kind,config] of matrix){const path=`/api/drafts/${platform}/${id}`;const first=await call(path);assert.equal(first.body.spec.kind,kind);assert.equal(first.body.draft,null);const saved=await call(path,'PUT',{ownerId:aliceId,schemaVersion:1,scenarioVersion:'1',revision:0,config});assert.equal(saved.status,200);assert.deepEqual((await call(path)).body.draft.config,config);assert.equal((await call(path,'GET',undefined,'bob')).body.draft,null);}
});
test('drafts require auth, validate shapes, and reject writes begun under another identity',async()=>{
 const path='/api/drafts/fortigate/routing-static-01';
 assert.equal((await call(path,'GET',undefined,null)).status,401);
 assert.equal((await call(path,'PUT',{ownerId:aliceId,schemaVersion:1,scenarioVersion:'1',revision:0,config:[]},'bob')).status,403);
 assert.equal((await call(path,'PUT',{ownerId:aliceId,schemaVersion:1,scenarioVersion:'1',revision:1,config:[null]})).status,400);
 assert.equal((await call('/api/drafts/paloalto/web-server-access-01')).status,404);
});
test('compare-and-swap catches stale tabs; reset tombstones prevent deleted drafts returning',async()=>{
 const path='/api/drafts/fortigate/routing-static-01';const data={ownerId:aliceId,schemaVersion:1,scenarioVersion:'1',revision:1,config:[]};
 assert.equal((await call(path,'PUT',data)).status,200);
 assert.equal((await call(path,'PUT',data)).status,409);
 const reset=await call(path,'DELETE',{...data,revision:2});assert.equal(reset.status,200);assert.equal(reset.body.draft.config,null);assert.equal(reset.body.draft.revision,3);
 assert.equal((await call(path,'PUT',{...data,revision:2})).status,409);
 assert.equal((await call('/api/drafts/fortigate/interface-ip-01')).body.draft.revision,1);
});
test('a visual policy exercise validates its reference before publishing and keeps keys private',async()=>{
 const made=await call('/api/admin/modules','POST',{vendor:'fortigate',title:'Visual lab'},'admin');admin=made.body;
 custom=`custom-${randomUUID()}`;admin.module.lessons=[{id:custom,kind:'policy',title:'Custom HTTPS',summary:'Packet exercise',minutes:15,level:'Foundation',body:'Allow HTTPS, block HTTP, and log the allowed traffic.',tasks:[],policyExercise:exercise()}];
 admin=(await call(`/api/admin/modules/${admin.module.id}`,'PUT',{module:admin.module,revision:admin.revision},'admin')).body;
 assert.equal((await call(`/api/scenarios/${custom}`)).status,404);
 const validation=await call('/api/admin/validate-policy','POST',{exercise:exercise()},'admin');assert.equal(validation.body.overallPassed,true);
 assert.equal((await call('/api/admin/validate-policy','POST',{exercise:exercise()})).status,403);
 admin=(await call(`/api/admin/modules/${admin.module.id}/publish`,'POST',{revision:admin.revision},'admin')).body;
 const scenario=(await call(`/api/scenarios/${custom}`)).body;version=scenario.version;
 const publicData=JSON.stringify(scenario)+JSON.stringify((await call('/api/content/catalog')).body)+JSON.stringify((await call(`/api/content/lessons/${custom}`)).body);
 for(const secret of ['referencePolicies','expectedOutcomes','policyExercise','expectedAction','expectedLog'])assert.equal(publicData.includes(secret),false);
 assert.equal(scenario.testPackets.length,2);assert.equal(scenario.starterPolicies.length,0);
 const config={scenarioId:custom,addresses:scenario.starterAddresses,services:scenario.starterServices,webFilterProfiles:[],policies:exercise().referencePolicies};
 assert.equal((await call(`/api/submissions/${custom}/grade`,'POST',{...config,policies:[]})).body.overallPassed,false);
 const correct=await call(`/api/submissions/${custom}/grade`,'POST',config);assert.equal(correct.body.overallPassed,true);assert.equal(JSON.stringify(correct.body).includes('expectedAction'),false);
 assert.equal((await call('/api/account/progress/fortigate','POST',{completed:[custom]})).status,200);
});
test('invalid references, dangling objects, and happy-path-only exercises cannot publish',async()=>{
 for(const mutate of [e=>{e.referencePolicies[0].serviceIds=[]},e=>{e.referencePolicies[0].dstAddrIds=['missing']},e=>{e.testPackets=e.testPackets.slice(0,1);e.expectedOutcomes=e.expectedOutcomes.slice(0,1)},e=>{e.starterAddresses[1].value='999.0.0.1/24'}]){const e=exercise();mutate(e);assert.throws(()=>require('../dist/content/policyExercise').validatePolicyExercise(e,true));}
 const bad=exercise();bad.referencePolicies[0].serviceIds=[];const report=await call('/api/admin/validate-policy','POST',{exercise:bad},'admin');assert.equal(report.status,200);assert.equal(report.body.overallPassed,false);
});
test('republished exercise changes invalidate old drafts without overwriting their configuration',async()=>{
 const path=`/api/drafts/fortigate/${custom}`;const config={addresses:exercise().starterAddresses,services:exercise().starterServices,webFilterProfiles:[],policies:[]};
 assert.equal((await call(path,'PUT',{ownerId:aliceId,schemaVersion:1,scenarioVersion:version,revision:0,config})).status,200);
 admin.module.lessons[0].policyExercise.testPackets[0].description='Updated HTTPS check';
 admin=(await call(`/api/admin/modules/${admin.module.id}`,'PUT',{module:admin.module,revision:admin.revision},'admin')).body;
 admin=(await call(`/api/admin/modules/${admin.module.id}/publish`,'POST',{revision:admin.revision},'admin')).body;
 const loaded=await call(path);assert.notEqual(loaded.body.spec.scenarioVersion,version);assert.equal(loaded.body.draft.scenarioVersion,version);assert.deepEqual(loaded.body.draft.config,config);
 assert.equal((await call(path,'PUT',{ownerId:aliceId,schemaVersion:1,scenarioVersion:version,revision:1,config})).status,409);
});
test('simultaneous writes have exactly one winner and stale-owner reads fail closed', async()=>{
 const path='/api/drafts/fortigate/routing-static-01';const current=(await call(path)).body.draft;
 const payload={ownerId:aliceId,schemaVersion:1,scenarioVersion:'1',revision:current.revision,config:[]};
 const results=await Promise.all([call(path,'PUT',payload),call(path,'PUT',payload)]);
 assert.deepEqual(results.map(result=>result.status).sort(),[200,409]);
 const read=await fetch(base+path,{headers:{Cookie:'fortisim_session=bob-token','X-Flames-Draft-Owner':aliceId}});
 assert.equal(read.status,403);
});
test('configuration drafts survive SQLite restart and resetting them leaves completion intact',()=>{
 const {mkdtempSync,rmSync}=require('node:fs');const {tmpdir}=require('node:os');const {join}=require('node:path');const dir=mkdtempSync(join(tmpdir(),'flames-config-'));let store;
 try {
  const filename=join(dir,'accounts.sqlite');store=new PlatformStore(filename);const user=store.createUser('saved@test.invalid','Saved','unused');
  store.saveSimulatorDraft(user.id,'fortigate','routing-static-01','1',matrix[3][3],0);store.mergeProgress(user.id,'fortigate',['routing-static-01']);store.close();store=new PlatformStore(filename);
  assert.deepEqual(store.simulatorDraft(user.id,'fortigate','routing-static-01').config,matrix[3][3]);
  store.saveSimulatorDraft(user.id,'fortigate','routing-static-01','1',null,1);assert.deepEqual(store.progress(user.id,'fortigate'),['routing-static-01']);
 } finally {store?.close();rmSync(dir,{recursive:true,force:true});}
});
