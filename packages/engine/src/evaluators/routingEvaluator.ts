export interface StaticRoute {
  id: string;
  destination: string; // e.g., "0.0.0.0/0"
  gateway: string;
  interfaceName: string;
  distance: number;
}

export interface OSPFNetwork {
  prefix: string;
  area: string;
}

export interface OSPFConfig {
  routerId: string;
  networks: OSPFNetwork[];
}

export interface SDWANMember {
  interfaceName: string;
  gateway: string;
}

export interface SDWANRule {
  id: string;
  name: string;
  srcAddress: string;
  dstAddress: string;
  strategy: "best-quality" | "lowest-cost" | "manual";
  preferredMembers: string[];
}

export interface RoutingConfiguration {
  staticRoutes: StaticRoute[];
  ospf?: OSPFConfig;
  sdwanMembers: SDWANMember[];
  sdwanRules: SDWANRule[];
}

export interface RoutingEvaluationResult {
  success: boolean;
  message: string;
}

export function evaluateRoutingConfiguration(
  config: RoutingConfiguration,
  expectedConfig: Partial<RoutingConfiguration>
): RoutingEvaluationResult {
  // Dummy evaluation logic
  if (!config) {
    return { success: false, message: "No routing configuration provided." };
  }
  return { success: true, message: "Routing configuration passes." };
}
