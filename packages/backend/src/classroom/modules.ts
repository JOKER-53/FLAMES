import { COMPLETION_TASKS, builtinDraftSpec } from "@fortisim/engine";
import type { ContentStore } from "../content/store";
const definitions = [
  ["fortigate","policy","Firewall Policy",["policy"]], ["fortigate","interface","Interfaces",["interfaces"]], ["fortigate","port","Port Assignment",["ports"]], ["fortigate","routing","Routing",["routing"]],
  ["paloalto","security","Security Policy",["pan-security"]], ["paloalto","zones","Zones",["pan-zones"]], ["paloalto","nat","NAT",["pan-nat"]], ["paloalto","interfaces","Interfaces & Ports",["pan-interfaces","pan-ports"]],
] as const;
export function assignmentModules(content: ContentStore) {
  return [...definitions.map(([vendor,id,title,kinds])=>({vendor,id,title,lessons:COMPLETION_TASKS[vendor].filter(lesson=> (kinds as readonly string[]).includes(builtinDraftSpec(vendor,lesson)?.kind ?? "")).map(id=>({id}))})), ...content.catalog().map(module=>({id:module.id,vendor:module.vendor,title:module.title,lessons:module.lessons.map(({id})=>({id}))}))];
}
