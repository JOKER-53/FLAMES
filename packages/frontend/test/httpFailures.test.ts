import {afterEach,expect,it,vi} from 'vitest';
import {apiJson,readApiJson} from '../src/api/http';
import {accountRequest} from '../src/hooks/useAccount';
afterEach(()=>vi.unstubAllGlobals());
it('empty proxy failures produce retryable account errors instead of JSON parser errors',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response('',{status:500,headers:{'Content-Type':'text/plain'}})));
 await expect(accountRequest('progress/fortigate')).rejects.toThrow('temporarily unavailable');
 await expect(apiJson('/api/example')).rejects.toThrow('temporarily unavailable');
});
it('malformed successful JSON and network outages have readable errors',async()=>{
 await expect(readApiJson(new Response(''))).rejects.toThrow('Please try again');
 vi.stubGlobal('fetch',vi.fn(async()=>{throw new TypeError('Failed to fetch');}));
 await expect(accountRequest('session')).rejects.toThrow('Cannot reach the server');
});
it('valid server error messages remain available',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({error:'Email or password is incorrect.'}),{status:401})));
 await expect(accountRequest('login',{})).rejects.toThrow('Email or password is incorrect.');
});
