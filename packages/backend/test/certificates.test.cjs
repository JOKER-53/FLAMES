const {test}=require('node:test');const assert=require('node:assert/strict');const{once}=require('node:events');
const{createApp}=require('../dist/app');const{PlatformStore}=require('../dist/platform/store');const{ContentStore}=require('../dist/content/store');const{COMPLETION_TASKS,DEFAULT_CERTIFICATE_TEMPLATE,CERTIFICATE_NOTE}=require('@fortisim/engine');const{academyIdentity}=require('../dist/integration/academy');
test('internal certificates require authenticated vendor completion and staff-owned roll number, preserve issuance and isolate accounts',async()=>{
 const saved={...process.env};process.env.PLATFORM_MODE='standalone';process.env.AUTH_REQUIRED='false';
 const accounts=new PlatformStore(':memory:'),content=new ContentStore(':memory:');const alice=accounts.createUser('alice@example.invalid','Alice <script>','unused'),bob=accounts.createUser('bob@example.invalid','Bob','unused'),admin=accounts.createUser('staff@example.invalid','Staff','unused','instructor');for(const[u,token]of [[alice,'alice'],[bob,'bob'],[admin,'staff']])accounts.createSession(u.id,token,Date.now()+60000);
 const server=createApp(accounts,content).listen(0);await once(server,'listening');const base=`http://localhost:${server.address().port}/api/certificates`;
 const request=async(path,token='alice',method='GET',body)=>{const res=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Cookie:'fortisim_session='+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:res.status,body:await res.json()};};
 try{
  assert.equal((await request('/fortigate','')).status,401);assert.equal((await request('/admin/templates','alice')).status,403);assert.equal((await request('/unknown')).status,400);
  let result=await request('/fortigate');assert.equal(result.body.eligible,false);assert.equal(result.body.required,28);assert.equal(result.body.needsRollNumber,true);
  assert.equal((await request('/admin/roll-number','staff','PUT',{email:alice.email,rollNumber:'COL-123'})).status,200);
  accounts.mergeProgress(alice.id,'fortigate',COMPLETION_TASKS.fortigate.slice(1));assert.equal((await request('/fortigate')).body.eligible,false);
  accounts.mergeProgress(alice.id,'fortigate',[COMPLETION_TASKS.fortigate[0]]);result=await request('/fortigate');assert.equal(result.body.eligible,true);assert.equal(result.body.details.rollNumber,'COL-123');assert.match(result.body.svg,/Alice &lt;script&gt;/);assert.ok(result.body.svg.includes(CERTIFICATE_NOTE));const first=result.body;
  assert.equal((await request('/paloalto')).body.eligible,false);assert.equal((await request('/fortigate','bob')).body.eligible,false);
  assert.equal((await request('/admin/templates/fortigate','staff','PUT',{...DEFAULT_CERTIFICATE_TEMPLATE,accent:'url(javascript:alert(1))'})).status,400);
  assert.equal((await request('/admin/templates/fortigate','staff','PUT',{...DEFAULT_CERTIFICATE_TEMPLATE,backgroundImage:'https://example.com/tracker.png'})).status,400);
  assert.equal((await request('/admin/templates/fortigate','staff','PUT',{...DEFAULT_CERTIFICATE_TEMPLATE,accent:'#008800',title:'Changed design'})).status,200);
  result=await request('/fortigate');assert.equal(result.body.details.id,first.details.id);assert.equal(result.body.template.title,first.template.title);assert.equal(result.body.svg,first.svg);
  accounts.mergeProgress(alice.id,'paloalto',COMPLETION_TASKS.paloalto);const pan=await request('/paloalto');assert.equal(pan.body.eligible,true);assert.notEqual(pan.body.details.id,first.details.id);
 }finally{await new Promise(resolve=>server.close(resolve));accounts.close();content.close();process.env=saved;}
});
test('Academy roll numbers are read only from the validated upstream profile',()=>{assert.equal(academyIdentity({id:1,username:'Student',roll_number:' COL-42 '}).rollNumber,'COL-42');assert.equal(academyIdentity({id:1,username:'Student',rollNumber:123}),null);assert.equal(academyIdentity({id:1,username:'Student',rollNumber:'bad\nvalue'}),null);});
test('integrated certificates use the Academy profile and parent progress without accepting local roll-number overrides',async()=>{
 const saved={...process.env};const express=require('express');const upstream=express();upstream.get('/auth/me',(req,res)=>res.json({user:{id:req.headers.authorization==='Bearer staff'?3:1,username:'Academy student',role:req.headers.authorization==='Bearer staff'?'admin':'student',roll_number:'ACA-001'}}));upstream.get('/integrations/fortisim/progress/:vendor',(_req,res)=>res.json({completed:COMPLETION_TASKS.paloalto}));const parent=upstream.listen(0);await once(parent,'listening');Object.assign(process.env,{PLATFORM_MODE:'academy',ACADEMY_ORIGIN:'https://academy.example.invalid',ACADEMY_API_URL:`http://localhost:${parent.address().port}`,AUTH_REQUIRED:'false'});
 const accounts=new PlatformStore(':memory:'),content=new ContentStore(':memory:');const server=createApp(accounts,content).listen(0);await once(server,'listening');const base=`http://localhost:${server.address().port}`;
 try{
  let response=await fetch(base+'/api/certificates/paloalto',{headers:{Authorization:'Bearer student'}});const issued=await response.json();assert.equal(issued.eligible,true);assert.equal(issued.details.rollNumber,'ACA-001');assert.equal(issued.details.name,'Academy student');
  response=await fetch(base+'/api/certificates/admin/roll-number',{method:'PUT',headers:{Authorization:'Bearer staff','Content-Type':'application/json'},body:JSON.stringify({email:'arbitrary',rollNumber:'override'})});assert.equal(response.status,409);
  response=await fetch(base+'/api/certificates/fortigate',{headers:{Authorization:'Bearer student'}});assert.equal((await response.json()).eligible,false);
  response=await fetch(base+'/api/certificates/paloalto');assert.equal(response.status,401);
 }finally{await new Promise(resolve=>server.close(resolve));await new Promise(resolve=>parent.close(resolve));accounts.close();content.close();process.env=saved;}
});
