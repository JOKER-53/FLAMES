import {expect,it} from 'vitest';
import {explainConfigurationPacket} from '../src/content/configurationExercises';
import {evaluatePacket} from '../src/policy/evaluator';
it('route explanations show mismatched prefixes, preferred paths and exact row identities',()=>{
 const rows=[{id:'default',destination:'0.0.0.0/0',gateway:'10.0.0.1',interfaceName:'port1',distance:1},{id:'specific',destination:'192.168.10.0/24',gateway:'10.0.0.2',interfaceName:'port2',distance:20},{id:'other',destination:'172.16.0.0/16',gateway:'10.0.0.3',interfaceName:'port3',distance:10}];
 const result=explainConfigurationPacket('routing',rows,{destination:'192.168.10.5'});expect(result.paths).toEqual([{gateway:'10.0.0.2',interfaceName:'port2'}]);expect(result.trace.find(step=>step.rowId==='specific')?.selected).toBe(true);expect(result.trace.find(step=>step.rowId==='other')?.detail).toContain('does not match');expect(result.note).toContain('NAT are not evaluated');
});
it('security/NAT explanations use the effective row and never infer a security permit from translation',()=>{
 const security=[{id:1,name:'First block',srcZone:'any',dstZone:'any',apps:['ssl'],action:'deny'},{id:2,name:'Later allow',srcZone:'Trust',dstZone:'Untrust',apps:['ssl'],action:'allow'}];
 const decision=explainConfigurationPacket('pan-security',security,{srcZone:'Trust',dstZone:'Untrust',application:'ssl'});expect(decision.action).toBe('deny');expect(decision.trace.some(step=>step.rowId==='2')).toBe(false);expect(decision.trace.find(step=>step.rowId==='1')?.selected).toBe(true);
 const nat=[{id:1,name:'Translation',type:'destination',srcZone:'Untrust',dstZone:'Untrust',dstAddr:'203.0.113.10',translated:'10.0.1.10'}];const mapped=explainConfigurationPacket('pan-nat',nat,{srcZone:'Untrust',dstZone:'Untrust',destination:'203.0.113.10'});expect(mapped.translation).toBe('10.0.1.10');expect(mapped.action).toBeUndefined();expect(mapped.trace.some(step=>step.element==='Separate security decision')).toBe(true);expect(JSON.stringify(mapped)).not.toContain('expected');
 expect(explainConfigurationPacket('pan-nat',nat,{srcZone:'Untrust',dstZone:'Untrust',destination:'203.0.113.11'}).translation).toBe('none');
});
it('FortiGate traces include disabled rules, matching criteria and actual filter decisions',()=>{
 const packet={id:'p',description:'Flow',srcIntf:'WAN' as const,dstIntf:'DMZ' as const,srcIp:'203.0.113.1',dstIp:'10.0.2.10',protocol:'TCP' as const,port:443,domain:'BLOCKED.EXAMPLE.'};
 const rule={id:'allow',name:'Web',srcIntf:'WAN' as const,dstIntf:'DMZ' as const,srcAddrIds:[],dstAddrIds:[],serviceIds:[],action:'ACCEPT' as const,log:true,enabled:true,webFilterProfileId:'f'};
 const result=evaluatePacket(packet,[{...rule,id:'disabled',enabled:false},rule],[],[],[{id:'f',name:'Student filter',blockedDomains:['blocked.example']}]);expect(result.finalAction).toBe('DENY');expect(result.trace[0].reason).toContain('disabled');expect(result.trace[1].comparisons?.map(item=>item.label)).toContain('Service');expect(result.trace[1].filter).toEqual({profileId:'f',profileName:'Student filter',domain:'BLOCKED.EXAMPLE.',blocked:true});
});
