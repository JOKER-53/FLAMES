import { expect,it } from 'vitest';import { runInterfaceCli } from '../src/cli/interfaceCli';import type {InterfaceConfig} from '../src/interfaces/interfaceTypes';
const initial:InterfaceConfig[]=[{name:'wan1',role:'WAN',ip:'',subnet:'',adminAccess:[]}];
it('applies only a complete supported interface block and leaves its input immutable',()=>{
 const result=runInterfaceCli(initial,'config system interface\nedit "wan1"\nset ip 192.0.2.2 255.255.255.252\nset role wan\nset allowaccess ping https\nnext\nend');expect(result.applied).toBe(true);expect(result.rows[0]).toMatchObject({ip:'192.0.2.2',subnet:'255.255.255.252',adminAccess:['PING','HTTPS']});expect(initial[0].ip).toBe('');
});
it('rejects unsupported, incomplete, invalid and injection-like input without partial changes',()=>{
 for(const input of ['sh -c whoami','config system interface\nedit wan1\nset ip 192.0.2.2 24','config system interface\nedit new\nend','config system interface\nedit wan1\nset ip 192.0.2.2 255.0.255.0\nend','config system interface\nedit wan1\nset allowaccess ping; whoami\nend','config system interface\nedit wan1\nset role lan\nunknown\nend'])expect(()=>runInterfaceCli(initial,input)).toThrow();expect(initial[0].role).toBe('WAN');
});
it('provides read-only help/show and explicit abort',()=>{expect(runInterfaceCli(initial,'show').applied).toBe(false);expect(runInterfaceCli(initial,'help').output).toContain('Supported simulated');expect(runInterfaceCli(initial,'config system interface\nedit wan1\nset role lan\nabort').rows).toEqual(initial);});
