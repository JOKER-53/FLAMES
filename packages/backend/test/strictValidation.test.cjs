const {test}=require('node:test');const assert=require('node:assert/strict');
const {parseStudentSubmission,parseInterfaceSubmission,parsePortSubmission}=require('../dist/validation');
const {validatePolicyExercise}=require('../dist/content/policyExercise');
test('enum fields reject arrays and coercible objects instead of accepting their string representation',()=>{
 const base={scenarioId:'s',addresses:[{id:'a',name:'All',type:'subnet',value:'0.0.0.0/0'}],services:[{id:'s',name:'TCP',protocol:'TCP'}],policies:[{id:'p',name:'Policy',srcIntf:'WAN',dstIntf:'DMZ',srcAddrIds:['a'],dstAddrIds:['a'],serviceIds:['s'],action:'ACCEPT',enabled:true,log:true}]};
 for(const [list,field] of [['addresses','type'],['services','protocol'],['policies','srcIntf'],['policies','dstIntf'],['policies','action']]){const body=structuredClone(base);body[list][0][field]=[body[list][0][field]];assert.throws(()=>parseStudentSubmission(body));}
 assert.throws(()=>parseInterfaceSubmission({scenarioId:'s',interfaces:[{name:'port1',role:['WAN'],ip:'1.2.3.4',subnet:'24',adminAccess:[]}]}));
 assert.throws(()=>parsePortSubmission({scenarioId:'s',assignments:[{portId:'port1',zone:['LAN']}]}));
 assert.doesNotThrow(()=>parseStudentSubmission(base));
});
test('policy draft schema requires explicit object/profile/policy lists and valid numeric packet ports',()=>{
 const base={schemaVersion:1,starterAddresses:[],starterServices:[],starterWebFilterProfiles:[],starterPolicies:[],referencePolicies:[],testPackets:[{id:'p',description:'Packet',srcIntf:'WAN',dstIntf:'DMZ',srcIp:'1.2.3.4',dstIp:'10.0.0.1',protocol:'ICMP'}],expectedOutcomes:[]};
 assert.doesNotThrow(()=>validatePolicyExercise(base,false));
 for(const key of ['starterAddresses','starterServices','starterWebFilterProfiles','starterPolicies','referencePolicies']){const value=structuredClone(base);delete value[key];assert.throws(()=>validatePolicyExercise(value,false));}
 for(const port of [-1,65536,'443',1.5]){const value=structuredClone(base);value.testPackets[0].port=port;assert.throws(()=>validatePolicyExercise(value,false));}
});
