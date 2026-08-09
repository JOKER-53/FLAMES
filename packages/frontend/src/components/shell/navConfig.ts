export interface NavItem {
  label: string;
  path: string;
  icon: string;
  children?: NavItem[];
}

export const NAV_STRUCTURE: NavItem[] = [
  {
    label: "Hardware Reference",
    path: "/",
    icon: "hardware",
  },
  {
    label: "Tasks",
    path: "/tasks",
    icon: "dashboard",
    children: [
      { label: "Firewall Policy", path: "/tasks/policy", icon: "shield" },
      { label: "Interface Config", path: "/tasks/interface", icon: "network" },
      { label: "Port Assignment", path: "/tasks/port", icon: "sdwan" },
    ],
  },
];
