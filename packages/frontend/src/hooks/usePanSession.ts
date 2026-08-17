import { useState, useCallback } from "react";

export interface PanSession {
  completedTaskIds: Set<string>;
  markTaskComplete: (id: string) => void;
}

export function usePanSession(): PanSession {
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(
    () => new Set(JSON.parse(localStorage.getItem("pan-completed") ?? "[]"))
  );

  const markTaskComplete = useCallback((id: string) => {
    setCompletedTaskIds(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem("pan-completed", JSON.stringify([...next]));
      return next;
    });
  }, []);

  return { completedTaskIds, markTaskComplete };
}
