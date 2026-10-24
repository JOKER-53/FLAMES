/** Concept guidance only: never consumes expected values or emits scenario answers. */
export interface LearningHint { concept: string; first: string; next: string; }
const hints: Record<string, LearningHint> = {
  order: { concept: "Rule order", first: "A firewall stops at the first matching rule. A broad rule can hide a more specific rule below it.", next: "Trace the failing packet from the top of your rule table. Compare every earlier rule's interfaces, address scope, and services before changing its action." },
  subnet: { concept: "Address scope", first: "An address and its CIDR mask define a range. A host address alone does not guarantee that the whole intended subnet is covered.", next: "Compare the network boundaries of your object with the addressing plan. Check both an intended host and a host outside that range; avoid overlapping routed subnets." },
  service: { concept: "Services and ports", first: "A service matches protocol as well as destination port. An unrestricted service can allow traffic outside the requirement.", next: "Check the failing packet's protocol and destination port against your service object and rule. With App-ID, also compare the actual application instead of assuming that its port identifies it." },
  nat: { concept: "NAT mapping", first: "NAT translates a packet; it does not grant permission. Source and destination translations operate in different directions.", next: "Trace the original source and destination, the address being translated, and the resulting destination zone. Then check the separate security policy for that flow." },
  route: { concept: "Route selection", first: "A reachable next hop and the correct outgoing interface are necessary even when a policy permits the packet.", next: "Compare destination prefixes first, then administrative distance and competing equal-cost entries. Check that the gateway is reachable on the selected interface." },
  zone: { concept: "Zone ownership", first: "Zones describe the connected network's trust and purpose. Physical port position does not determine its zone.", next: "Trace the cable to its endpoint and compare the interface mode with the zone type. Keep management and high-availability links separate from data traffic." },
  log: { concept: "Traffic logging", first: "A correct forwarding decision can still fail a logging requirement.", next: "Inspect the logging setting of the rule that actually matched, rather than another rule with a similar name." },
  access: { concept: "Management exposure", first: "Administrative protocols expose the firewall itself. They should follow the interface's management requirements.", next: "Review each enabled administrative protocol against the scenario and remove access that the connected network does not need." },
  policy: { concept: "Packet matching", first: "Compare the failing flow with your rule's direction, address objects, and service before changing its action.", next: "Trace rules from the top. If none matches, implicit deny applies; if an unexpected rule matches, narrow its scope or revisit its order." },
};
export function learningHints(topic: string, failures: readonly string[]): LearningHint[] {
  const selected: string[] = [];
  const add = (key: string) => { if (!selected.includes(key)) selected.push(key); };
  for (const raw of failures) {
    const label = raw.toLowerCase();
    if (/log/.test(label)) add("log");
    if (/overlap|subnet|cidr|\bip\b|address|mask/.test(label)) add("subnet");
    if (/service|protocol|application|app-id|https|http|ssh|dns|tcp|udp/.test(label)) add("service");
    if (/translation|translated|\bnat\b/.test(label)) add("nat");
    if (/route|gateway|distance|next.hop/.test(label)) add("route");
    if (/zone|interface type|physical|assignment/.test(label)) add("zone");
    if (/admin|management|access protocol/.test(label)) add("access");
    if (/order|shadow|first.match|broad|implicit|no policy/.test(label)) add("order");
  }
  if (!selected.length) add(/nat/.test(topic) ? "nat" : /routing/.test(topic) ? "route" : /zone|port/.test(topic) ? "zone" : /interface/.test(topic) ? "subnet" : "policy");
  return selected.slice(0, 3).map(key => hints[key]);
}
