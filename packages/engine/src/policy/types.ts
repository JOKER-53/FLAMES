export type Protocol = "TCP" | "UDP" | "ICMP";

export interface AddressObject {
  id: string;
  name: string;
  type: "subnet" | "range";
  value: string;
  comment?: string;
}

export interface ServiceObject {
  id: string;
  name: string;
  protocol: Protocol;
  port?: string;
  comment?: string;
}

export type InterfaceZone = "WAN" | "LAN" | "DMZ";

export interface WebFilterProfile {
  id: string;
  name: string;
  blockedDomains: string[];
  comment?: string;
}

export interface FirewallPolicy {
  id: string;
  name: string;
  srcIntf: InterfaceZone;
  dstIntf: InterfaceZone;
  srcAddrIds: string[];
  dstAddrIds: string[];
  serviceIds: string[];
  action: "ACCEPT" | "DENY";
  log: boolean;
  enabled: boolean;
  webFilterProfileId?: string;
}

export interface TestPacket {
  id: string;
  description: string;
  srcIntf: InterfaceZone;
  dstIntf: InterfaceZone;
  srcIp: string;
  dstIp: string;
  protocol: Protocol;
  port?: number;
  domain?: string;
}

export interface ExpectedOutcome {
  testPacketId: string;
  expectedAction: "ACCEPT" | "DENY";
  expectedLog?: boolean;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  topologyNote?: string;
  starterAddresses: AddressObject[];
  starterServices: ServiceObject[];
  starterWebFilterProfiles?: WebFilterProfile[];
  testPackets: TestPacket[];
  expectedOutcomes: ExpectedOutcome[];
}

export interface StudentSubmission {
  scenarioId: string;
  addresses: AddressObject[];
  services: ServiceObject[];
  webFilterProfiles?: WebFilterProfile[];
  policies: FirewallPolicy[];
}
