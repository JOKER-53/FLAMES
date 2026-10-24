const {test,before,after}=require('node:test');const assert=require('node:assert/strict');const{once}=require('node:events');const{randomUUID}=require('node:crypto');
const{createApp}=require('../dist/app');const{PlatformStore}=require('../dist/platform/store');const{ContentStore}=require('../dist/content/store');
const{validateConfigurationExercise,gradeConfigurationExercise,selectConfigurationRoute}=require('../../engine/dist');
const cases=[
 {family:'interfaces',vendor:'fortigate',reference:[{name:'wan1',role:'WAN',ip:'192.0.2.2',subnet:'24',adminAccess:['PING']}],checks:[{id:'ip',description:'Planned uplink address',type:'field',target:'wan1',field:'ip',operator:'equals',expected:'192.0.2.2'},{id:'mask',description:'Planned prefix',type:'field',target:'wan1',field:'subnet',operator:'equals',expected:'24'}]},
 {family:'routing',vendor:'fortigate',reference:[{id:'branch',destination:'192.168.10.0/24',gateway:'10.0.0.1',interfaceName:'port1',distance:10}],checks:[{id:'branch',description:'Traffic reaches branch',type:'route-packet',destination:'192.168.10.5',expectedInterface:'port1',expectedGateway:'10.0.0.1'},{id:'outside',description:'Outside is not routed',type:'route-packet',destination:'203.0.113.5',expectedInterface:'none'}]},
 {family:'pan-security',vendor:'paloalto',reference:[{id:1,name:'Web',srcZone:'Trust',dstZone:'Untrust',apps:['ssl'],action:'allow'}],checks:[{id:'good',description:'Approved traffic',type:'security-packet',srcZone:'Trust',dstZone:'Untrust',application:'ssl',expectedAction:'allow'},{id:'bad',description:'Unapproved traffic',type:'security-packet',srcZone:'Trust',dstZone:'Untrust',application:'ssh',expectedAction:'deny'}]},
 {family:'pan-nat',vendor:'paloalto',reference:[{id:1,name:'Publish',type:'destination',srcZone:'Untrust',dstZone:'Untrust',dstAddr:'203.0.113.10',translated:'10.0.1.10'}],checks:[{id:'good',description:'Published address',type:'nat-packet',srcZone:'Untrust',dstZone:'Untrust',destination:'203.0.113.10',expectedTranslation:'10.0.1.10',expectedNatType:'destination'},{id:'bad',description:'Other addresses unchanged',type:'nat-packet',srcZone:'Untrust',dstZone:'Untrust',destination:'203.0.113.20',expectedTranslation:'none'}]},
 {family:'pan-zones',vendor:'paloalto',reference:[{id:1,name:'Trust',type:'layer3',profile:'none',interfaces:['ethernet1/2'],logForwarding:false}],checks:[{id:'iface',description:'Internal zone owns its interface',type:'field',target:'Trust',field:'interfaces',operator:'equals',expected:['ethernet1/2']},{id:'type',description:'Routed mode',type:'field',target:'Trust',field:'type',operator:'equals',expected:'layer3'}]},
];
const exercise=item=>({schemaVersion:1,family:item.family,starterConfig:[],referenceConfig:structuredClone(item.reference),checks:structuredClone(item.checks)});
let accounts,content,server,base,studentId;const env={...process.env};
async function call(path,method='GET',body,who='student'){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Cookie:`fortisim_session=${who}`},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:r.status,body:await r.json()};}
before(async()=>{process.env.PLATFORM_MODE='standalone';process.env.AUTH_REQUIRED='false';accounts=new PlatformStore(':memory:');content=new ContentStore(':memory:');for(const who of ['teacher','student','other']){const user=accounts.createUser(`${who}@example.invalid`,who,'unused',who==='teacher'?'instructor':'student');accounts.createSession(user.id,who,Date.now()+600000);if(who==='student')studentId=user.id;}server=createApp(accounts,content).listen(0,'127.0.0.1');await once(server,'listening');base=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{await new Promise(resolve=>server.close(resolve));accounts.close();content.close();process.env=env;});
for(const item of cases)test(`${item.family} publishes, grades privately and supports account-scoped versioned drafts`,async()=>{
 const definition=validateConfigurationExercise(exercise(item),true);assert.equal(gradeConfigurationExercise(definition,definition.referenceConfig).overallPassed,true);assert.equal(gradeConfigurationExercise(definition,[]).overallPassed,false);
 let draft=(await call('/api/admin/modules','POST',{vendor:item.vendor,title:`Custom ${item.family}`},'teacher')).body;const id=`custom-${randomUUID()}`;
 draft.module.lessons=[{id,kind:'configuration',title:'Custom lab',summary:'Check the requirements',body:'Configure the system according to the addressing and access plan.',minutes:10,level:'Foundation',tasks:[],configurationExercise:definition}];
 draft=(await call(`/api/admin/modules/${draft.module.id}`,'PUT',{module:draft.module,revision:draft.revision},'teacher')).body;
 assert.equal((await call(`/api/content/lessons/${id}/configuration`)).status,404);
 assert.equal((await call('/api/admin/validate-configuration','POST',{exercise:definition})).status,403);
 assert.equal((await call('/api/admin/validate-configuration','POST',{exercise:definition},'teacher')).body.overallPassed,true);
 draft=(await call(`/api/admin/modules/${draft.module.id}/publish`,'POST',{revision:draft.revision},'teacher')).body;assert.ok(draft.publishedAt);
 const pub=(await call(`/api/content/lessons/${id}/configuration`)).body;const lesson=(await call(`/api/content/lessons/${id}`)).body;const catalog=(await call('/api/content/catalog')).body;
 const serialized=JSON.stringify({pub,lesson,catalog});for(const key of ['referenceConfig','configurationExercise','expectedTranslation','expectedAction','expectedGateway','"expected":'])assert.equal(serialized.includes(key),false,key);
 assert.equal(catalog.modules.find(module=>module.id===draft.module.id).lessons[0].simulatorFamily,item.family);
 assert.equal((await call(`/api/content/lessons/${id}/grade`,'POST',{answers:[]})).status,400);
 const report=await call(`/api/content/lessons/${id}/configuration/grade`,'POST',{config:item.reference,version:pub.version});assert.equal(report.status,200);assert.equal(report.body.overallPassed,true);assert.ok(report.body.results.every(result=>result.trace.length));
 assert.equal((await call(`/api/content/lessons/${id}/configuration/grade`,'POST',{config:item.reference,version:'old'})).status,409);
 const path=`/api/drafts/${item.vendor}/${id}`;const data={ownerId:studentId,schemaVersion:1,scenarioVersion:pub.version,revision:0,config:item.reference};assert.equal((await call(path,'PUT',data)).status,200);assert.equal((await call(path,'GET',undefined,'other')).body.draft,null);
 assert.equal((await call(`/api/drafts/${item.vendor==='fortigate'?'paloalto':'fortigate'}/${id}`)).status,404);
 await call(`/api/account/progress/${item.vendor}`,'POST',{completed:[id]});assert.ok(accounts.progress(studentId,item.vendor).includes(id));
 draft.module.lessons[0].configurationExercise.checks[0].description+=' revised';draft=(await call(`/api/admin/modules/${draft.module.id}`,'PUT',{module:draft.module,revision:draft.revision},'teacher')).body;await call(`/api/admin/modules/${draft.module.id}/publish`,'POST',{revision:draft.revision},'teacher');assert.equal((await call(path,'PUT',{...data,revision:1})).status,409);
});
test('reference validation rejects wrong families, broad policies, shadowed NAT and conflicting routes',()=>{
 const security=exercise(cases[2]);security.referenceConfig[0].apps=['any'];assert.throws(()=>validateConfigurationExercise(security,true),/reference solution/);
 const nat=exercise(cases[3]);nat.referenceConfig.unshift({...nat.referenceConfig[0],id:2,dstAddr:'any',translated:'10.0.1.99'});assert.throws(()=>validateConfigurationExercise(nat,true),/reference solution/);
 const routing=exercise(cases[1]);routing.referenceConfig.push({...routing.referenceConfig[0],id:'wrong',gateway:'10.0.0.99'});assert.throws(()=>validateConfigurationExercise(routing,true),/reference solution/);
 const zone=exercise(cases[4]);zone.referenceConfig.push({...zone.referenceConfig[0],id:2,name:'Other'});assert.throws(()=>validateConfigurationExercise(zone,true),/reference solution/);
 const ip=exercise(cases[0]);ip.referenceConfig[0].ip='999.1.1.1';assert.throws(()=>validateConfigurationExercise(ip,true));
 assert.throws(()=>validateConfigurationExercise({...ip,family:'constructor'},true));
});
test('route lookup prefers longer prefixes and reports every equal-cost path',()=>{
 const rows=[{id:'default',destination:'0.0.0.0/0',gateway:'10.0.0.1',interfaceName:'port1',distance:1},{id:'specific',destination:'192.168.10.0/24',gateway:'10.0.0.2',interfaceName:'port2',distance:20}];assert.equal(selectConfigurationRoute(rows,'192.168.10.5').selected[0].row.id,'specific');
 rows.push({...rows[1],id:'ecmp',gateway:'10.0.0.3'});assert.equal(selectConfigurationRoute(rows,'192.168.10.5').selected.length,2);
});

test('content imports keep extended exercise definitions private, draft-only and bound to their vendor',async()=>{
 const definition=exercise(cases[3]);let draft=content.create('paloalto','Transfer custom NAT');draft.module.lessons=[{id:`custom-${randomUUID()}`,kind:'configuration',title:'Transferred NAT',summary:'',body:'Configure the mapping.',minutes:10,level:'Foundation',tasks:[],configurationExercise:definition}];draft=content.save(draft.module.id,draft.module,draft.revision);
 const exported=content.exportModule(draft.module.id);const imported=content.importModule(exported);assert.equal(imported.publishedAt,null);assert.notEqual(imported.module.lessons[0].id,draft.module.lessons[0].id);assert.deepEqual(imported.module.lessons[0].configurationExercise,definition);
 const wrong=structuredClone(exported);wrong.module.vendor='fortigate';assert.throws(()=>content.importModule(wrong),/different vendor/);
 const invalid=exercise(cases[3]);invalid.referenceConfig[0].translated='not-an-address';assert.throws(()=>validateConfigurationExercise(invalid,true));
});
