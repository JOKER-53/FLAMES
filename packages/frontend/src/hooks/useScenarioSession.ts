import { useSimulatorDraft, type DraftControls } from "../drafts/useSimulatorDraft";
import { useLocation } from "react-router-dom";
import { useEffect, useState, Dispatch, SetStateAction, useCallback } from "react";
import type { AddressObject, ServiceObject, FirewallPolicy, TestPacket, WebFilterProfile } from "@fortisim/engine";
import { fetchScenario } from "../api/client";
import { useProgress } from "./useProgress";

export const DEFAULT_SCENARIO_ID = "web-server-access-01";

export interface ScenarioData {
  id: string;
  title: string;
  description: string;
  version?: string;
  starterPolicies?: FirewallPolicy[];
  starterAddresses: AddressObject[];
  starterServices: ServiceObject[];
  starterWebFilterProfiles?: WebFilterProfile[];
  testPackets: TestPacket[];
}

export interface ScenarioSession {
  scenarioId: string;
  scenario: ScenarioData | null;
  loadError: string | null;
  addresses: AddressObject[];
  services: ServiceObject[];
  policies: FirewallPolicy[];
  webFilterProfiles: WebFilterProfile[];
  setAddresses: Dispatch<SetStateAction<AddressObject[]>>;
  setServices: Dispatch<SetStateAction<ServiceObject[]>>;
  setPolicies: Dispatch<SetStateAction<FirewallPolicy[]>>;
  setWebFilterProfiles: Dispatch<SetStateAction<WebFilterProfile[]>>;
  selectScenario: (id: string) => void;
  completedTaskIds: Set<string>;
  markTaskComplete: (taskId: string) => void;
  syncError: string | null;
  draft: DraftControls;
}

export function useScenarioSession(): ScenarioSession {
  const [scenarioId, setScenarioId] = useState<string>(DEFAULT_SCENARIO_ID);
  const [scenario, setScenario] = useState<ScenarioData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const location = useLocation();
  const initial = { addresses: scenario?.starterAddresses ?? [], services: scenario?.starterServices ?? [], policies: scenario?.starterPolicies ?? [], webFilterProfiles: scenario?.starterWebFilterProfiles ?? [] };
  const persisted = useSimulatorDraft("fortigate", scenarioId, "policy", initial, scenario?.version ?? "1", !!scenario && location.pathname.includes("/policy/"));
  const { addresses, services, policies, webFilterProfiles } = persisted.value;
  const fieldSetter = <K extends keyof typeof initial>(field: K) => (update: SetStateAction<(typeof initial)[K]>) => persisted.setValue(previous => ({ ...previous, [field]: typeof update === "function" ? (update as (old: (typeof initial)[K]) => (typeof initial)[K])(previous[field]) : update }));
  const setAddresses = fieldSetter("addresses"), setServices = fieldSetter("services"), setPolicies = fieldSetter("policies"), setWebFilterProfiles = fieldSetter("webFilterProfiles");
  const { completedTaskIds, markTaskComplete, syncError } = useProgress("fortigate");

  useEffect(() => {
    let cancelled = false;
    setScenario(null);
    setLoadError(null);
    fetchScenario(scenarioId)
      .then((data: ScenarioData) => {
        if (cancelled) return;
        setScenario(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err.message ?? "Failed to load scenario");
      });
    return () => { cancelled = true; };
  }, [scenarioId]);

  const selectScenario = useCallback((id: string) => { setScenarioId(id); }, []);

  return {
    scenarioId, scenario, loadError,
    addresses, services, policies, webFilterProfiles,
    setAddresses, setServices, setPolicies, setWebFilterProfiles,
    selectScenario, completedTaskIds, markTaskComplete, syncError, draft: persisted.controls,
  };
}
