#!/usr/bin/env node
// Compile shared engine + backend before replacing the running API. Failed builds
// leave the last working API available; source fixes automatically retry.
const {watch}=require('node:fs');const{resolve}=require('node:path');const{spawn}=require('node:child_process');const{once}=require('node:events');
function createDevSupervisor(options){
 const log=options.log||console.log;let server=null,building=null,timer=null,dirty=false,running=false,closed=false;const watchers=[];
 const launch=(command,cwd)=>spawn(command[0],command.slice(1),{cwd:cwd||options.root,env:process.env,stdio:options.stdio||'inherit'});
 async function stopServer(){const child=server;server=null;if(!child||child.exitCode!==null||child.signalCode!==null)return;const exited=once(child,'exit').catch(()=>{});child.kill('SIGTERM');const force=setTimeout(()=>child.kill('SIGKILL'),options.stopTimeout||11000);force.unref();await exited;clearTimeout(force);}
 async function build(command){
  const child=launch(command);building=child;
  const result=await new Promise(resolve=>{child.once('error',()=>resolve(false));child.once('exit',code=>resolve(code===0));});
  if(building===child)building=null;return result;
 }
 async function rebuild(){
  if(running||closed)return;running=true;
  try{while(dirty&&!closed){dirty=false;log('[dev] Building engine and API…');let success=true;for(const command of options.buildCommands){if(closed||!await build(command)){success=false;break;}}
   if(closed)break;if(dirty)continue;
   if(!success){log('[dev] Build failed. Keeping the previous API running; waiting for a source fix.');continue;}
   await stopServer();if(closed)break;server=launch(options.serverCommand,options.serverCwd);server.on('error',error=>log(`[dev] API failed to start: ${error.message}`));log('[dev] Compiled API started.');
  }}finally{running=false;if(dirty&&!closed)void rebuild();}
 }
 function schedule(){if(closed)return;dirty=true;if(timer)clearTimeout(timer);timer=setTimeout(()=>void rebuild(),options.debounce??200);}
 async function close(){if(closed)return;closed=true;clearTimeout(timer);watchers.forEach(watcher=>watcher.close());if(building)building.kill('SIGTERM');await stopServer();}
 for(const path of options.watchPaths){const watcher=watch(path,{recursive:true},schedule);watcher.on('error',error=>log(`[dev] Watch error: ${error.message}`));watchers.push(watcher);}
 schedule();return{close};
}
if(require.main===module){
 const root=resolve(__dirname,'..');const compiler=resolve(root,'node_modules/typescript/bin/tsc');
 const supervisor=createDevSupervisor({root,watchPaths:[resolve(root,'packages/engine/src'),resolve(root,'packages/backend/src'),resolve(root,'packages/engine/tsconfig.json'),resolve(root,'packages/backend/tsconfig.json')],buildCommands:[[process.execPath,compiler,'-p','packages/engine/tsconfig.json'],[process.execPath,compiler,'-p','packages/backend/tsconfig.json']],serverCommand:[process.execPath,resolve(root,'packages/backend/dist/server.js')],serverCwd:resolve(root,'packages/backend')});
 const close=()=>void supervisor.close().then(()=>process.exit(0));process.once('SIGINT',close);process.once('SIGTERM',close);
}
module.exports={createDevSupervisor};
