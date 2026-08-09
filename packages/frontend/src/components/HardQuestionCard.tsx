// ============================================================================
// Knowledge Check — fetches a fresh AI-generated MCQ from the backend on
// every mount. One attempt only: wrong answer locks the card permanently.
// ============================================================================

import { useEffect, useState } from "react";
import { ScenarioSession } from "../hooks/useScenarioSession";

interface HardQuestionCardProps {
  taskId: string | undefined;
  session: ScenarioSession;
}

interface Question {
  question: string;
  choices: string[];
  correctIndex: number;
}

export function HardQuestionCard({ taskId, session }: HardQuestionCardProps) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    setQuestion(null);
    setSelected(null);
    setResult(null);
    setLocked(false);
    setFetchError(null);
    setLoading(true);

    fetch(`/api/knowledge-check/${taskId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        return r.json();
      })
      .then((data) => setQuestion(data))
      .catch((err) => setFetchError(err.message ?? "Failed to load question"))
      .finally(() => setLoading(false));
  }, [taskId]);

  if (!taskId) return null;

  const id: string = taskId;
  const completed = session.completedTaskIds.has(id);

  function handleAnswer() {
    if (selected === null || locked || !question) return;
    if (selected === question.correctIndex) {
      setResult("correct");
      session.markTaskComplete(id);
    } else {
      setResult("incorrect");
      setLocked(true);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-md p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[13px] font-medium text-gray-700">Knowledge Check</div>
        {completed && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium border border-emerald-200">
            Task Complete
          </span>
        )}
      </div>

      <p className="text-[12.5px] text-gray-500 mb-3">
        Answer this correctly to complete the task — no hands-on config needed.{" "}
        <span className="text-red-500 font-medium">One attempt only. Questions are AI-generated and unique each time.</span>
      </p>

      {loading && (
        <div className="text-[12.5px] text-gray-400 animate-pulse">Generating question…</div>
      )}

      {fetchError && (
        <div className="text-[12.5px] text-red-500">Failed to load question: {fetchError}</div>
      )}

      {question && (
        <>
          <p className="text-[12.5px] text-gray-800 font-medium mb-3 leading-relaxed">
            {question.question}
          </p>

          <div className="space-y-1.5 mb-3">
            {question.choices.map((choice, idx) => (
              <label
                key={idx}
                className={`flex items-start gap-2 p-2 rounded border text-[12.5px] leading-snug transition-colors ${
                  locked || completed
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer"
                } ${
                  selected === idx
                    ? "border-forti-red bg-red-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name={`knowledge-check-${taskId}`}
                  className="mt-0.5 shrink-0"
                  checked={selected === idx}
                  disabled={locked || completed}
                  onChange={() => {
                    if (!locked && !completed) {
                      setSelected(idx);
                      setResult(null);
                    }
                  }}
                />
                <span>{choice}</span>
              </label>
            ))}
          </div>

          <button
            onClick={handleAnswer}
            disabled={selected === null || locked || completed}
            className="px-3 py-1.5 bg-forti-red text-white rounded-sm text-[12.5px] hover:bg-forti-red/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Answer
          </button>

          {result === "correct" && (
            <div className="mt-2 text-[12.5px] text-emerald-600 font-medium">
              ✓ Correct — task marked complete.
            </div>
          )}
          {result === "incorrect" && (
            <div className="mt-2 text-[12.5px] text-red-600 font-medium">
              ✗ Incorrect — this question is now locked. Complete the hands-on exercise instead.
            </div>
          )}
        </>
      )}
    </div>
  );
}
