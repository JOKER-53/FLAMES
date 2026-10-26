import {afterEach,describe,it,expect,vi} from 'vitest';
import {clearModelCache,modelBuffer} from '../src/hardware/modelLoader';
afterEach(()=>{clearModelCache();vi.unstubAllGlobals();});
describe('bounded model downloads',()=>{
 it('shares a transport, reports decoded progress, and reuses cached bytes',async()=>{const fetch=vi.fn(async()=>new Response(new Uint8Array([1,2,3,4]),{headers:{'Content-Length':'2','Content-Encoding':'gzip','X-Model-Size':'4'}}));vi.stubGlobal('fetch',fetch);const progress:any[]=[];const[a,b]=await Promise.all([modelBuffer('/model',value=>progress.push(value)),modelBuffer('/model',()=>{})]);expect(a.byteLength).toBe(4);expect(b).toBe(a);await modelBuffer('/model',value=>progress.push(value));expect(fetch).toHaveBeenCalledTimes(1);expect(progress.some(value=>value.loaded===4&&value.total===4)).toBe(true);expect(progress.some(value=>value.cached)).toBe(true);});
 it('evicts failed downloads so retry can succeed',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(new Response('',{status:503})).mockResolvedValueOnce(new Response(new Uint8Array([8]))));await expect(modelBuffer('/retry',()=>{})).rejects.toThrow(/download failed/);expect((await modelBuffer('/retry',()=>{})).byteLength).toBe(1);});
 it('bounds retained models to two assets',async()=>{const fetch=vi.fn(async()=>new Response(new Uint8Array([1])));vi.stubGlobal('fetch',fetch);for(const url of ['/one','/two','/three','/one'])await modelBuffer(url,()=>{});expect(fetch).toHaveBeenCalledTimes(4);});
});
