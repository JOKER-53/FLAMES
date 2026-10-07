import { useProgress } from "./useProgress";

export interface PanSession {
  completedTaskIds: Set<string>;
  markTaskComplete: (id: string) => void;
  syncError: string | null;
}

export function usePanSession(): PanSession {
  const { completedTaskIds, markTaskComplete, syncError } = useProgress("paloalto");

  return { completedTaskIds, markTaskComplete, syncError };
}
