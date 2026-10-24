const{test}=require('node:test');const assert=require('node:assert/strict');const{mkdtempSync,mkdirSync,writeFileSync,rmSync}=require('node:fs');const{tmpdir}=require('node:os');const{join}=require('node:path');const{createServer}=require('node:http');const{once}=require('node:events');const{setTimeout:pause}=require('node:timers/promises');
const{createDevSupervisor}=require('../../../scripts/backend-dev.cjs');
test('development supervisor rebuilds changed shared code, keeps a good API on failure and recovers',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'flames-watch-'));const source=join(directory,'src');mkdirSync(source);const file=join(source,'engine.txt');writeFileSync(file,'v1');
 const portServer=createServer();portServer.listen(0,'127.0.0.1');await once(portServer,'listening');const port=portServer.address().port;await new Promise(resolve=>portServer.close(resolve));
 const serverTemplate=version=>`const http=require('node:http');http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({version:${JSON.stringify(version)},pid:process.pid}));}).listen(${port},'127.0.0.1');`;
 const builder=join(directory,'build.cjs');writeFileSync(builder,`const port=${port};const fs=require('node:fs');const value=fs.readFileSync('src/engine.txt','utf8');if(value==='bad')process.exit(1);setTimeout(()=>fs.writeFileSync('server.cjs',(${serverTemplate.toString()})(value)),60);`);
 const logs=[];const supervisor=createDevSupervisor({root:directory,watchPaths:[source],buildCommands:[[process.execPath,builder]],serverCommand:[process.execPath,join(directory,'server.cjs')],debounce:20,stopTimeout:500,stdio:'ignore',log:line=>logs.push(line)});
 const read=async()=>{const response=await fetch(`http://127.0.0.1:${port}`,{signal:AbortSignal.timeout(300)});return response.json();};
 async function waitFor(version){const end=Date.now()+7000;while(Date.now()<end){try{const data=await read();if(data.version===version)return data;}catch{}await pause(25);}throw new Error(`API did not reach ${version}: ${logs.join('; ')}`);}
 try{
  await waitFor('v1');writeFileSync(file,'v2');const old=await waitFor('v2');writeFileSync(file,'bad');const end=Date.now()+3000;while(!logs.some(line=>line.includes('Build failed'))&&Date.now()<end)await pause(25);assert.ok(logs.some(line=>line.includes('Build failed')));assert.equal((await read()).pid,old.pid);
  writeFileSync(file,'v3');await waitFor('v3');writeFileSync(file,'v4');await pause(40);writeFileSync(file,'v5');await waitFor('v5');
 }finally{await supervisor.close();rmSync(directory,{recursive:true,force:true});}
});
