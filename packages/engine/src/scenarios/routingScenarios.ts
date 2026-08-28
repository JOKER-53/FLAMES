import { RoutingConfiguration } from "../evaluators/routingEvaluator";

export interface RoutingScenario {
  id: string;
  title: string;
  description: string;
  expectedConfig: Partial<RoutingConfiguration>;
}

export const staticRoutingScenario: RoutingScenario = {
  id: "routing-static-01",
  title: "Basic Static Routing",
  description: "Configure a default static route pointing to the ISP gateway.",
  expectedConfig: {
    staticRoutes: [
      {
        id: "route-1",
        destination: "0.0.0.0/0",
        gateway: "192.168.1.254",
        interfaceName: "port1",
        distance: 10
      }
    ]
  }
};

export const ospfRoutingScenario: RoutingScenario = {
  id: "routing-ospf-01",
  title: "Basic OSPF Setup",
  description: "Configure OSPF with a single area.",
  expectedConfig: {
    ospf: {
      routerId: "10.0.0.1",
      networks: [
        { prefix: "10.0.0.0/24", area: "0.0.0.0" }
      ]
    }
  }
};

export const sdwanScenario: RoutingScenario = {
  id: "sdwan-01",
  title: "SD-WAN Initial Setup",
  description: "Configure SD-WAN with two members and a best-quality rule.",
  expectedConfig: {
    sdwanMembers: [
      { interfaceName: "port1", gateway: "192.168.1.254" },
      { interfaceName: "port2", gateway: "10.10.10.254" }
    ],
    sdwanRules: [
      {
        id: "rule-1",
        name: "Video-Traffic",
        srcAddress: "all",
        dstAddress: "all",
        strategy: "best-quality",
        preferredMembers: ["port1", "port2"]
      }
    ]
  }
};

export const routingScenarios = [
  staticRoutingScenario,
  ospfRoutingScenario,
  sdwanScenario
];
