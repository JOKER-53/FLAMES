// ============================================================================
// Landing page for the parent "Tasks" sidebar entry (route: /tasks). Shows
// only the overall progress summary across all three tracks. Detailed task
// lists for each track live on their own pages (/tasks/policy, etc.), reached
// via the sidebar's expanded sub-items.
// ============================================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchScenarioList } from "../api/client";
import { ALL_INTERFACE_SCENARIOS, ALL_PORT_SCENARIOS, interfaceFullScenario, portFinalScenario } from "@fortisim/engine";
import { ScenarioSession } from "../hooks/useScenarioSession";
import type { Track } from "./TrackTasksPage";

interface TasksOverviewPageProps {
  session: ScenarioSession;
}

const TRACK_META: Record<Track, { label: string; dot: string; icon: string }> = {
  port: { label: "Port Assignment", dot: "bg-emerald-500", icon: "🔌" },
  interface: { label: "Interface Config", dot: "bg-blue-500", icon: "⚙️" },
  policy: { label: "Firewall Policy", dot: "bg-forti-red", icon: "🛡️" },
};

export function TasksOverviewPage({ session }: TasksOverviewPageProps) {
  const navigate = useNavigate();
  const [policyIds, setPolicyIds] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScenarioList()
      .then((list: { id: string; title: string; description: string }[]) => setPolicyIds(list.map((s) => s.id)))
      .catch((err) => setError(err.message ?? "Failed to load tasks"));
  }, []);

  // Exact regular-task id sets per track (excludes each track's final id,
  // which is tracked separately below). Policy ids have no shared prefix
  // (e.g. "server-segmentation-01", "guest-isolation-01"), so this can't be
  // derived by string matching — it has to enumerate the real ids.
  const regularIds: Record<Track, string[]> = {
    port: ALL_PORT_SCENARIOS.map((s) => s.id),
    interface: ALL_INTERFACE_SCENARIOS.map((s) => s.id),
    policy: (policyIds ?? []).filter((id) => id !== "firewall-final-01"),
  };

  const finalIds: Record<Track, string> = {
    port: portFinalScenario.id,
    interface: interfaceFullScenario.id,
    policy: "firewall-final-01",
  };

  function trackProgress(track: Track): number {
    const finalDone = session.completedTaskIds.has(finalIds[track]);
    if (finalDone) return 100;
    const total = regularIds[track].length;
    if (!total) return 0;
    const done = regularIds[track].filter((id) => session.completedTaskIds.has(id)).length;
    return Math.min(99, Math.round((done / total) * 99));
  }

  const tracks: Track[] = ["policy", "interface", "port"];
  const overallPct = Math.round(tracks.reduce((s, t) => s + trackProgress(t), 0) / tracks.length);

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-forti-dark mb-1">FortiSim Training Tasks</h1>
        <p className="text-gray-500 text-[12.5px]">
          Pick a track from the sidebar to see and complete its exercises. This overview shows your progress across all three.
        </p>
      </div>

      {error && <div className="text-red-600 text-[12.5px] mb-4">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-md p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-semibold text-gray-700">Overall Progress</span>
          <span className="text-[13px] font-bold text-forti-red">{overallPct}%</span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-forti-red rounded-full transition-all duration-500" style={{ width: `${overallPct}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {tracks.map((track) => {
          const meta = TRACK_META[track];
          const pct = trackProgress(track);
          return (
            <button
              key={track}
              onClick={() => navigate(`/tasks/${track}`)}
              className="text-left bg-white border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{meta.icon}</span>
                <span className="text-[13px] font-semibold text-gray-800">{meta.label}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                <div className={`h-full rounded-full ${meta.dot}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="text-[11px] text-gray-500">{pct}% complete</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
