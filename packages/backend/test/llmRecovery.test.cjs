const {test}=require('node:test');
const assert=require('node:assert/strict');
const {tutorHint,safeTutorText}=require('../dist/services/tutor');
const {sendLLMRequest}=require('../dist/services/llmClient');
test('provider success is labelled AI; retired model, timeout and empty answers are labelled guidance',async()=>{
 const env={...process.env};const originalFetch=global.fetch;
 try{
  for(const key of ['OPENAI_API_KEY','OPENAI_BASE_URL','OPENAI_MODEL','LLM_API_KEY','LLM_BASE_URL','LLM_MODEL'])delete process.env[key];
  Object.assign(process.env,{NVIDIA_NIM_API_KEY:'test-only',NVIDIA_NIM_BASE_URL:'https://integrate.api.nvidia.com/v1',NVIDIA_NIM_MODEL:'test-supported-model'});
  let payload;
  global.fetch=async(_url,init)=>{payload=JSON.parse(init.body);return new Response(JSON.stringify({choices:[{message:{content:'Check the packet direction and the first matching policy. A broad rule can shadow a more specific rule.'}}]}),{status:200});};
  assert.equal(safeTutorText('Set the action to ACCEPT and service HTTPS.'),false);
  assert.equal(safeTutorText('Use address 10.0.2.10 and port 443.'),false);
  assert.equal(safeTutorText('Inspect the first matching policy and compare its scope with the requirement.'),true);
  const live=await tutorHint('fortigate-policy','system','No policy matched',['Rule order']);assert.equal(live.source,'ai');assert.equal(payload.chat_template_kwargs.enable_thinking,false);
  global.fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:'Set the action to ACCEPT and service to HTTPS.'}}]}));
  assert.equal((await tutorHint('fortigate-policy','system','raw prompt with answers',['Rule order'])).source,'guide');
  for(const fake of [async()=>new Response('Retired model',{status:410}),async()=>{throw new DOMException('timeout','TimeoutError');},async()=>new Response(JSON.stringify({choices:[{message:{content:'<think>private reasoning</think>'}}]}))]){
   global.fetch=fake;const hint=await tutorHint('pan-nat','system','Translation type',['Translation type']);assert.equal(hint.source,'guide');assert.match(hint.text,/NAT/);assert.doesNotMatch(hint.text,/private reasoning/);
  }
  global.fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:'<think>hidden</think>Answer only.'}}]}));assert.equal(await sendLLMRequest({messages:[]}), 'Answer only.');
 }finally{global.fetch=originalFetch;process.env=env;}
});

test('malformed AI question contents fall back to validated banks for both vendors', async()=>{
 const env={...process.env};const originalFetch=global.fetch;
 const {generateKnowledgeCheck}=require('../dist/services/nimKnowledgeCheck');
 const {generatePanKnowledgeCheck}=require('../dist/services/nimPanKnowledgeCheck');
 try {
  Object.assign(process.env,{LLM_API_KEY:'test',LLM_BASE_URL:'https://provider.invalid/v1',LLM_MODEL:'fixture'});
  const invalid=[{question:'Q',choices:['A','B','C','D'],correctIndex:4},{question:'Q',choices:['A','a','C','D'],correctIndex:0},{question:'',choices:['A','B','C','D'],correctIndex:0},{question:'Q',choices:['A','B',null,'D'],correctIndex:0},{question:'Q'.repeat(2001),choices:['A','B','C','D'],correctIndex:0}];
  for(const data of invalid){global.fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(data)}}]}));
   assert.equal((await generateKnowledgeCheck('web-server-access-01','Web','scope')).source,'bank');
   assert.equal((await generatePanKnowledgeCheck('pan-nat-01')).source,'bank');
  }
 }finally{global.fetch=originalFetch;process.env=env;}
});

test('LLM credentials never mix with another configured provider namespace',async()=>{
 const env={...process.env};const originalFetch=global.fetch;const calls=[];
 try{
  Object.assign(process.env,{OPENAI_API_KEY:'openai-test',OPENAI_BASE_URL:'https://openai-fixture.invalid/v1',OPENAI_MODEL:'openai-model',LLM_API_KEY:'custom-test',LLM_BASE_URL:'https://custom-fixture.invalid/v1',LLM_MODEL:'custom-model',NVIDIA_NIM_API_KEY:'nim-test',NVIDIA_NIM_BASE_URL:'https://nim-fixture.invalid/v1',NVIDIA_NIM_MODEL:'nim-model'});
  global.fetch=async(url,init)=>{calls.push({url,key:init.headers.Authorization,model:JSON.parse(init.body).model,redirect:init.redirect});return new Response(JSON.stringify({choices:[{message:{content:'Grounded concept explanation.'}}]}));};
  await sendLLMRequest({messages:[]});delete process.env.OPENAI_API_KEY;await sendLLMRequest({messages:[]});delete process.env.LLM_API_KEY;await sendLLMRequest({messages:[]});
  assert.deepEqual(calls.map(x=>[x.url,x.key,x.model]),[['https://openai-fixture.invalid/v1/chat/completions','Bearer openai-test','openai-model'],['https://custom-fixture.invalid/v1/chat/completions','Bearer custom-test','custom-model'],['https://nim-fixture.invalid/v1/chat/completions','Bearer nim-test','nim-model']]);assert.ok(calls.every(x=>x.redirect==='error'));
  global.fetch=async()=>new Response('Provider echoed nim-test',{status:403});await assert.rejects(sendLLMRequest({messages:[]}),error=>!error.message.includes('nim-test')&&error.message.includes('[redacted]'));
 }finally{global.fetch=originalFetch;process.env=env;}
});
