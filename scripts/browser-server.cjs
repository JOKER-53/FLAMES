#!/usr/bin/env node
// Isolated browser fixture: never opens the developer's runtime databases or AI keys.
const {mkdtempSync,rmSync}=require('node:fs');const{tmpdir}=require('node:os');const{join,resolve}=require('node:path');const{spawn}=require('node:child_process');
const {PlatformStore}=require('../packages/backend/dist/platform/store');const{ContentStore}=require('../packages/backend/dist/content/store');const{hashPassword}=require('../packages/backend/dist/platform/auth');const{createApp}=require('../packages/backend/dist/app');
async function main(){
 const directory=mkdtempSync(join(tmpdir(),'flames-browser-'));
 Object.assign(process.env,{NODE_ENV:'test',PLATFORM_MODE:'standalone',AUTH_REQUIRED:'false',ALLOW_REGISTRATION:'true',FRONTEND_ORIGIN:'http://127.0.0.1:4173',OPENAI_API_KEY:'',LLM_API_KEY:'',NVIDIA_NIM_API_KEY:''});
 const accounts=new PlatformStore(join(directory,'accounts.sqlite'));const content=new ContentStore(join(directory,'content.sqlite'));
 accounts.createUser('teacher@example.invalid','Browser instructor',await hashPassword('BrowserFixture42!'),'instructor');
 content.setLearningVisibility(true); // Existing learning fixtures explicitly opt in; production defaults to hidden.
 const api=createApp(accounts,content).listen(4101,'127.0.0.1');
 const frontend=spawn(process.execPath,[resolve(__dirname,'../node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4173','--strictPort'],{cwd:resolve(__dirname,'../packages/frontend'),env:{...process.env,API_PROXY_TARGET:'http://127.0.0.1:4101'},stdio:'inherit'});
 let closing=false;function close(code=0){if(closing)return;closing=true;frontend.kill('SIGTERM');api.close(()=>{accounts.close();content.close();rmSync(directory,{recursive:true,force:true});process.exit(code);});setTimeout(()=>process.exit(code||1),4000).unref();}
 frontend.once('exit',code=>close(code??1));process.once('SIGTERM',()=>close());process.once('SIGINT',()=>close());api.once('error',error=>{console.error(error.message);close(1);});
}
main().catch(error=>{console.error(error.message);process.exit(1);});
