import { describe, expect, it } from 'vitest';
import { PRACTICE_SCENARIOS } from '../src/scenarios/fortigate/practiceScenarios';
import { gradeSubmission } from '../src/policy/grader';
import { gradePanExercise, type PanSecurityRule } from '../src/pan/panExercises';
import type { FirewallPolicy } from '../src/policy/types';

// Independently authored valid configurations, rather than rules generated from expected outcomes.
const specs: Record<string, [string, string, string[], string[], string[], 'ACCEPT' | 'DENY'][] > = {
 'dns-resolver-01': [['LAN','DMZ',['lan'],['dns'],['dns-udp','dns-tcp'],'ACCEPT']],
 'admin-jump-host-01': [['LAN','DMZ',['admin'],['server'],['ssh'],'ACCEPT']],
 'quarantine-exception-01': [['LAN','WAN',['blocked'],['all'],['https'],'DENY'],['LAN','WAN',['lan'],['all'],['https'],'ACCEPT']],
 'monitoring-collector-01': [['DMZ','DMZ',['server'],['monitor'],['syslog'],'ACCEPT'],['LAN','DMZ',['admin'],['monitor'],['https'],'ACCEPT']],
 'time-service-01': [['LAN','WAN',['lan'],['time'],['ntp'],'ACCEPT']],
 'partner-allowlist-01': [['WAN','DMZ',['partner'],['server'],['https'],'ACCEPT']],
};
describe('operational practice labs', () => {
 it.each(PRACTICE_SCENARIOS)('grades a valid $id and rejects missing, broad, and unlogged permissions', scenario => {
  const policies = specs[scenario.id].map(([srcIntf,dstIntf,src,dst,services,action], i) => ({id:String(i),name:'Practice',srcIntf,dstIntf,srcAddrIds:src.map(id=>'addr_'+id),dstAddrIds:dst.map(id=>'addr_'+id),serviceIds:services.map(id=>'svc_'+id),action,log:true,enabled:true})) as FirewallPolicy[];
  const grade = (rules: FirewallPolicy[]) => gradeSubmission(scenario,{scenarioId:scenario.id,addresses:scenario.starterAddresses,services:scenario.starterServices,policies:rules});
  expect(grade(policies).overallPassed).toBe(true);
  expect(grade([]).overallPassed).toBe(false);
  expect(grade(policies.map(rule=>({...rule,log:false}))).overallPassed).toBe(false);
  const broad: FirewallPolicy = {...policies[0], id:'broad',srcAddrIds:['addr_all'],dstAddrIds:['addr_all'],serviceIds:scenario.starterServices.map(s=>s.id),action:'ACCEPT'};
  expect(grade([broad,...policies]).overallPassed).toBe(false);
  expect(new Set(scenario.expectedOutcomes.map(outcome=>outcome.testPacketId))).toEqual(new Set(scenario.testPackets.map(packet=>packet.id)));
 });
 const rule = (id:number,srcZone:string,dstZone:string,apps:string[],action:'allow'|'deny'='allow'): PanSecurityRule=>({id,name:'Practice',srcZone,dstZone,apps,action});
 const deny = rule(99,'any','any',['any'],'deny');
 const solutions: Record<string,PanSecurityRule[]> = {
  'pan-sec-dns':[rule(1,'Trust','Untrust',['dns']),deny],
  'pan-sec-admin':[rule(1,'Management','Trust',['ssh']),rule(2,'Management','DMZ',['ssh']),deny],
  'pan-sec-mail':[rule(1,'Untrust','DMZ',['smtp']),rule(2,'DMZ','Untrust',['smtp']),deny],
 };
 it.each(Object.keys(solutions))('grades application and direction restrictions for %s', id=>{
  const config=solutions[id];
  expect(gradePanExercise(id,config).overallPassed).toBe(true);
  expect(gradePanExercise(id,[]).overallPassed).toBe(false);
  expect(gradePanExercise(id,[rule(0,'any','any',['any']),...config]).overallPassed).toBe(false);
  expect(gradePanExercise(id,[deny,...config.slice(0,-1)]).overallPassed).toBe(false);
 });
 it('detects an incorrectly ordered quarantine exception',()=>{
  const scenario=PRACTICE_SCENARIOS.find(s=>s.id==='quarantine-exception-01')!;
  const policies=specs[scenario.id].map(([srcIntf,dstIntf,src,dst,services,action],i)=>({id:String(i),name:'Practice',srcIntf,dstIntf,srcAddrIds:src.map(id=>'addr_'+id),dstAddrIds:dst.map(id=>'addr_'+id),serviceIds:services.map(id=>'svc_'+id),action,log:true,enabled:true})).reverse() as FirewallPolicy[];
  expect(gradeSubmission(scenario,{scenarioId:scenario.id,addresses:scenario.starterAddresses,services:scenario.starterServices,policies}).overallPassed).toBe(false);
 });
});
