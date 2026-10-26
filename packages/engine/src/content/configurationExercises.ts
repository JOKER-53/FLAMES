import { isSimulatorConfiguration, type SimulatorKind } from "../progress/drafts";
import { evaluatePanPacket, evaluatePanNat, type PanSecurityRule, type PanNatRule } from "../pan/panExercises";
import { parseCidr, ipToInt } from "../policy/matching";
import { gradeInterfaceSubmission } from "../interfaces/interfaceGrader";
import type { InterfaceConfig, InterfaceFieldCheck } from "../interfaces/interfaceTypes";
export type ConfigurationFamily = "interfaces" | "routing" | "pan-security" | "pan-nat" | "pan-zones";
export type ConfigurationValue = string | number | boolean | string[];
export type ConfigurationRow = Record<string, ConfigurationValue>;
export interface ConfigurationField { key:string;label:string;type:"text"|"number"|"boolean"|"list"|"select";options?:string[]; }
const f=(key:string,label:string,type:ConfigurationField["type"]="text",options?:string[]):ConfigurationField=>({key,label,type,...(options?{options}:{})});
export const CONFIGURATION_FAMILIES:Record<ConfigurationFamily,{label:string;vendor:"fortigate"|"paloalto";key:string;fields:ConfigurationField[]}>={
 interfaces:{label:"Interface configuration",vendor:"fortigate",key:"name",fields:[f("name","Interface name"),f("role","Role","select",["WAN","LAN","DMZ"]),f("ip","IPv4 address"),f("subnet","Mask / prefix"),f("adminAccess","Administrative access","list")]},
 routing:{label:"Static routing",vendor:"fortigate",key:"id",fields:[f("destination","Destination CIDR"),f("gateway","Gateway"),f("interfaceName","Outgoing interface"),f("distance","Administrative distance","number")]},
 "pan-security":{label:"Security policy",vendor:"paloalto",key:"id",fields:[f("name","Rule name"),f("srcZone","Source zone"),f("dstZone","Destination zone"),f("apps","Applications","list"),f("action","Action","select",["allow","deny"])]},
 "pan-nat":{label:"NAT policy",vendor:"paloalto",key:"id",fields:[f("name","Rule name"),f("type","Translation type","select",["source","destination","static"]),f("srcZone","Source zone"),f("dstZone","Destination zone"),f("dstAddr","Original destination"),f("translated","Translated address")]},
 "pan-zones":{label:"Zone configuration",vendor:"paloalto",key:"name",fields:[f("name","Zone name"),f("type","Zone type","select",["layer3","layer2","tap","ha","management"]),f("profile","Protection profile","select",["none","default","strict"]),f("interfaces","Interfaces","list"),f("logForwarding","Log forwarding","boolean")]},
};
export interface ConfigurationCheck {
 id:string;description:string;type:"field"|"security-packet"|"nat-packet"|"route-packet";
 target?:string;field?:string;operator?:"equals"|"contains";expected?:ConfigurationValue;
 srcZone?:string;dstZone?:string;application?:string;destination?:string;
 expectedAction?:"allow"|"deny";expectedTranslation?:string;expectedNatType?:"source"|"destination"|"static";
 expectedGateway?:string;expectedInterface?:string;
}
export interface ConfigurationExercise {schemaVersion:1;family:ConfigurationFamily;starterConfig:ConfigurationRow[];referenceConfig:ConfigurationRow[];checks:ConfigurationCheck[];}
export interface ConfigurationTraceStep {element:string;detail:string;selected?:boolean;rowId?:string;}
export interface ConfigurationResult {id:string;description:string;passed:boolean;trace:ConfigurationTraceStep[];}
const text=(value:unknown,max=200):value is string=>typeof value==="string"&&value.length<=max;
const required=(value:unknown,max=200):value is string=>text(value,max)&&!!value.trim();
const assert=(value:unknown,message:string)=>{if(!value)throw new Error(message);};
export function configurationRows(family:ConfigurationFamily,value:unknown):ConfigurationRow[]{
 const info=CONFIGURATION_FAMILIES[family];assert(info&&isSimulatorConfiguration(family as SimulatorKind,value),"Invalid simulator row structure.");
 const rows=value as ConfigurationRow[];assert(rows.length<=100,"Use at most 100 configuration rows.");
 for(const row of rows)for(const field of info.fields){const value=row[field.key];assert(field.type==="list"?Array.isArray(value)&&value.every(item=>text(item)):field.type==="boolean"?typeof value==="boolean":field.type==="number"?typeof value==="number"&&Number.isFinite(value):text(value)&&(!field.options||field.options.includes(value)),`Invalid ${field.label}.`);}
 if(info.key!=="id")assert(new Set(rows.map(row=>row[info.key])).size===rows.length,"Row names must be unique.");
 return rows.map(row=>Object.fromEntries([...new Set(["id",...info.fields.map(field=>field.key)])].filter(key=>row[key]!==undefined).map(key=>[key,row[key]])));
}
export function selectConfigurationRoute(rows:ConfigurationRow[],destination:string){
 const ip=ipToInt(destination);for(const row of rows){ipToInt(String(row.gateway));if(!Number.isInteger(row.distance)||Number(row.distance)<1||Number(row.distance)>255)throw new Error("Invalid route distance.");}const matches=rows.map(row=>{const range=parseCidr(String(row.destination));const prefix=Number(String(row.destination).split("/")[1]);return{row,prefix,matches:ip>=range.start&&ip<=range.end};}).filter(item=>item.matches).sort((a,b)=>b.prefix-a.prefix||Number(a.row.distance)-Number(b.row.distance));
 const best=matches[0];return{matches,selected:best?matches.filter(item=>item.prefix===best.prefix&&item.row.distance===best.row.distance):[]};
}
export interface ConfigurationPacket {srcZone?:string;dstZone?:string;application?:string;destination?:string;}
export interface ConfigurationExplanation {outcome:string;trace:ConfigurationTraceStep[];note:string;action?:"allow"|"deny";translation?:string;natType?:string;paths?:{gateway:string;interfaceName:string}[];}
function explainRows(family:ConfigurationFamily,rows:ConfigurationRow[],packet:ConfigurationPacket):ConfigurationExplanation {
 const trace:ConfigurationTraceStep[]=[];
 if(family==="routing"){
  assert(required(packet.destination),"Enter a destination IPv4 address.");
  const route=selectConfigurationRoute(rows,packet.destination!);const matches=new Set(route.matches.map(item=>item.row));const selected=new Set(route.selected.map(item=>item.row));
  trace.push({element:"Destination lookup",detail:`Find a prefix containing ${packet.destination}.`});
  for(const row of rows)trace.push({element:`Route ${row.id}`,rowId:String(row.id),detail:`${row.destination} via ${row.gateway} on ${row.interfaceName}, distance ${row.distance}: ${matches.has(row)?selected.has(row)?"selected":"matches but less preferred":"prefix does not match"}.`,selected:selected.has(row)});
  const paths=route.selected.map(item=>({gateway:String(item.row.gateway),interfaceName:String(item.row.interfaceName)}));trace.push({element:"Route selection",detail:paths.length?`Longest prefix, then lowest distance; ${paths.length} selected path${paths.length===1?"":"s"}.`:"No matching route. This model cannot forward to the destination.",selected:!paths.length});
  return{outcome:paths.length?paths.map(path=>`${path.interfaceName} via ${path.gateway}`).join("; "):"No route",paths,trace,note:"Static IPv4 lookup only. Gateway reachability, dynamic routing, security policy and NAT are not evaluated here."};
 }
 assert(required(packet.srcZone)&&required(packet.dstZone)&&packet.srcZone!=="any"&&packet.dstZone!=="any","Enter concrete source and destination zones.");
 if(family==="pan-security"){
  assert(required(packet.application),"Enter an application.");trace.push({element:"Original flow",detail:`${packet.srcZone} → ${packet.dstZone}; application ${packet.application}.`});
  for(const row of rows){const src=row.srcZone==="any"||row.srcZone===packet.srcZone,dst=row.dstZone==="any"||row.dstZone===packet.dstZone,app=(row.apps as string[]).includes("any")||(row.apps as string[]).includes(packet.application!);const selected=src&&dst&&app;trace.push({element:`Rule ${row.id} · ${row.name}`,rowId:String(row.id),detail:`Source zone ${src?"matches":"differs"}; destination zone ${dst?"matches":"differs"}; application ${app?"matches":"differs"}.${selected?` First match: ${row.action}. Later rules are not evaluated.`:""}`,selected});if(selected)break;}
  const action=evaluatePanPacket(rows as unknown as PanSecurityRule[],packet.srcZone!,packet.dstZone!,packet.application!);if(!trace.some(step=>step.selected))trace.push({element:"Implicit deny",detail:"No rule matched all three criteria.",selected:true});
  return{outcome:action,action,trace,note:"Zone and application matching only. Route lookup, real App-ID detection, NAT and stateful reply traffic are not simulated."};
 }
 assert(family==="pan-nat","Packet tracing is available for routing, security and NAT exercises.");assert(required(packet.destination),"Enter a destination IPv4 address.");ipToInt(packet.destination!);
 trace.push({element:"Original packet",detail:`${packet.srcZone} → ${packet.dstZone}; destination ${packet.destination}.`});const rules=rows as unknown as PanNatRule[];const selected=evaluatePanNat(rules,packet.srcZone!,packet.dstZone!,packet.destination!);
 for(const rule of rules){const match=rule===selected;trace.push({element:`NAT rule ${rule.id} · ${rule.name}`,rowId:String(rule.id),detail:`Original scope ${rule.srcZone} → ${rule.dstZone}, destination ${rule.dstAddr}. ${match?`First match: ${rule.type} → ${rule.translated}. Later rules are skipped.`:"Does not match this original packet."}`,selected:match});if(match)break;}
 if(!selected)trace.push({element:"No translation",detail:"No NAT rule matched. The original packet remains unchanged.",selected:true});
 trace.push({element:"Separate security decision",detail:"A translation does not grant permission; this NAT exercise does not evaluate a security policy."});
 return{outcome:selected?`${selected.type} → ${selected.translated}`:"Unchanged",translation:selected?.translated.trim()??"none",natType:selected?.type,trace,note:"Simplified original-zone/destination matching and configured translation only; no connection tracking, route lookup or security permission is inferred."};
}
export function explainConfigurationPacket(family:ConfigurationFamily,value:unknown,packet:ConfigurationPacket):ConfigurationExplanation {
 return explainRows(family,configurationRows(family,value),packet);
}
export function gradeConfigurationExercise(exercise:ConfigurationExercise,value:unknown){
 const rows=configurationRows(exercise.family,value);const info=CONFIGURATION_FAMILIES[exercise.family];
 const results:ConfigurationResult[]=exercise.checks.map(check=>{
  let passed=false;const trace:ConfigurationTraceStep[]=[];
  if(check.type==="field"){
   const row=rows.find(row=>String(row[info.key])===check.target);const actual=row?.[check.field!];
   if(exercise.family==="interfaces"&&row){const definition={interfaceName:String(row.name),field:check.field,description:check.description,expectedValue:check.expected} as InterfaceFieldCheck;passed=gradeInterfaceSubmission({id:"custom",title:"",description:"",starterInterfaces:[],checks:[definition]} as any,{scenarioId:"custom",interfaces:rows as unknown as InterfaceConfig[]}).overallPassed;}
   else if(row)passed=Array.isArray(check.expected)?Array.isArray(actual)&&(check.operator==="contains"?check.expected.every(item=>actual.includes(item)):actual.length===check.expected.length&&new Set(actual).size===actual.length&&check.expected.every(item=>actual.includes(item))):actual===check.expected;
   trace.push({element:row?`${info.label} · ${String(row[info.key])}`:"Missing row",detail:row?`${check.field}: ${JSON.stringify(actual)}`:"No matching configuration row was found.",selected:!!row,...(row?{rowId:String(row[info.key])}:{})});
  }else{
   try{const explanation=explainRows(exercise.family,rows,check);trace.push(...explanation.trace);
    if(check.type==="security-packet")passed=explanation.action===check.expectedAction;
    else if(check.type==="nat-packet")passed=explanation.translation===check.expectedTranslation&&(check.expectedTranslation==="none"||explanation.natType===check.expectedNatType);
    else passed=check.expectedInterface==="none"?!explanation.paths?.length:!!explanation.paths?.length&&explanation.paths.every(path=>path.gateway===check.expectedGateway&&path.interfaceName===check.expectedInterface);
   }catch{trace.push({element:"Invalid packet or configuration",detail:"Check the supplied addressing, route and packet fields."});}
  }
  return{id:check.id,description:check.description,passed,trace};
 });
 if(exercise.family==="pan-zones"){const owned=rows.flatMap(row=>row.interfaces as string[]);results.push({id:"zone-ownership",description:"Interfaces belong to one zone each",passed:new Set(owned).size===owned.length,trace:rows.map(row=>({element:`Zone ${row.name}`,rowId:String(row.name),detail:(row.interfaces as string[]).join(", ")}))});}
 return{overallPassed:results.length>0&&results.every(result=>result.passed),results};
}
export function validateConfigurationExercise(value:unknown,publishing=false,checkReference=true):ConfigurationExercise{
 const data=value as ConfigurationExercise;assert(!!data&&data.schemaVersion===1&&Object.prototype.hasOwnProperty.call(CONFIGURATION_FAMILIES,data.family),"Choose a valid configuration exercise family.");
 const starterConfig=configurationRows(data.family,data.starterConfig),referenceConfig=configurationRows(data.family,data.referenceConfig);const info=CONFIGURATION_FAMILIES[data.family];
 assert(Array.isArray(data.checks)&&data.checks.length<=100,"Use at most 100 checks.");const ids=new Set<string>();
 for(const check of data.checks){assert(check&&required(check.id)&&!ids.has(check.id)&&check.id!=="zone-ownership"&&required(check.description,1000),"Every check needs a unique ID and description.");ids.add(check.id);
  if(check.type==="field"){
   assert(["interfaces","routing","pan-zones"].includes(data.family),"Use packet checks for policy exercises.");
   const field=info.fields.find(field=>field.key===check.field&&field.key!==info.key);assert(field&&required(check.target)&&["equals","contains"].includes(check.operator??"equals"),"Choose a valid row, field and comparison.");
   const expected=check.expected;assert(field!.type==="list"?Array.isArray(expected)&&expected.length<=200&&new Set(expected).size===expected.length&&expected.every(item=>required(item)):field!.type==="boolean"?typeof expected==="boolean":field!.type==="number"?typeof expected==="number"&&Number.isFinite(expected):text(expected)&&(!field!.options||field!.options.includes(expected)),"Expected value has the wrong field type.");
   assert(check.operator!=="contains"||field!.type==="list","Contains comparisons require a list field.");assert(data.family!=="interfaces"||check.operator!=="contains","Interface administrative access is checked as an exact set.");
  }else if(check.type==="security-packet"){assert(data.family==="pan-security"&&required(check.srcZone)&&required(check.dstZone)&&check.srcZone!=="any"&&check.dstZone!=="any"&&required(check.application)&&["allow","deny"].includes(check.expectedAction!),"Enter valid security packet fields and an expected action.");
  }else if(check.type==="nat-packet"){assert(data.family==="pan-nat"&&required(check.srcZone)&&required(check.dstZone)&&check.srcZone!=="any"&&check.dstZone!=="any"&&required(check.destination)&&required(check.expectedTranslation),"Enter valid NAT packet fields.");ipToInt(check.destination!);if(check.expectedTranslation!=="none")assert(["source","destination","static"].includes(check.expectedNatType!),"Choose an expected translation type.");
  }else if(check.type==="route-packet"){assert(data.family==="routing"&&required(check.destination)&&required(check.expectedInterface),"Enter a destination and expected route.");ipToInt(check.destination!);if(check.expectedInterface!=="none"){assert(required(check.expectedGateway),"Enter the expected gateway.");ipToInt(check.expectedGateway!);}
  }else throw new Error("Unknown configuration check type.");
 }
 const normalized=JSON.parse(JSON.stringify({schemaVersion:1,family:data.family,starterConfig,referenceConfig,checks:data.checks})) as ConfigurationExercise;assert(JSON.stringify(normalized).length<=180000,"Exercise is too large.");
 if(publishing){
  for(const check of data.checks)if(data.family==="routing"&&check.type==="field")assert(starterConfig.some(row=>String(row.id)===check.target),"Route field checks need matching starter row IDs. Create starter rows or use route-packet checks.");
  assert(data.checks.length>0&&referenceConfig.length>0,"Add checks and a reference configuration before publishing.");
  if(data.family==="pan-security")assert(["allow","deny"].every(action=>data.checks.some(check=>check.expectedAction===action)),"Include both allowed and denied security traffic.");
  if(data.family==="pan-nat")assert(data.checks.some(check=>check.expectedTranslation==="none")&&data.checks.some(check=>check.expectedTranslation!=="none"),"Include translated and unchanged traffic.");
  if(data.family==="routing")for(const row of referenceConfig){parseCidr(String(row.destination));ipToInt(String(row.gateway));assert(Number.isInteger(row.distance)&&Number(row.distance)>=1&&Number(row.distance)<=255,"Route distance must be 1–255.");}
  if(data.family==="pan-nat")for(const row of referenceConfig){const destination=String(row.dstAddr).trim();if(!["any","all"].includes(destination.toLowerCase()))destination.includes("/")?parseCidr(destination):ipToInt(destination);const translated=String(row.translated).trim();if(!(row.type==="source"&&translated.toLowerCase()==="interface")){const parts=translated.split(":");assert(parts.length<=2,"Use an IPv4 translation with an optional port.");ipToInt(parts[0]);if(parts[1]!==undefined)assert(/^\d+$/.test(parts[1])&&Number(parts[1])>=0&&Number(parts[1])<=65535,"Invalid translated port.");}}
  if(data.family==="interfaces")for(const row of referenceConfig){const access=(row.adminAccess as string[]).map(item=>item.trim().toUpperCase());assert(access.every(item=>["PING","HTTPS","SSH","HTTP"].includes(item))&&new Set(access).size===access.length,"Choose supported, distinct administrative protocols.");if(row.ip)ipToInt(String(row.ip));if(row.subnet){const mask=String(row.subnet).replace(/^\//,"");if(/^\d+$/.test(mask))assert(Number(mask)<=32,"Invalid interface prefix.");else{const bits=String(row.subnet).split(".").map(value=>Number(value).toString(2).padStart(8,"0")).join("");ipToInt(String(row.subnet));assert(/^1*0*$/.test(bits),"Interface masks must be contiguous.");}}}
  if(checkReference)assert(gradeConfigurationExercise(normalized,referenceConfig).overallPassed,"The reference solution does not pass all checks.");
 }
 return normalized;
}
