import { parseCidr, ipToInt } from "../policy/matching";

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
  const sameNetwork = (a: string, b: string) => {
    const left = parseCidr(a), right = parseCidr(b);
    return left.start === right.start && left.end === right.end;
  };
  try {
    if (!Array.isArray(config.staticRoutes) || !Array.isArray(config.sdwanMembers) || !Array.isArray(config.sdwanRules)) {
      return { success: false, message: "Invalid routing configuration." };
    }
    const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
    const text = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 1000;
    if (config.staticRoutes.length > 200 || config.sdwanMembers.length > 200 || config.sdwanRules.length > 200 ||
      config.sdwanMembers.some(member => !record(member) || !text(member.interfaceName) || !text(member.gateway)) ||
      config.sdwanRules.some(rule => !record(rule) || !text(rule.name) || !text(rule.srcAddress) || !text(rule.dstAddress) || !["best-quality", "lowest-cost", "manual"].includes(rule.strategy) || !Array.isArray(rule.preferredMembers) || rule.preferredMembers.length > 200 || !rule.preferredMembers.every(text)) ||
      config.ospf && (!record(config.ospf) || !text(config.ospf.routerId) || !Array.isArray(config.ospf.networks) || config.ospf.networks.length > 200 || config.ospf.networks.some(network => !record(network) || !text(network.prefix) || !text(network.area)))) {
      return { success: false, message: "Invalid routing configuration." };
    }
    for (const route of config.staticRoutes) {
      parseCidr(route.destination); ipToInt(route.gateway);
      if (!route.interfaceName.trim() || !Number.isInteger(route.distance) || route.distance < 1 || route.distance > 255) {
        return { success: false, message: "Invalid static route settings." };
      }
    }
    if (expectedConfig.staticRoutes) {
      for (const expected of expectedConfig.staticRoutes) {
        const correct = (route: StaticRoute) => route.gateway === expected.gateway && route.interfaceName === expected.interfaceName;
        const candidates = config.staticRoutes.filter(route => sameNetwork(route.destination, expected.destination));
        if (!candidates.some(route => correct(route) && route.distance === expected.distance)) {
          return { success: false, message: "A required static route is missing or has incorrect settings." };
        }
        const minimum = Math.min(...candidates.map(route => route.distance));
        if (candidates.some(route => route.distance === minimum && !correct(route))) {
          return { success: false, message: "A conflicting static route takes priority or creates an equal-cost path." };
        }
      }
    }
  } catch {
    return { success: false, message: "Invalid static route settings." };
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
