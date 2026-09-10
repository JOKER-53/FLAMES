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
  if (!config) {
    return { success: false, message: "No routing configuration provided." };
  }
  if (expectedConfig.staticRoutes) {
    const missing = expectedConfig.staticRoutes.find(expected =>
      !config.staticRoutes.some(route =>
        route.destination === expected.destination &&
        route.gateway === expected.gateway &&
        route.interfaceName === expected.interfaceName &&
        route.distance === expected.distance
      )
    );
    if (missing) return { success: false, message: "A required static route is missing or has incorrect settings." };
  }

  if (expectedConfig.ospf) {
    if (!config.ospf || config.ospf.routerId !== expectedConfig.ospf.routerId) {
      return { success: false, message: "The OSPF router ID is missing or incorrect." };
    }
    const missingNetwork = expectedConfig.ospf.networks.find(expected =>
      !config.ospf!.networks.some(network => network.prefix === expected.prefix && network.area === expected.area)
    );
    if (missingNetwork) return { success: false, message: "A required OSPF network or area is missing." };
  }

  if (expectedConfig.sdwanMembers) {
    const missingMember = expectedConfig.sdwanMembers.find(expected =>
      !config.sdwanMembers.some(member => member.interfaceName === expected.interfaceName && member.gateway === expected.gateway)
    );
    if (missingMember) return { success: false, message: "A required SD-WAN member is missing or incorrect." };
  }

  if (expectedConfig.sdwanRules) {
    const missingRule = expectedConfig.sdwanRules.find(expected =>
      !config.sdwanRules.some(rule =>
        rule.name === expected.name && rule.srcAddress === expected.srcAddress &&
        rule.dstAddress === expected.dstAddress && rule.strategy === expected.strategy &&
        expected.preferredMembers.every(member => rule.preferredMembers.includes(member))
      )
    );
    if (missingRule) return { success: false, message: "A required SD-WAN rule is missing or incorrect." };
  }

  return { success: true, message: "Routing configuration passes." };
}
