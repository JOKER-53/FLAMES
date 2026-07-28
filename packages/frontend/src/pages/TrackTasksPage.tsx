// ============================================================================
// Shows the task list for a single track (Firewall Policy, Interface Config,
// or Port Assignment). Each sidebar entry routes to this page with a fixed
// `track` prop, so only that track's tasks appear in the main frame — there
// is no "everything at once" view anymore.
// ============================================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchScenarioList } from "../api/client";
import { ALL_INTERFACE_SCENARIOS, ALL_PORT_SCENARIOS, interfaceFullScenario, portFinalScenario } from "@fortisim/engine";
import { ScenarioSession } from "../hooks/useScenarioSession";

export type Track = "policy" | "interface" | "port";

interface TrackTasksPageProps {
  session: ScenarioSession;
  track: Track;
}

interface TaskEntry {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  isFinal?: boolean;
}

const TRACK_META: Record<Track, { label: string; dot: string; icon: string }> = {
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

export function TrackTasksPage({ session, track }: TrackTasksPageProps) {
  const navigate = useNavigate();
  const [policyScenarios, setPolicyScenarios] = useState<{ id: string; title: string; description: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (track !== "policy") return;
    fetchScenarioList()
      .then(setPolicyScenarios)
      .catch((err) => setError(err.message ?? "Failed to load tasks"));
  }, [track]);

  const meta = TRACK_META[track];

  if (track === "policy" && error) return <div className="text-red-600 text-[12.5px]">{error}</div>;
  if (track === "policy" && !policyScenarios) return <div className="text-gray-500 text-[12.5px]">Loading tasks…</div>;

  const ps = policyScenarios ?? [];

  const regularTasks: TaskEntry[] =
    track === "port"
      ? [
          { id: ALL_PORT_SCENARIOS[0].id, title: ALL_PORT_SCENARIOS[0].title, description: ALL_PORT_SCENARIOS[0].description, difficulty: 1 },
          { id: ALL_PORT_SCENARIOS[1].id, title: ALL_PORT_SCENARIOS[1].title, description: ALL_PORT_SCENARIOS[1].description, difficulty: 2 },
          { id: ALL_PORT_SCENARIOS[2].id, title: ALL_PORT_SCENARIOS[2].title, description: ALL_PORT_SCENARIOS[2].description, difficulty: 3 },
          { id: ALL_PORT_SCENARIOS[3].id, title: ALL_PORT_SCENARIOS[3].title, description: ALL_PORT_SCENARIOS[3].description, difficulty: 5 },
          { id: ALL_PORT_SCENARIOS[4].id, title: ALL_PORT_SCENARIOS[4].title, description: ALL_PORT_SCENARIOS[4].description, difficulty: 6 },
        ]
      : track === "interface"
      ? [
          { id: ALL_INTERFACE_SCENARIOS[0].id, title: ALL_INTERFACE_SCENARIOS[0].title, description: ALL_INTERFACE_SCENARIOS[0].description, difficulty: 1 },
          { id: ALL_INTERFACE_SCENARIOS[1].id, title: ALL_INTERFACE_SCENARIOS[1].title, description: ALL_INTERFACE_SCENARIOS[1].description, difficulty: 2 },
          { id: ALL_INTERFACE_SCENARIOS[2].id, title: ALL_INTERFACE_SCENARIOS[2].title, description: ALL_INTERFACE_SCENARIOS[2].description, difficulty: 4 },
        ]
      : [
          { id: ps[0]?.id, title: ps[0]?.title, description: ps[0]?.description, difficulty: 3 },
          { id: ps[1]?.id, title: ps[1]?.title, description: ps[1]?.description, difficulty: 4 },
          { id: ps[2]?.id, title: ps[2]?.title, description: ps[2]?.description, difficulty: 5 },
          { id: ps[3]?.id, title: ps[3]?.title, description: ps[3]?.description, difficulty: 6 },
          { id: ps[4]?.id, title: ps[4]?.title, description: ps[4]?.description, difficulty: 7 },
          { id: ps[5]?.id, title: ps[5]?.title, description: ps[5]?.description, difficulty: 8 },
          { id: ps[6]?.id, title: ps[6]?.title, description: ps[6]?.description, difficulty: 8 },
          { id: ps[7]?.id, title: ps[7]?.title, description: ps[7]?.description, difficulty: 9 },
          { id: ps[8]?.id, title: ps[8]?.title, description: ps[8]?.description, difficulty: 9 },
          { id: ps[9]?.id, title: ps[9]?.title, description: ps[9]?.description, difficulty: 10 },
        ];

  const filteredRegular = regularTasks.filter((t) => t.id);

  const finalTask: TaskEntry | null =
    track === "port"
      ? { id: portFinalScenario.id, title: "🏆 Port Assignment Final", description: "...", difficulty: 10, isFinal: true }
      : track === "interface"
       ? { id: interfaceFullScenario.id, title: "🏆 Interface Config Final", description: "...", difficulty: 10, isFinal: true }
      : ps[10]?.id
      ? { id: ps[10].id, title: "🏆 Firewall Policy Final", description: "The ultimate challenge: multiple systems, DMZ servers, guest isolation, web filtering, and inter-zone security all in one.", difficulty: 10, isFinal: true }
      : null;

  const finalDone = finalTask ? session.completedTaskIds.has(finalTask.id) : false;
  const doneCount = filteredRegular.filter((t) => session.completedTaskIds.has(t.id)).length;
  const pct = finalDone ? 100 : Math.round((doneCount / (filteredRegular.length || 1)) * 99);

  function handleSelect(task: TaskEntry) {
    if (track === "policy") {
      session.selectScenario(task.id);
      navigate("/policy/firewall-policy");
    } else {
      navigate(`/network/interfaces?track=${track}&scenario=${task.id}`);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-2xl">{meta.icon}</span>
        <div>
          <h1 className="text-xl font-bold text-forti-dark mb-1">{meta.label}</h1>
          <p className="text-gray-500 text-[12.5px]">
            Complete every exercise below to unlock the Final Assignment. Pass the Final to mark this track 100%.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-md p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-semibold text-gray-700">Track Progress</span>
          <span className="text-[13px] font-bold text-forti-red">{pct}%</span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${finalDone ? "bg-emerald-500" : meta.dot}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="border border-gray-200 rounded-md overflow-hidden">
        {filteredRegular.map((task, idx) => {
          const completed = session.completedTaskIds.has(task.id);
          return (
            <div
              key={task.id}
              onClick={() => handleSelect(task)}
              className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                completed ? "bg-emerald-50 hover:bg-emerald-100" : "bg-white hover:bg-gray-50"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 ${
                  completed ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500"
                }`}
              >
                {completed ? "✓" : idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[13px] font-medium ${completed ? "text-emerald-700" : "text-gray-800"}`}>{task.title}</span>
                  <DifficultyStars level={task.difficulty} />
                  {completed && (
                    <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium border border-emerald-200">
                      Done
                    </span>
                  )}
                </div>
                <p className="text-[11.5px] text-gray-500 leading-relaxed line-clamp-2">{task.description}</p>
              </div>
              <div className="shrink-0 text-gray-300 text-[12px] mt-1">›</div>
            </div>
          );
        })}

        {finalTask && (
          <div
            onClick={() => handleSelect(finalTask)}
            className={`flex items-start gap-3 px-4 py-4 border-t-2 transition-colors cursor-pointer ${
              finalDone ? "bg-emerald-50 border-emerald-300 hover:bg-emerald-100" : "bg-amber-50 border-amber-300 hover:bg-amber-100"
            }`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[15px] shrink-0 mt-0.5 ${finalDone ? "bg-emerald-500" : "bg-amber-400"}`}>
              {finalDone ? "✓" : "🏆"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[13.5px] font-bold ${finalDone ? "text-emerald-700" : "text-amber-800"}`}>{finalTask.title}</span>
                {finalDone ? (
                  <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold border border-emerald-300">
                    Track Complete!
                  </span>
                ) : (
                  <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium border border-amber-200">
                    Final Assignment
                  </span>
                )}
              </div>
              <p className={`text-[11.5px] leading-relaxed line-clamp-2 ${finalDone ? "text-emerald-600" : "text-amber-700"}`}>
                {finalTask.description}
              </p>
            </div>
            {!finalDone && <div className="shrink-0 text-amber-400 text-[16px] mt-1">›</div>}
          </div>
        )}
      </div>
    </div>
  );
}
