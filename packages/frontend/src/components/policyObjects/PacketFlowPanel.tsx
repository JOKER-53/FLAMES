import { useState, useEffect, useRef } from "react";
import type { TestPacket, PolicyTraceEntry } from "@fortisim/engine";

interface PacketFlowPanelProps {
  traces: { packet: TestPacket; trace: PolicyTraceEntry[]; finalAction: "ACCEPT" | "DENY" }[];
}

const NODE_HEIGHT = 46;
const NODE_GAP = 14;
const NODE_WIDTH = 260;
const WIRE_X = 24;
const TOP_PADDING = 36;

export function PacketFlowPanel({ traces }: PacketFlowPanelProps) {
  const [index, setIndex] = useState(0);
  const [activeNode, setActiveNode] = useState(-1);
  const [packetY, setPacketY] = useState(TOP_PADDING);
  const [showTerminal, setShowTerminal] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const current = traces[index];

  useEffect(() => {
    setIndex(0);
  }, [traces.length]);

  useEffect(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setActiveNode(-1);
    setPacketY(TOP_PADDING);
    setShowTerminal(false);

    if (!current) return;

    const stepHeight = NODE_HEIGHT + NODE_GAP;
    let delay = 250;

    current.trace.forEach((step, i) => {
      const nodeCenterY = TOP_PADDING + i * stepHeight + NODE_HEIGHT / 2;
      const t1 = setTimeout(() => {
        setPacketY(nodeCenterY);
        setActiveNode(i);
      }, delay);
      timeoutsRef.current.push(t1);
      delay += 480;
    });

    const tFinal = setTimeout(() => {
      setShowTerminal(true);
    }, delay + 150);
    timeoutsRef.current.push(tFinal);

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, [index, current]);

  if (traces.length === 0) {
    return (
      <div className="bg-surface border border-line rounded-md p-5 text-center">
        <div className="text-[12.5px] text-faint">
          Click "Run Packet Test (Visual)" below to see test packets flow through your policies.
        </div>
      </div>
    );
  }

  if (!current) return null;

  function goNext() {
    if (index < traces.length - 1) setIndex(index + 1);
  }
  function goPrev() {
    if (index > 0) setIndex(index - 1);
  }

  const stepHeight = NODE_HEIGHT + NODE_GAP;
  const wireBottom = TOP_PADDING + current.trace.length * stepHeight;
  const svgHeight = wireBottom + 70;
  const matchedIndex = current.trace.findIndex((s) => s.matched);

  return (
    <div className="bg-surface border border-line rounded-md overflow-hidden sticky top-4">
      <div className="px-4 py-2.5 border-b border-line bg-sunken flex items-center justify-between">
        <span className="text-[13px] font-semibold text-forti-dark">Packet Flow</span>
        <span className="text-[11px] text-faint">{index + 1} / {traces.length}</span>
      </div>

      <div className="p-4">
        <div className="bg-sunken border border-line rounded-md p-2.5 mb-3">
          <div className="text-[11.5px] font-medium text-ink mb-1">{current.packet.description}</div>
          <div className="text-[10.5px] text-body font-mono">
            {current.packet.srcIp} → {current.packet.dstIp} · {current.packet.protocol}
            {current.packet.port !== undefined ? `/${current.packet.port}` : ""}
          </div>
        </div>

        <svg width="100%" height={svgHeight} viewBox={`0 0 ${NODE_WIDTH + 40} ${svgHeight}`} className="block">
          <line
            x1={WIRE_X} y1={4}
            x2={WIRE_X} y2={wireBottom + 20}
            stroke="#d1d5db" strokeWidth={2}
          />

          {current.trace.map((step, i) => {
            const y = TOP_PADDING + i * stepHeight;
            const isPast = i < activeNode || (i === activeNode && showTerminal);
            const isActive = i === activeNode && !showTerminal;
            const nodeColor = step.matched
              ? "#10b981"
              : isPast || isActive
                ? "#9ca3af"
                : "#e5e7eb";
            return (
              <g key={i} style={{ transition: "opacity 0.2s" }} opacity={i <= activeNode ? 1 : 0.35}>
                <circle cx={WIRE_X} cy={y + NODE_HEIGHT / 2} r={5} fill={nodeColor} />
                <rect
                  x={WIRE_X + 16} y={y}
                  width={NODE_WIDTH - WIRE_X} height={NODE_HEIGHT}
                  rx={5}
                  fill={step.matched ? "#ecfdf5" : "#f9fafb"}
                  stroke={step.matched ? "#6ee7b7" : "#e5e7eb"}
                  strokeWidth={1.5}
                />
                <text x={WIRE_X + 26} y={y + 18} fontSize="11" fontWeight={600} fill="#1f2937">
                  {step.policyName.length > 28 ? step.policyName.slice(0, 26) + "…" : step.policyName}
                </text>
                <text x={WIRE_X + 26} y={y + 33} fontSize="9.5" fill="#6b7280">
                  {step.reason.length > 42 ? step.reason.slice(0, 40) + "…" : step.reason}
                </text>
                {step.matched && (
                  <text x={NODE_WIDTH - 6} y={y + 18} fontSize="9" fontWeight={700} fill="#059669" textAnchor="end">
                    MATCH
                  </text>
                )}
              </g>
            );
          })}

          {!showTerminal && (
            <circle
              cx={WIRE_X}
              cy={packetY}
              r={7}
              fill="#DA291C"
              style={{ transition: "cy 0.4s cubic-bezier(0.4, 0, 0.2, 1)" }}
            >
              <animate attributeName="r" values="7;9;7" dur="0.8s" repeatCount="indefinite" />
            </circle>
          )}

          {showTerminal && (
            <g style={{ animation: "popIn 0.3s ease-out" }}>
              <rect
                x={WIRE_X + 16} y={wireBottom}
                width={NODE_WIDTH - WIRE_X} height={36}
                rx={5}
                fill={current.finalAction === "ACCEPT" ? "#ecfdf5" : "#fef2f2"}
                stroke={current.finalAction === "ACCEPT" ? "#34d399" : "#f87171"}
                strokeWidth={2}
              />
              <text
                x={WIRE_X + 16 + (NODE_WIDTH - WIRE_X) / 2} y={wireBottom + 23}
                fontSize="13" fontWeight={700}
                fill={current.finalAction === "ACCEPT" ? "#059669" : "#dc2626"}
                textAnchor="middle"
              >
                {current.finalAction === "ACCEPT" ? "✓ ACCEPTED" : "✕ DENIED"}
                {matchedIndex === -1 ? " (default-deny)" : ""}
              </text>
            </g>
          )}
        </svg>

        <div className="flex items-center justify-between pt-3 mt-1 border-t border-line">
          <button
            onClick={goPrev}
            disabled={index === 0}
            className="px-2 py-1 border border-line-strong rounded-sm text-[11px] text-body hover:bg-sunken disabled:opacity-30"
          >
            ← Prev
          </button>
          <div className="flex gap-1">
            {traces.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === index ? "bg-forti-red" : "bg-gray-300"}`}></div>
            ))}
          </div>
          <button
            onClick={goNext}
            disabled={index === traces.length - 1}
            className="px-2 py-1 border border-line-strong rounded-sm text-[11px] text-body hover:bg-sunken disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
