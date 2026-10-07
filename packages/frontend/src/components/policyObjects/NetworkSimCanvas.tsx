import { useEffect, useRef, useCallback } from "react";
import type { AddressObject, TestPacket, PolicyTraceEntry } from "@fortisim/engine";

interface SimTrace {
  packet: TestPacket;
  trace: PolicyTraceEntry[];
  finalAction: "ACCEPT" | "DENY";
}

interface NetworkSimCanvasProps {
  addresses: AddressObject[];
  traces: SimTrace[];
  onClose: () => void;
}

interface Node {
  x: number; y: number;
  label: string; sub: string;
  type: "fw" | "cloud" | "server" | "pc";
  color: string; bg: string;
  zone: "WAN" | "LAN" | "DMZ";
}

type NodeMap = Record<string, Node>;

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function ease(t: number) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2; }

function inferZone(addr: AddressObject): "WAN" | "LAN" | "DMZ" {
  const v = addr.value.toLowerCase();
  if (v.startsWith("10.0.2") || addr.name.toLowerCase().includes("dmz")) return "DMZ";
  if (v.startsWith("10.0.1") || addr.name.toLowerCase().includes("lan")) return "LAN";
  return "WAN";
}

const ZONE_COLORS: Record<string, string> = { WAN: "#f97316", LAN: "#10b981", DMZ: "#3b82f6" };
const ZONE_BG: Record<string, string> = { WAN: "#fff7ed", LAN: "#ecfdf5", DMZ: "#eff6ff" };

