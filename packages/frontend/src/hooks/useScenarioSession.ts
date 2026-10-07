import { useEffect, useState, Dispatch, SetStateAction, useCallback } from "react";
import type { AddressObject, ServiceObject, FirewallPolicy, TestPacket, WebFilterProfile } from "@fortisim/engine";
import { fetchScenario } from "../api/client";
import { useProgress } from "./useProgress";

export const DEFAULT_SCENARIO_ID = "web-server-access-01";

export interface ScenarioData {
  id: string;
  title: string;
  description: string;
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
}

export function useScenarioSession(): ScenarioSession {
  const [scenarioId, setScenarioId] = useState<string>(DEFAULT_SCENARIO_ID);
  const [scenario, setScenario] = useState<ScenarioData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<AddressObject[]>([]);
  const [services, setServices] = useState<ServiceObject[]>([]);
  const [policies, setPolicies] = useState<FirewallPolicy[]>([]);
  const [webFilterProfiles, setWebFilterProfiles] = useState<WebFilterProfile[]>([]);
  const { completedTaskIds, markTaskComplete, syncError } = useProgress("fortigate");

  useEffect(() => {
    let cancelled = false;
    setScenario(null);
    setLoadError(null);
    setAddresses([]);
    setServices([]);
    setPolicies([]);
    setWebFilterProfiles([]);
    fetchScenario(scenarioId)
      .then((data: ScenarioData) => {
        if (cancelled) return;
        setScenario(data);
        setAddresses(data.starterAddresses);
        setServices(data.starterServices);
        setWebFilterProfiles(data.starterWebFilterProfiles ?? []);
        setPolicies([]);
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
    selectScenario, completedTaskIds, markTaskComplete, syncError,
  };
}
