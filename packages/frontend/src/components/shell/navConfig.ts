export interface NavItem {
  label: string;
  path: string;
  icon: string;
  children?: NavItem[];
}

export const NAV_STRUCTURE: NavItem[] = [
  {
    label: "Hardware Reference",
    path: "/fortigate",
    icon: "hardware",
  },
  {
    label: "Tasks",
    path: "/fortigate/tasks",
    icon: "dashboard",
    children: [
      { label: "Firewall Policy", path: "/fortigate/tasks/policy", icon: "shield" },
      { label: "Interface Config", path: "/fortigate/tasks/interface", icon: "network" },
      { label: "Port Assignment", path: "/fortigate/tasks/port", icon: "sdwan" },
    ],
  },
  {
    label: "Network",
    path: "/fortigate/network",
    icon: "network",
    children: [
      { label: "Interfaces", path: "/fortigate/network/interfaces", icon: "network" },
      { label: "Static Routes", path: "/fortigate/network/routing", icon: "network" }
    ]
  }
];
