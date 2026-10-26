const test=require('node:test');const assert=require('node:assert/strict');const{ContentStore}=require('../dist/content/store');const{validateConfigurationExercise,gradeConfigurationExercise}=require('@fortisim/engine');const{randomUUID}=require('node:crypto');
const examples={
 ports:{starterConfig:[{portId:'port1',zone:'unassigned'}],referenceConfig:[{portId:'port1',zone:'LAN'}],field:'zone',target:'port1',expected:'LAN'},
 'pan-ports':{starterConfig:[{id:'ethernet1/1',zone:'unassigned',label:'Uplink'},{id:'management',zone:'Management',label:'MGT'}],referenceConfig:[{id:'ethernet1/1',zone:'Untrust',label:'Uplink'},{id:'management',zone:'Management',label:'MGT'}],field:'zone',target:'ethernet1/1',expected:'Untrust'},
 'pan-interfaces':{starterConfig:[{id:'ethernet1/1',type:'layer3',zone:'—',ip:'',link:true,speed:'1G',comment:''}],referenceConfig:[{id:'ethernet1/1',type:'layer3',zone:'Untrust',ip:'192.0.2.2/30',link:true,speed:'1G',comment:''}],field:'ip',target:'ethernet1/1',expected:'192.0.2.2/30'}
};
for(const[family,example]of Object.entries(examples))test(`${family}: private publication, grading, drafts and transfer preserve required fields`,()=>{
 const store=new ContentStore(':memory:');try{
  const exercise={schemaVersion:1,family,starterConfig:example.starterConfig,referenceConfig:example.referenceConfig,checks:[{id:'requirement',description:'Match the assigned requirement',type:'field',target:example.target,field:example.field,operator:'equals',expected:example.expected}]};
  assert.equal(gradeConfigurationExercise(validateConfigurationExercise(exercise,true),example.referenceConfig).overallPassed,true);assert.equal(gradeConfigurationExercise(exercise,example.starterConfig).overallPassed,false);
  let draft=store.create(family==='ports'?'fortigate':'paloalto','Builder');const id='custom-'+randomUUID();draft=store.save(draft.module.id,{...draft.module,lessons:[{id,kind:'configuration',title:'Lab',summary:'Configure it',body:'Follow the public plan',minutes:10,level:'Foundation',tasks:[],configurationExercise:exercise,topology:{schemaVersion:1,nodes:[{id:'endpoint',label:'Public endpoint',kind:'host',zone:'',address:'',binding:example.target}],links:[]}}]},draft.revision);draft=store.publish(draft.module.id,draft.revision);
  const publicExercise=store.publicConfigurationExercise(id);assert.equal(publicExercise.family,family);assert.equal(publicExercise.referenceConfig,undefined);assert.equal(publicExercise.checks[0].expected,undefined);assert.equal(store.publicLesson(id).topology.nodes[0].binding,example.target);
  assert.equal(store.gradeConfiguration(id,example.referenceConfig,publicExercise.version).overallPassed,true);assert.throws(()=>store.gradeConfiguration(id,example.referenceConfig,'stale'),e=>e.status===409);
  const transferred=store.importModule(store.exportModule(draft.module.id));assert.notEqual(transferred.module.id,draft.module.id);assert.deepEqual(transferred.module.lessons[0].topology,draft.module.lessons[0].topology);assert.equal(transferred.publishedAt,null);
 }finally{store.close();}
});
test('management boundaries and malformed physical plans cannot be published or graded as correct',()=>{
 const example=examples['pan-ports'];const exercise={schemaVersion:1,family:'pan-ports',starterConfig:example.starterConfig,referenceConfig:example.referenceConfig,checks:[{id:'uplink',description:'Assigned uplink zone',type:'field',target:'ethernet1/1',field:'zone',operator:'equals',expected:'Untrust'}]};
 assert.equal(gradeConfigurationExercise(exercise,example.referenceConfig.map(row=>row.id==='management'?{...row,zone:'Trust'}:row)).overallPassed,false);
 assert.throws(()=>validateConfigurationExercise({...exercise,referenceConfig:example.referenceConfig.map(row=>row.id==='management'?{...row,zone:'Trust'}:row)},true));
 assert.throws(()=>validateConfigurationExercise({...exercise,starterConfig:[{id:'absent',label:'Bad',zone:'unassigned'}]},true));
});
