import type { InterfaceConfig, AdminAccess } from "../interfaces/interfaceTypes";
import { ipToInt } from "../policy/matching";
import { isSimulatorConfiguration } from "../progress/drafts";
export interface InterfaceCliResult { applied: boolean; rows: InterfaceConfig[]; output: string; }
const HELP = 'Supported simulated commands: help; show; or a complete config system interface block with edit <existing name>, set ip <IPv4> <mask/prefix>, set role lan|wan|dmz, set allowaccess ping|https|ssh|http, unset allowaccess, next, end. abort discards the entire block. No shell or real device commands run.';
function validMask(mask: string) {
 if (/^\d+$/.test(mask)) { if (Number(mask)>32) throw new Error('Prefix must be 0–32.'); return; }
 ipToInt(mask); const bits=mask.split('.').map(n=>Number(n).toString(2).padStart(8,'0')).join(''); if(!/^1*0*$/.test(bits))throw new Error('Netmask must be contiguous.');
}
/** An allowlisted parser over student state; never evaluates code or invokes a shell. */
export function runInterfaceCli(current: InterfaceConfig[], input: string): InterfaceCliResult {
 if (!isSimulatorConfiguration('interfaces',current)) throw new Error('Invalid interface configuration.');
 if (typeof input!=='string'||input.length>8000)throw new Error('Use up to 8,000 characters per command block.');
 const lines=input.split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#'));if(lines.length>100||!lines.length)throw new Error('Enter 1–100 command lines.');
 const rows=JSON.parse(JSON.stringify(current)) as InterfaceConfig[];
 if(lines.length===1&&lines[0]==='help')return {applied:false,rows,output:HELP};
 if(lines.length===1&&lines[0]==='show')return {applied:false,rows,output:JSON.stringify(rows,null,2)};
 let opened=false,ended=false,selected:InterfaceConfig|undefined;let changes=0;
 for(let i=0;i<lines.length;i++){
  const line=lines[i];const fail=(message:string):never=>{throw new Error(`Line ${i+1}: ${message} No changes applied.`);};
  if(line==='abort')return {applied:false,rows:JSON.parse(JSON.stringify(current)),output:'Command block discarded. No changes applied.'};
  if(ended)fail('Nothing may follow end.');
  if(!opened){if(line!=='config system interface')fail('Start with config system interface, or use show/help.');opened=true;continue;}
  if(line==='end'){ended=true;continue;}if(line==='next'){if(!selected)fail('No interface is selected.');selected=undefined;continue;}
  const edit=/^edit (?:"([^"\r\n]+)"|([A-Za-z0-9_./-]+))$/.exec(line);
  if(edit){selected=rows.find(row=>row.name===(edit[1]??edit[2]));if(!selected)fail('Choose an existing interface; this subset does not create interfaces.');continue;}
  if(!selected)fail('Select an interface with edit first.');
  const ip=/^set ip (\S+) (\S+)$/.exec(line);
  if(ip){try{ipToInt(ip[1]);validMask(ip[2]);}catch{fail('Use a valid IPv4 address and contiguous mask or prefix.');}selected!.ip=ip[1];selected!.subnet=ip[2];changes++;continue;}
  const role=/^set role (lan|wan|dmz)$/.exec(line);if(role){selected!.role=role[1].toUpperCase() as InterfaceConfig['role'];changes++;continue;}
  if(line==='unset allowaccess'){selected!.adminAccess=[];changes++;continue;}
  if(line.startsWith('set allowaccess ')){const values=line.slice(16).split(/\s+/).map(v=>v.toUpperCase());if(!values.length||new Set(values).size!==values.length||values.some(v=>!['PING','HTTPS','SSH','HTTP'].includes(v)))fail('Use distinct supported management protocols.');selected!.adminAccess=values as AdminAccess[];changes++;continue;}
  fail('Unsupported simulated command. Use help for the supported subset.');
 }
 if(!opened||!ended)throw new Error('Complete the block with end. No changes applied.');
 if(!changes)throw new Error('The block did not change any interface settings.');
 return {applied:true,rows,output:`Applied ${changes} interface setting changes to this simulator draft. Use Check my work for grading.`};
}
