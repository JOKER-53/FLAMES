export interface ExerciseTopologyNode { id:string; label:string; kind:"host"|"firewall"|"network"; zone:string; address:string; binding?:string; }
export interface ExerciseTopologyLink { id:string; from:string; to:string; label:string; }
export interface ExerciseTopology { schemaVersion:1; nodes:ExerciseTopologyNode[]; links:ExerciseTopologyLink[]; }
const text=(value:unknown,max:number):value is string=>typeof value==='string'&&value.length<=max;
const id=(value:unknown):value is string=>text(value,64)&&/^[A-Za-z0-9_-]+$/.test(value);
export function validateExerciseTopology(value:unknown,bindings?:readonly string[]):ExerciseTopology {
 const data=value as ExerciseTopology;const assert=(ok:unknown,message:string)=>{if(!ok)throw new Error(message);};
 assert(data&&data.schemaVersion===1&&Array.isArray(data.nodes)&&data.nodes.length<=20&&Array.isArray(data.links)&&data.links.length<=40,'Use a topology with up to 20 nodes and 40 connections.');
 const nodes=new Set<string>(),links=new Set<string>();
 for(const node of data.nodes){assert(node&&id(node.id)&&!nodes.has(node.id)&&text(node.label,160)&&!!node.label.trim()&&['host','firewall','network'].includes(node.kind)&&text(node.zone,80)&&text(node.address,160),'Each topology node needs a unique ID, label and supported kind.');nodes.add(node.id);assert(node.binding===undefined||text(node.binding,200)&&!!node.binding.trim()&&(!bindings||bindings.includes(node.binding)),'Topology bindings must refer to public starter identities.');}
 for(const link of data.links){assert(link&&id(link.id)&&!links.has(link.id)&&nodes.has(link.from)&&nodes.has(link.to)&&link.from!==link.to&&text(link.label,160),'Connections need unique IDs and two distinct existing nodes.');links.add(link.id);}
 return {schemaVersion:1,nodes:data.nodes.map(node=>({id:node.id,label:node.label.trim(),kind:node.kind,zone:node.zone,address:node.address,...(node.binding?{binding:node.binding}:{})})),links:data.links.map(link=>({id:link.id,from:link.from,to:link.to,label:link.label}))};
}
