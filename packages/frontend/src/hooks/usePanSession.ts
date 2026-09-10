import { useState, useCallback } from "react";

export interface PanSession {
  completedTaskIds: Set<string>;
  markTaskComplete: (id: string) => void;
}

export function usePanSession(): PanSession {
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(
    () => {
      try {
        const saved = JSON.parse(localStorage.getItem("pan-completed") ?? "[]");
        return new Set(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : []);
      } catch {
        return new Set<string>();
      }
    }
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
