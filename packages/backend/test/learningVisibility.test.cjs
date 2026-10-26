const test=require('node:test');const assert=require('node:assert/strict');const {once}=require('node:events');
const {mkdtempSync,rmSync}=require('node:fs');const{join}=require('node:path');const{tmpdir}=require('node:os');
const{ContentStore}=require('../dist/content/store');const{PlatformStore}=require('../dist/platform/store');const{createApp}=require('../dist/app');
test('guide visibility defaults hidden, validates booleans, and persists across database reopen',()=>{
 const dir=mkdtempSync(join(tmpdir(),'flames-guide-'));const path=join(dir,'content.sqlite');let store=new ContentStore(path);
 try{assert.equal(store.learningSettings().learningGuideVisible,false);assert.throws(()=>store.setLearningVisibility('true'),e=>e.status===400);store.setLearningVisibility(true);store.close();store=new ContentStore(path);assert.equal(store.learningSettings().learningGuideVisible,true);store.setLearningVisibility(false);assert.equal(store.learningSettings().learningGuideVisible,false);}finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test('only content administrators can change the shared visibility setting',async()=>{
 Object.assign(process.env,{PLATFORM_MODE:'standalone',AUTH_REQUIRED:'false'});
 const accounts=new PlatformStore(':memory:');const content=new ContentStore(':memory:');
 for(const [id,role]of[['teacher','instructor'],['student','student']]){const u=accounts.createUser(id+'@example.invalid',id,'unused',role);accounts.createSession(u.id,id,Date.now()+60000);}
 const server=createApp(accounts,content).listen(0);await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;
 const call=(token,body)=>fetch(base+'/api/admin/learning-settings',{method:body===undefined?'GET':'PUT',headers:{...(token?{Cookie:'fortisim_session='+token}:{}),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 try{
  for(const token of [null,'student']){assert.equal((await call(token)).status,token?403:401);assert.equal((await call(token,{learningGuideVisible:true})).status,token?403:401);}
  assert.equal((await(await fetch(base+'/api/content/catalog')).json()).learningGuideVisible,false);
  assert.equal((await call('teacher',{learningGuideVisible:'false'})).status,400);
  assert.equal((await call('teacher',{})).status,400);
  const update=await call('teacher',{learningGuideVisible:true});assert.equal(update.status,200);assert.equal((await update.json()).learningGuideVisible,true);
  assert.equal((await(await fetch(base+'/api/content/catalog')).json()).learningGuideVisible,true);
  await call('teacher',{learningGuideVisible:false});assert.equal((await(await call('teacher')).json()).learningGuideVisible,false);
 }finally{await new Promise(resolve=>server.close(resolve));accounts.close();content.close();}
});
