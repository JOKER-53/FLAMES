interface InterfaceSettings { id: string; type: string; zone: string; ip: string; }
export function gradePanInterfaces(ifaces: InterfaceSettings[]) {
  return [
    { desc: "ethernet1/1 is a Layer 3 interface in Untrust with 203.0.113.1/30", pass: ifaces.some(i => i.id === "ethernet1/1" && i.type === "layer3" && i.zone === "Untrust" && i.ip.trim() === "203.0.113.1/30") },
    { desc: "ethernet1/2 is a Layer 3 interface in Trust with 10.0.0.1/24", pass: ifaces.some(i => i.id === "ethernet1/2" && i.type === "layer3" && i.zone === "Trust" && i.ip.trim() === "10.0.0.1/24") },
    { desc: "MGT is a management interface with 192.168.1.1/24 and no security zone", pass: ifaces.some(i => i.id === "management" && i.type === "management" && i.zone === "—" && i.ip.trim() === "192.168.1.1/24") },
  ];
}
