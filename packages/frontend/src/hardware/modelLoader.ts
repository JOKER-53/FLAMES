import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
export interface ModelProgress {phase:"download"|"parse";loaded:number;total?:number;cached?:boolean;}
declare const __FLAMES_MODELS__: Record<string,{url:string;bytes:number}>;
export function modelAsset(vendor:"fortigate"|"paloalto"){return typeof __FLAMES_MODELS__!=="undefined"?__FLAMES_MODELS__[vendor]:{url:vendor==="fortigate"?"/firewall.glb":"/pa-220-firewall.glb",bytes:0};}
interface Entry {promise:Promise<ArrayBuffer>;listeners:Set<(progress:ModelProgress)=>void>;progress:ModelProgress;}
const cache=new Map<string,Entry>();
/** Two model buffers at most; scenes/GPU resources are owned and disposed by each viewer. */
export async function modelBuffer(url:string,progress:(value:ModelProgress)=>void):Promise<ArrayBuffer>{
 let entry=cache.get(url);if(entry){progress({...entry.progress,cached:true});entry.listeners.add(progress);try{return await entry.promise;}finally{entry.listeners.delete(progress);}}
 if(cache.size>=2)cache.delete(cache.keys().next().value!);
 entry={promise:Promise.resolve(new ArrayBuffer(0)),listeners:new Set([progress]),progress:{phase:"download",loaded:0}};const current=entry;cache.set(url,current);
 current.promise=(async()=>{
  const response=await fetch(url,{cache:"default",signal:AbortSignal.timeout(90000)});if(!response.ok)throw new Error("The model download failed. Retry when the connection is available.");
  const total=Number(response.headers.get("X-Model-Size")??(!response.headers.has("Content-Encoding")?response.headers.get("Content-Length"):null))||undefined;const chunks:Uint8Array[]=[];let loaded=0,last=0;
  const report=(force=false)=>{current.progress={phase:"download",loaded,total};if(force||performance.now()-last>80){last=performance.now();current.listeners.forEach(listener=>listener(current.progress));}};
  if(response.body){const reader=response.body.getReader();try{while(true){const result=await reader.read();if(result.done)break;loaded+=result.value.length;if(loaded>32*1024*1024)throw new Error("Model download exceeds the supported size.");chunks.push(result.value);report();}}catch(error){await reader.cancel().catch(()=>{});throw error;}}
  else{const bytes=new Uint8Array(await response.arrayBuffer());loaded=bytes.length;if(loaded>32*1024*1024)throw new Error("Model download exceeds the supported size.");chunks.push(bytes);}
  const buffer=new Uint8Array(loaded);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length;}report(true);current.progress={phase:"parse",loaded,total:loaded};return buffer.buffer;
 })();try{return await current.promise;}catch(error){if(cache.get(url)===current)cache.delete(url);throw error;}finally{current.listeners.delete(progress);}
}
export function clearModelCache(url?:string){if(url)cache.delete(url);else cache.clear();}
export function loadHardwareModel(vendor:"fortigate"|"paloalto",onLoad:(gltf:GLTF)=>void,onProgress:(progress:ModelProgress)=>void,onError:(error:unknown)=>void){
 let cancelled=false;const notify=(progress:ModelProgress)=>{if(!cancelled)onProgress(progress);};const asset=modelAsset(vendor);
 void (async()=>{const [buffer,{GLTFLoader}]=await Promise.all([modelBuffer(asset.url,notify),import("three/examples/jsm/loaders/GLTFLoader")]);if(cancelled)return;notify({phase:"parse",loaded:buffer.byteLength,total:buffer.byteLength});await new Promise(resolve=>setTimeout(resolve,0));if(cancelled)return;new GLTFLoader().parse(buffer,"/",onLoad,error=>{clearModelCache(asset.url);if(!cancelled)onError(error);});})().catch(error=>{clearModelCache(asset.url);if(!cancelled)onError(error);});
 // An in-flight download is shared across remounts. Ignore this viewer's progress without cancelling another subscriber.
 return()=>{cancelled=true;};
}
