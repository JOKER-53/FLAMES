// Public lesson IDs accepted by progress storage and device caches.
export const COMPLETION_TASKS: Record<"fortigate" | "paloalto", readonly string[]> = {
  fortigate: ["web-server-access-01", "db-lockdown-01", "dmz-multi-service-01", "inter-zone-trust-01", "full-network-policy-01", "multi-system-block-01", "web-filter-instagram-01", "server-segmentation-01", "guest-isolation-01", "multi-dmz-access-01", "firewall-final-01", "interface-ip-01", "interface-access-01", "interface-custom-01", "interface-full-01", "port-assignment-01", "port-multi-dmz-01", "port-redundant-wan-01", "port-large-office-01", "port-position-trap-01", "port-final-01", "routing-static-01"],
  paloalto: ["pan-sec-01", "pan-sec-02", "pan-sec-03", "pan-sec-04", "pan-sec-05", "pan-sec-final", "pan-zone-01", "pan-zone-02", "pan-zone-03", "pan-zone-final", "pan-nat-01", "pan-nat-02", "pan-nat-03", "pan-nat-final", "pan-iface-01", "pan-port-01", "pan-port-02"],
};
export function isCompletionTask(platform: string, id: unknown): id is string {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(COMPLETION_TASKS, platform)
    && COMPLETION_TASKS[platform as keyof typeof COMPLETION_TASKS].includes(id);
}
export function filterCompletionTasks(platform: string, ids: readonly unknown[]): string[] {
  return [...new Set(ids.filter(id => isCompletionTask(platform, id)))] as string[];
}