export function NetworkSimCanvas({ addresses, traces, onClose }: NetworkSimCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const packetsRef = useRef<any[]>([]);
  const nodesRef = useRef<NodeMap>({});
  const logRef = useRef<HTMLDivElement>(null);

  function buildNodes(W: number, H: number): NodeMap {
    const cx = W / 2, cy = H / 2;
    const nodes: NodeMap = {
      fw: { x: cx, y: cy, label: "FortiGate", sub: "6000F (Simulated)", type: "fw", color: "#DA291C", bg: "#fee2e2", zone: "LAN" },
    };
    const validAddrs = addresses.filter((a) => a.value !== "0.0.0.0/0" && a.value.toLowerCase() !== "all");
    const byZone: Record<string, AddressObject[]> = { WAN: [], LAN: [], DMZ: [] };
    validAddrs.forEach((a) => byZone[inferZone(a)].push(a));

    const zonePos: Record<string, { bx: number; by: number }> = {
      WAN: { bx: cx - W * 0.36, by: cy },
      DMZ: { bx: cx + W * 0.36, by: cy - H * 0.15 },
      LAN: { bx: cx + W * 0.36, by: cy + H * 0.15 },
    };

    Object.entries(byZone).forEach(([zone, addrs]) => {
      addrs.forEach((addr, i) => {
        const spread = (i - (addrs.length - 1) / 2) * 64;
        nodes[addr.id] = {
          x: zonePos[zone].bx,
          y: zonePos[zone].by + spread,
          label: addr.name,
          sub: addr.value.split("/")[0],
          type: zone === "WAN" ? "cloud" : addr.name.toLowerCase().includes("server") ? "server" : "pc",
          color: ZONE_COLORS[zone],
          bg: ZONE_BG[zone],
          zone: zone as "WAN" | "LAN" | "DMZ",
        };
      });
    });
    return nodes;
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
  }

  function drawDevice(ctx: CanvasRenderingContext2D, n: Node, highlight: boolean) {
    const { x, y, label, sub, type, color, bg } = n;
    ctx.save();
    if (highlight) { ctx.shadowColor = color; ctx.shadowBlur = 20; }
    if (type === "fw") {
      ctx.fillStyle = "#1a1a2e"; ctx.strokeStyle = highlight ? "#ff4444" : "#DA291C";
      ctx.lineWidth = highlight ? 3 : 2;
      roundRect(ctx, x-46, y-28, 92, 56, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#DA291C"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("🛡 " + label, x, y - 5);
      ctx.fillStyle = "#888"; ctx.font = "9px monospace"; ctx.fillText(sub, x, y + 10);
    } else if (type === "cloud") {
      ctx.fillStyle = highlight ? "#fde68a" : "#f8fafc";
      ctx.strokeStyle = highlight ? "#f59e0b" : "#94a3b8"; ctx.lineWidth = highlight ? 2 : 1.5;
      ctx.beginPath();
      ctx.ellipse(x, y, 38, 24, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x-22, y+8, 22, 16, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x+20, y+6, 20, 15, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = highlight ? "#92400e" : "#475569";
      ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(label, x, y + 44);
      ctx.fillStyle = "#94a3b8"; ctx.font = "9px monospace"; ctx.fillText(sub, x, y + 56);
    } else if (type === "server") {
      ctx.fillStyle = "#1e293b"; ctx.strokeStyle = highlight ? color : "#475569";
      ctx.lineWidth = highlight ? 2.5 : 1.5;
      roundRect(ctx, x-32, y-28, 64, 56, 8); ctx.fill(); ctx.stroke();
      [y-14, y-2, y+10].forEach((ry) => {
        ctx.fillStyle = "#334155"; ctx.fillRect(x-22, ry-4, 44, 8);
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x+14, ry, 3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#10b981"; ctx.beginPath(); ctx.arc(x+8, ry, 2, 0, Math.PI*2); ctx.fill();
      });
      ctx.fillStyle = highlight ? color : "#94a3b8";
      ctx.font = "bold 9.5px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(label, x, y + 40);
      ctx.fillStyle = "#64748b"; ctx.font = "9px monospace"; ctx.fillText(sub, x, y + 51);
    } else {
      ctx.fillStyle = "#1e293b"; ctx.strokeStyle = highlight ? color : "#475569";
      ctx.lineWidth = highlight ? 2.5 : 1.5;
      roundRect(ctx, x-30, y-24, 60, 48, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#334155"; roundRect(ctx, x-20, y-16, 40, 26, 4); ctx.fill();
      ctx.fillStyle = "#38bdf8"; ctx.fillRect(x-18, y-14, 36, 22);
      ctx.fillStyle = "#475569"; ctx.fillRect(x-4, y+10, 8, 6); ctx.fillRect(x-12, y+16, 24, 3);
      ctx.fillStyle = highlight ? color : "#94a3b8";
      ctx.font = "bold 9.5px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(label, x, y + 36);
      ctx.fillStyle = "#64748b"; ctx.font = "9px monospace"; ctx.fillText(sub, x, y + 47);
    }
    ctx.restore();
  }

  function drawCable(ctx: CanvasRenderingContext2D, from: Node, to: Node, color: string, active: boolean) {
    ctx.save();
    ctx.beginPath(); ctx.moveTo(from.x, from.y);
    const mx = (from.x+to.x)/2, my = (from.y+to.y)/2 - 18;
    ctx.quadraticCurveTo(mx, my, to.x, to.y);
    ctx.strokeStyle = active ? color : color + "44";
    ctx.lineWidth = active ? 2 : 1.5;
    if (active) { ctx.shadowColor = color; ctx.shadowBlur = 6; }
    ctx.stroke();
    [from, to].forEach((pt) => {
      ctx.fillStyle = active ? color : color + "88";
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, Math.PI*2); ctx.fill();
    });
    ctx.restore();
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    const nodes = nodesRef.current;
    const fw = nodes["fw"];
    if (!fw) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.save();
    ctx.strokeStyle = "rgba(148,163,184,0.06)"; ctx.lineWidth = 1;
    for (let x=0; x<W*dpr; x+=20*dpr) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H*dpr); ctx.stroke(); }
    for (let y=0; y<H*dpr; y+=20*dpr) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W*dpr,y); ctx.stroke(); }
    ctx.restore();

    // Zone labels
    const zoneGroups: Record<string, Node[]> = { WAN:[], LAN:[], DMZ:[] };
    Object.entries(nodes).forEach(([k,n]) => { if (k!=="fw") zoneGroups[n.zone]?.push(n); });
    Object.entries(zoneGroups).forEach(([zone, ns]) => {
      if (!ns.length) return;
      const avgX = ns.reduce((s,n)=>s+n.x,0)/ns.length;
      const minY = Math.min(...ns.map(n=>n.y)) - 55;
      ctx.save();
      ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
      ctx.fillStyle = ZONE_COLORS[zone] + "99";
      ctx.fillText("── " + zone + " ──", avgX, minY);
      ctx.restore();
    });

    // Active packet nodes for cable highlighting
    const activeNodes = new Set(packetsRef.current.filter(p=>!p.done).map(p=>p.activeNode));

    // Cables
    Object.entries(nodes).forEach(([k, n]) => {
      if (k === "fw") return;
      const active = activeNodes.has(k) || activeNodes.has("fw");
      drawCable(ctx, fw, n, ZONE_COLORS[n.zone], active);
    });

    // Packets
    packetsRef.current.forEach((p) => {
      if (!p.done) {
        ctx.save();
        ctx.shadowColor = p.color; ctx.shadowBlur = 12;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.px*dpr, p.py*dpr, 7*dpr, 0, Math.PI*2); ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.font = `bold ${9*dpr}px monospace`; ctx.fillStyle = "#fff"; ctx.textAlign = "center";
        ctx.fillText(p.svc, p.px*dpr, (p.py-14)*dpr);
        ctx.restore();
      } else if (p.fade > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.fade);
        ctx.shadowColor = p.color; ctx.shadowBlur = 16;
        ctx.font = `bold ${20*dpr}px sans-serif`; ctx.fillStyle = p.color; ctx.textAlign = "center";
        ctx.fillText(p.finalAction === "ACCEPT" ? "✓" : "✕", p.px*dpr, p.py*dpr);
        ctx.restore();
      }
    });

    // Devices
    ctx.save(); ctx.scale(dpr, dpr);
    Object.entries(nodes).forEach(([k, n]) => {
      const hl = packetsRef.current.some(p => p.activeNode === k && !p.done);
      drawDevice(ctx, n, hl);
    });
    ctx.restore();
  }, []);

  function addLog(msg: string, color: string) {
    if (!logRef.current) return;
    const d = document.createElement("div");
    d.style.color = color; d.style.padding = "1px 0";
    d.textContent = "› " + msg;
    logRef.current.appendChild(d);
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }

  function startAnimLoop() {
    function frame() {
      let anyActive = false;
      const nodes = nodesRef.current;
      const fw = nodes["fw"];
      packetsRef.current.forEach((p) => {
        if (p.done) {
          if (p.fade > 0) { p.fade -= 0.016; anyActive = true; }
          return;
        }
        anyActive = true;
        if (!p.atFW) {
          p.t += 0.02;
          if (p.t >= 1) {
            p.t = 1; p.atFW = true;
            p.px = fw.x; p.py = fw.y; p.activeNode = "fw";
            addLog(p.svc + " → FortiGate: evaluating...", "#f59e0b");
            setTimeout(() => { p.phase2 = true; }, 500);
          } else {
            p.px = lerp(p.fx, fw.x, ease(p.t));
            p.py = lerp(p.fy, fw.y, ease(p.t));
            p.activeNode = null;
          }
        } else if (p.phase2) {
          if (p.finalAction === "ACCEPT") {
            p.t2 += 0.02;
            if (p.t2 >= 1) {
              p.done = true; p.fade = 2.5; p.px = p.tx; p.py = p.ty;
              addLog("✓ ACCEPTED — " + p.svc, "#10b981");
            } else {
              p.px = lerp(fw.x, p.tx, ease(p.t2));
              p.py = lerp(fw.y, p.ty, ease(p.t2));
              p.activeNode = "fw";
            }
          } else {
            p.t2 += 0.028;
            p.px = fw.x + Math.sin(p.t2*15)*9*Math.max(0,1-p.t2);
            p.py = fw.y + Math.cos(p.t2*10)*5*Math.max(0,1-p.t2);
            p.activeNode = "fw";
            if (p.t2 >= 1) {
              p.done = true; p.fade = 2.5; p.px = fw.x; p.py = fw.y;
              addLog("✕ DENIED — " + p.svc, "#ef4444");
            }
          }
        }
      });
      draw();
      if (anyActive) animRef.current = requestAnimationFrame(frame);
    }
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(frame);
  }

  function runSimulation() {
    cancelAnimationFrame(animRef.current);
    packetsRef.current = [];
    if (logRef.current) logRef.current.innerHTML = "";
    addLog(`Starting simulation — ${traces.length} test packets`, "#94a3b8");
    const nodes = nodesRef.current;

    traces.forEach((trace, i) => {
      setTimeout(() => {
        const pkt = trace.packet;
        const srcNode = Object.values(nodes).find(n => n.sub === pkt.srcIp) ||
          Object.values(nodes).find(n => n.zone === pkt.srcIntf && n.type === "cloud") ||
          nodes["fw"];
        const dstNode = Object.values(nodes).find(n => n.sub === pkt.dstIp) || nodes["fw"];
        const color = trace.finalAction === "ACCEPT" ? "#10b981" : "#ef4444";
        const svc = pkt.protocol + (pkt.port ? `/${pkt.port}` : "") + (pkt.domain ? ` [${pkt.domain}]` : "");
        addLog(`Pkt ${i+1}: ${pkt.description}`, "#64748b");
        packetsRef.current.push({
          svc, color, finalAction: trace.finalAction,
          fx: srcNode.x, fy: srcNode.y, tx: dstNode.x, ty: dstNode.y,
          px: srcNode.x, py: srcNode.y,
          t: 0, atFW: false, phase2: false, t2: 0,
          done: false, fade: 0, activeNode: null,
        });
        startAnimLoop();
      }, i * 1300);
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    function resize() {
      if (!canvas || !canvas.parentElement) return;
      const rect = canvas.parentElement!.getBoundingClientRect();
      const W = rect.width;
      const H = Math.max(340, W * 0.5);
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      nodesRef.current = buildNodes(W, H);
      draw();
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [addresses, draw]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (traces.length > 0) {
      timer = setTimeout(() => runSimulation(), 300);
    }
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animRef.current);
    };
  }, [traces]);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col" style={{ maxHeight: "92vh" }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
            </div>
            <span className="text-[13px] font-semibold text-gray-200">FortiSim — Network Simulation</span>
            <span className="text-[10px] text-gray-500 font-mono">FortiGate-6000F (Simulated)</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 text-xl leading-none px-1 transition-colors">×</button>
        </div>

        <canvas ref={canvasRef} className="block w-full" />

        <div
          ref={logRef}
          className="px-4 py-2 font-mono text-[11px] overflow-y-auto"
          style={{ minHeight: 72, maxHeight: 100, background: "#020617", color: "#64748b" }}
        />

        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-700 bg-gray-800">
          <div className="flex items-center gap-4 text-[11px] text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>ACCEPT</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>DENY</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block"></span>WAN</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>LAN</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>DMZ</span>
          </div>
          <button
            onClick={runSimulation}
            className="px-4 py-1.5 bg-forti-red text-white rounded-sm text-[12px] hover:bg-forti-red/90 font-medium"
          >
            ▶ Replay
          </button>
        </div>
      </div>
    </div>
  );
}
