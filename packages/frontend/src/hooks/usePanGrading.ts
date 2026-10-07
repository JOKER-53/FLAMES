import { useCallback, useEffect, useRef, useState } from "react";
import { apiJson } from "../api/http";

interface Result { desc: string; pass: boolean; }
export function usePanGrading(taskId: string, title: string, complete: (id: string) => void) {
  const generation = useRef(0);
  const [results, updateResults] = useState<Result[] | null>(null);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const setResults = useCallback((value: Result[] | null) => {
    generation.current++;
    updateResults(value); setAiFeedback(null); setGradeError(null); setGrading(false); setLoadingFeedback(false);
  }, []);
  useEffect(() => { setResults(null); return () => { generation.current++; }; }, [taskId, setResults]);
  async function grade(config: unknown) {
    const request = ++generation.current;
    setGrading(true); setGradeError(null); setAiFeedback(null);
    try {
      const report = await apiJson<{ results: Result[]; overallPassed: boolean }>(`/api/pan/grade/${encodeURIComponent(taskId)}`, { config });
      if (request !== generation.current) return;
      updateResults(report.results);
      if (report.overallPassed) complete(taskId);
      else {
        setLoadingFeedback(true);
        try {
          const feedback = await apiJson<{ feedback: string }>("/api/pan/feedback", { exerciseTitle: title, failingChecks: report.results.filter(result => !result.pass).map(result => result.desc) });
          if (request === generation.current) setAiFeedback(feedback.feedback);
        } catch {
          if (request === generation.current) setAiFeedback("AI tutor unavailable. Use the check results above; grading still works.");
        } finally { if (request === generation.current) setLoadingFeedback(false); }
      }
    } catch (error) {
      if (request === generation.current) setGradeError(error instanceof Error ? error.message : "Grading unavailable.");
    } finally { if (request === generation.current) setGrading(false); }
  }
  return { results, setResults, aiFeedback, loadingFeedback, grading, gradeError, grade };
}
