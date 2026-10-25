import type { InterfaceConfig } from "@fortisim/engine";

interface InterfaceTopologyProps {
  interfaces: InterfaceConfig[];
  focus?: "ip" | "access" | "all";
}

const ROLE_ORDER: Array<InterfaceConfig["role"]> = ["WAN", "DMZ", "LAN"];
const ROLE_DOT: Record<string, string> = {
  WAN: "#fb923c",
  DMZ: "#60a5fa",
  LAN: "#10b981",
};

const CANVAS_STYLE: React.CSSProperties = {
  backgroundColor: "rgb(var(--sunken))",
  backgroundImage: "radial-gradient(rgb(var(--line-strong)) 1px, transparent 1px)",
  backgroundSize: "16px 16px",
};

function ConnectorDot({ color }: { color: string }) {
  return <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />;
}

function CloudIcon() {
  return (
    <svg width="28" height="18" viewBox="0 0 30 20">
      <path
        d="M7 16c-3 0-5-2-5-4.5S4 7 7 7c.5-3 3-5 6.5-5S19 4 19.5 7c2.8.2 5 2.3 5 5s-2.2 5-5 5H7Z"
        fill="#f3f4f6" stroke="#9ca3af" strokeWidth="1.5"
      />
    </svg>
  );
}

function SwitchIcon() {
  return (
    <svg width="28" height="16" viewBox="0 0 30 18">
      <rect x="1" y="4" width="28" height="10" rx="1.5" fill="#e5e7eb" stroke="#6b7280" strokeWidth="1.5" />
      {[5, 10, 15, 20, 25].map((x) => (
        <rect key={x} x={x} y={7} width="2.5" height="4" fill="#10b981" />
      ))}
    </svg>
  );
}

export function InterfaceTopology({ interfaces, focus = "all" }: InterfaceTopologyProps) {
  const byRole = (role: string) => interfaces.find((i) => i.role === role);

  const focusLabel =
    focus === "ip" ? "This task tests IP address and subnet assignment"
    : focus === "access" ? "This task tests administrative access restrictions per zone"
    : "This task tests full interface configuration";

  return (
    <section aria-label="Network topology" className="bg-surface border border-line rounded-md p-4 min-w-0">
      <div className="text-[12px] font-medium text-body mb-1 uppercase tracking-wide">Network Topology</div>
      <div className="text-[10.5px] text-faint mb-3">{focusLabel}</div>

      <div className="rounded border border-line p-4" style={CANVAS_STYLE}>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {ROLE_ORDER.map((role, idx) => {
            const intf = byRole(role);
            const hasIp = intf && intf.ip.trim() !== "";
            return (
              <div key={role} className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-16 h-12 rounded-sm bg-surface border-2 flex items-center justify-center shadow-sm ${focus === "ip" ? "ring-2 ring-forti-red/30" : ""}`} style={{ borderColor: intf ? ROLE_DOT[role] : "#e5e7eb" }}>
                    {role === "WAN" ? <CloudIcon /> : <SwitchIcon />}
                  </div>
                  <div className="text-[9.5px] font-bold px-2 py-0.5 rounded text-ink bg-surface border" style={{ borderColor: ROLE_DOT[role] }}>
                    {role}
                  </div>
                  {(focus === "ip" || focus === "all") && (
                    <div className="text-[9.5px] font-mono text-body min-h-[14px]">
                      {hasIp ? `${intf!.ip}${intf!.subnet ? `/${intf!.subnet}` : ""}` : "—"}
                    </div>
                  )}
                  {(focus === "access" || focus === "all") && intf && (
                    <div className="flex gap-0.5 flex-wrap justify-center max-w-[64px]">
                      {intf.adminAccess.length === 0 ? (
                        <span className="text-[8px] text-muted">no access</span>
                      ) : (
                        intf.adminAccess.map((a) => (
                          <span key={a} className="text-[7.5px] px-1 py-0.5 rounded bg-gray-700 text-white font-medium">
                            {a}
                          </span>
                        ))
                      )}
                    </div>
                  )}
                  <ConnectorDot color={ROLE_DOT[role]} />
                  <div className="w-px h-3" style={{ backgroundColor: ROLE_DOT[role] }}></div>
                </div>
                {idx < ROLE_ORDER.length - 1 && (
                  <div className="w-4 h-px bg-gray-300 self-start mt-6"></div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-center">
          <div className="border-2 border-forti-red rounded-md px-4 py-2 bg-surface flex items-center gap-2 shadow-sm">
            <svg width="16" height="16" viewBox="0 0 18 18">
              <path d="M9 1.5 15 3.5v5c0 4-3 6.5-6 8-3-1.5-6-4-6-8v-5L9 1.5Z" fill="#fee2e2" stroke="#DA291C" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
            <span className="text-[10.5px] font-bold text-forti-red">FortiGate</span>
          </div>
        </div>
      </div>
    </section>
  );
}
