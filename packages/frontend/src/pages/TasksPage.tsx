import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchScenarioList } from "../api/client";
import { ALL_INTERFACE_SCENARIOS, ALL_PORT_SCENARIOS } from "@fortisim/engine";
import { ScenarioSession } from "../hooks/useScenarioSession";

interface TasksPageProps {
  session: ScenarioSession;
}

interface TaskEntry {
  id: string;
  title: string;
  description: string;
  track: "policy" | "interface" | "port";
  difficulty: number;
  isFinal?: boolean;
}

const TRACK_META = {
  port: { label: "Port Assignment", dot: "bg-emerald-500", icon: "🔌" },
  interface: { label: "Interface Config", dot: "bg-blue-500", icon: "⚙️" },
  policy: { label: "Firewall Policy", dot: "bg-forti-red", icon: "🛡️" },
};

function DifficultyStars({ level, max = 5 }: { level: number; max?: number }) {
  const stars = Math.round((level / 10) * max);
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} className={`w-2 h-2 rounded-full ${i < stars ? "bg-amber-400" : "bg-gray-200"}`} />
      ))}
    </div>
  );
}

export function TasksPage({ session }: TasksPageProps) {
  const navigate = useNavigate();
  const [policyScenarios, setPolicyScenarios] = useState<{ id: string; title: string; description: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchScenarioList()
      .then(setPolicyScenarios)
      .catch((err) => setError(err.message ?? "Failed to load tasks"));
  }, []);

  if (error) return <div className="text-red-600 text-[12.5px]">{error}</div>;
  if (!policyScenarios) return <div className="text-gray-500 text-[12.5px]">Loading tasks…</div>;

  const ps = policyScenarios;
  const regularTasks: TaskEntry[] = [
    { id: ALL_PORT_SCENARIOS[0].id, title: ALL_PORT_SCENARIOS[0].title, description: ALL_PORT_SCENARIOS[0].description, track: "port", difficulty: 1 },
    { id: ALL_INTERFACE_SCENARIOS[0].id, title: ALL_INTERFACE_SCENARIOS[0].title, description: ALL_INTERFACE_SCENARIOS[0].description, track: "interface", difficulty: 1 },
    { id: ALL_INTERFACE_SCENARIOS[1].id, title: ALL_INTERFACE_SCENARIOS[1].title, description: ALL_INTERFACE_SCENARIOS[1].description, track: "interface", difficulty: 2 },
    { id: ALL_PORT_SCENARIOS[1].id, title: ALL_PORT_SCENARIOS[1].title, description: ALL_PORT_SCENARIOS[1].description, track: "port", difficulty: 2 },
    { id: ps[0]?.id, title: ps[0]?.title, description: ps[0]?.description, track: "policy", difficulty: 3 },
    { id: ALL_PORT_SCENARIOS[2].id, title: ALL_PORT_SCENARIOS[2].title, description: ALL_PORT_SCENARIOS[2].description, track: "port", difficulty: 3 },
    { id: ps[1]?.id, title: ps[1]?.title, description: ps[1]?.description, track: "policy", difficulty: 4 },
    { id: ALL_INTERFACE_SCENARIOS[2].id, title: ALL_INTERFACE_SCENARIOS[2].title, description: ALL_INTERFACE_SCENARIOS[2].description, track: "interface", difficulty: 4 },
    { id: ps[2]?.id, title: ps[2]?.title, description: ps[2]?.description, track: "policy", difficulty: 5 },
    { id: ALL_PORT_SCENARIOS[3].id, title: ALL_PORT_SCENARIOS[3].title, description: ALL_PORT_SCENARIOS[3].description, track: "port", difficulty: 5 },
    { id: ps[3]?.id, title: ps[3]?.title, description: ps[3]?.description, track: "policy", difficulty: 6 },
    { id: ALL_PORT_SCENARIOS[4].id, title: ALL_PORT_SCENARIOS[4].title, description: ALL_PORT_SCENARIOS[4].description, track: "port", difficulty: 6 },
    { id: ps[4]?.id, title: ps[4]?.title, description: ps[4]?.description, track: "policy", difficulty: 7 },
    { id: ps[5]?.id, title: ps[5]?.title, description: ps[5]?.description, track: "policy", difficulty: 8 },
    { id: ps[6]?.id, title: ps[6]?.title, description: ps[6]?.description, track: "policy", difficulty: 8 },
    { id: ps[7]?.id, title: ps[7]?.title, description: ps[7]?.description, track: "policy", difficulty: 9 },
    { id: ps[8]?.id, title: ps[8]?.title, description: ps[8]?.description, track: "policy", difficulty: 9 },
    { id: ps[9]?.id, title: ps[9]?.title, description: ps[9]?.description, track: "policy", difficulty: 10 },
  ].filter((t) => t.id);

  const finalTasks: TaskEntry[] = [
    { id: "port-final-01", title: "🏆 Port Assignment Final", description: "The complete port challenge combining all concepts: redundant WAN, multi-server DMZ, large LAN, spare port, and a trick port.", track: "port", difficulty: 10, isFinal: true },
    { id: ALL_INTERFACE_SCENARIOS[2].id, title: "🏆 Interface Config Final", description: "Configure all interfaces from scratch: IPs, subnets, and administrative access — the complete setup a network admin performs before writing policies.", track: "interface", difficulty: 10, isFinal: true },
    { id: ps[10]?.id ?? "firewall-final-01", title: "🏆 Firewall Policy Final", description: "The ultimate challenge: multiple systems, DMZ servers, guest isolation, web filtering, and inter-zone security all in one.", track: "policy", difficulty: 10, isFinal: true },
  ].filter((t) => t.id);

  const trackGroups: Record<string, { regular: TaskEntry[]; final: TaskEntry | null }> = {
    port: { regular: [], final: null },
    interface: { regular: [], final: null },
    policy: { regular: [], final: null },
  };

  regularTasks.forEach((t) => trackGroups[t.track].regular.push(t));
  finalTasks.forEach((t) => { trackGroups[t.track].final = t; });

  function isTrackComplete(track: string): boolean {
    return trackGroups[track].regular.every((t) => session.completedTaskIds.has(t.id));
  }

  function isFinalUnlocked(track: string): boolean {
    return true; // Final is always accessible
  }

  function isFinalCompleted(track: string): boolean {
    const f = trackGroups[track].final;
    return f ? session.completedTaskIds.has(f.id) : false;
  }

  function trackProgress(track: string): number {
    if (isFinalCompleted(track)) return 100;
    const regular = trackGroups[track].regular;
    const done = regular.filter((t) => session.completedTaskIds.has(t.id)).length;
    return Math.round((done / regular.length) * 99); // max 99% until final passed
  }

  const overallPct = Math.round(
    (["port", "interface", "policy"].reduce((s, t) => s + trackProgress(t), 0)) / 3
  );

  function handleSelect(task: TaskEntry, locked = false) {
    if (locked) return;
    if (task.track === "policy") {
      session.selectScenario(task.id);
      navigate("/fortigate/policy/firewall-policy");
    } else {
      navigate(`/network/interfaces?track=${task.track}&scenario=${task.id}`);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-forti-dark mb-1">FortiSim Training Tasks</h1>
        <p className="text-gray-500 text-[12.5px]">Complete all exercises in a track to unlock its Final Assignment. Pass the Final to mark the track 100%.</p>
      </div>

      {/* Overall progress */}
      <div className="bg-white border border-gray-200 rounded-md p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-semibold text-gray-700">Overall Progress</span>
          <span className="text-[13px] font-bold text-forti-red">{overallPct}%</span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-forti-red rounded-full transition-all duration-500" style={{ width: `${overallPct}%` }} />
        </div>
        <div className="flex justify-between mt-2">
          {(["port", "interface", "policy"] as const).map((track) => {
            const pct = trackProgress(track);
            const meta = TRACK_META[track];
            return (
              <div key={track} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <div className={`w-2 h-2 rounded-full ${meta.dot}`}></div>
                {meta.label}: {pct}%
              </div>
            );
          })}
        </div>
      </div>

      {/* Track groups */}
      {(["port", "interface", "policy"] as const).map((track) => {
        const meta = TRACK_META[track];
        const { regular, final } = trackGroups[track];
        const pct = trackProgress(track);
        const finalUnlocked = isFinalUnlocked(track);
        const finalDone = isFinalCompleted(track);
        const isCollapsed = collapsed[track];

        return (
          <div key={track} className="mb-4">
            <button
              onClick={() => setCollapsed((prev) => ({ ...prev, [track]: !prev[track] }))}
              className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-md px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{meta.icon}</span>
                <div className="text-left">
                  <div className="text-[13.5px] font-semibold text-gray-800">{meta.label}</div>
                  <div className="text-[11px] text-gray-400">
                    {finalDone ? "Complete ✓" : `${pct}% complete`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${finalDone ? "bg-emerald-500" : meta.dot}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[11px] font-bold text-gray-500">{pct}%</span>
                <span className="text-gray-400 text-[12px]">{isCollapsed ? "▶" : "▼"}</span>
              </div>
            </button>

            {!isCollapsed && (
              <div className="border border-t-0 border-gray-200 rounded-b-md overflow-hidden">
                {regular.map((task, idx) => {
                  const completed = session.completedTaskIds.has(task.id);
                  return (
                    <div
                      key={task.id}
                      onClick={() => handleSelect(task)}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${completed ? "bg-emerald-50 hover:bg-emerald-100" : "bg-white hover:bg-gray-50"}`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 ${completed ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                        {completed ? "✓" : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[13px] font-medium ${completed ? "text-emerald-700" : "text-gray-800"}`}>{task.title}</span>
                          <DifficultyStars level={task.difficulty} />
                          {completed && <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium border border-emerald-200">Done</span>}
                        </div>
                        <p className="text-[11.5px] text-gray-500 leading-relaxed line-clamp-2">{task.description}</p>
                      </div>
                      <div className="shrink-0 text-gray-300 text-[12px] mt-1">›</div>
                    </div>
                  );
                })}

                {/* Final Assignment */}
                {final && (
                  <div
                    onClick={() => finalUnlocked && handleSelect(final)}
                    className={`flex items-start gap-3 px-4 py-4 border-t-2 transition-colors cursor-pointer ${
                      finalDone ? "bg-emerald-50 border-emerald-300 hover:bg-emerald-100"
                      : "bg-amber-50 border-amber-300 hover:bg-amber-100"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[15px] shrink-0 mt-0.5 ${
                      finalDone ? "bg-emerald-500" : "bg-amber-400"
                    }`}>
                      {finalDone ? "✓" : "🏆"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[13.5px] font-bold ${finalDone ? "text-emerald-700" : finalUnlocked ? "text-amber-800" : "text-gray-400"}`}>
                          {final.title}
                        </span>
                        {finalDone && <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold border border-emerald-300">Track Complete!</span>}
                        {finalUnlocked && !finalDone && <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium border border-amber-200">Unlocked</span>}
                        {!finalDone && <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium border border-amber-200">Final Assignment</span>}
                      </div>
                      <p className={`text-[11.5px] leading-relaxed line-clamp-2 ${finalDone ? "text-emerald-600" : "text-amber-700"}`}>
                        {final.description}
                      </p>
                    </div>
                    {!finalDone && <div className="shrink-0 text-amber-400 text-[16px] mt-1">›</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
