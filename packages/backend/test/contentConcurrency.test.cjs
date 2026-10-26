const {test}=require('node:test');const assert=require('node:assert/strict');
const {mkdtempSync,rmSync}=require('node:fs');const{tmpdir}=require('node:os');const{join}=require('node:path');const{randomUUID}=require('node:crypto');
const {ContentStore}=require('../dist/content/store');
test('separate content connections observe publication, republishing and unpublication without restart',()=>{
 const dir=mkdtempSync(join(tmpdir(),'flames-catalog-'));const a=new ContentStore(join(dir,'content.sqlite'));const b=new ContentStore(join(dir,'content.sqlite'));
 try{
  assert.deepEqual(a.catalog(),[]);let draft=b.create('fortigate','Original module');draft.module.lessons=[{id:`custom-${randomUUID()}`,title:'Reading',body:'Instructions',summary:'',minutes:5,level:'Foundation',tasks:[]}];draft=b.save(draft.module.id,draft.module,draft.revision);draft=b.publish(draft.module.id,draft.revision);
  assert.equal(a.catalog()[0].title,'Original module');draft.module.title='Changed title';draft=b.save(draft.module.id,draft.module,draft.revision);assert.equal(a.catalog()[0].title,'Original module');draft=b.publish(draft.module.id,draft.revision);assert.equal(a.catalog()[0].title,'Changed title');b.unpublish(draft.module.id,draft.revision);assert.deepEqual(a.catalog(),[]);
 }finally{a.close();b.close();rmSync(dir,{recursive:true,force:true});}
});
test('stale revisions through a second connection cannot overwrite or publish newer content',()=>{
 const dir=mkdtempSync(join(tmpdir(),'flames-content-cas-'));const a=new ContentStore(join(dir,'content.sqlite'));const b=new ContentStore(join(dir,'content.sqlite'));
 try{const old=a.create('fortigate','Original');let latest=b.get(old.module.id);latest.module.title='Preserve this edit';latest=b.save(latest.module.id,latest.module,latest.revision);
 for(const change of [()=>a.save(old.module.id,old.module,old.revision),()=>a.publish(old.module.id,old.revision),()=>a.unpublish(old.module.id,old.revision),()=>a.delete(old.module.id,old.revision)])assert.throws(change,error=>error.status===409);
 assert.equal(a.get(old.module.id).module.title,'Preserve this edit');
 }finally{a.close();b.close();rmSync(dir,{recursive:true,force:true});}
});
