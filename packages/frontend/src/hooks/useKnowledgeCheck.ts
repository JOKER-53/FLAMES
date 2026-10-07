import { useCallback, useEffect, useRef, useState } from "react";
import { apiJson } from "../api/http";

interface Question { questionId: string; question: string; choices: string[]; }
export function useKnowledgeCheck(platform: "fortigate" | "paloalto", taskId: string | undefined, complete: (id: string) => void) {
  const prefix = platform === "paloalto" ? "/api/pan/knowledge-check" : "/api/knowledge-check";
  const generation = useRef(0);
  const locked = useRef(false);
  const [kqLoading, setKqLoading] = useState(false);
  const [kqError, setKqError] = useState<string | null>(null);
  const [kqData, setKqData] = useState<Question | null>(null);
  const [kqSelected, setKqSelected] = useState<number | null>(null);
  const [kqResult, setKqResult] = useState<"correct" | "incorrect" | null>(null);
  const [kqLocked, setKqLocked] = useState(false);
  useEffect(() => {
    generation.current++;
    locked.current = false;
    setKqData(null); setKqError(null); setKqSelected(null); setKqResult(null); setKqLocked(false); setKqLoading(false);
    return () => { generation.current++; };
  }, [taskId, platform]);
  const loadKQ = useCallback(async () => {
    if (!taskId) return;
    const request = ++generation.current;
    locked.current = false;
    setKqLoading(true); setKqError(null); setKqData(null); setKqSelected(null); setKqResult(null); setKqLocked(false);
    try {
      const data = await apiJson<Question>(`${prefix}/${encodeURIComponent(taskId)}`);
      if (request === generation.current) setKqData(data);
    } catch (error) {
      if (request === generation.current) setKqError(error instanceof Error ? error.message : "Question unavailable.");
    } finally { if (request === generation.current) setKqLoading(false); }
  }, [prefix, taskId]);
  const answerKQ = async () => {
    if (kqSelected === null || !kqData || locked.current || !taskId) return;
    locked.current = true; setKqLocked(true);
    const request = generation.current;
    try {
      const data = await apiJson<{ correct: boolean }>(`${prefix}/answer`, { questionId: kqData.questionId, selectedIndex: kqSelected });
      if (request !== generation.current) return;
      setKqResult(data.correct ? "correct" : "incorrect");
      if (data.correct) complete(taskId);
    } catch (error) {
      if (request === generation.current) setKqError(`${error instanceof Error ? error.message : "Answer could not be checked."} Load a new question to try again.`);
    }
  };
  return { kqLoading, kqError, kqData, kqSelected, setKqSelected, kqResult, kqLocked, loadKQ, answerKQ };
}
