// ============================================================================
// Shows the "hard question" for a given task id as an alternate path to
// completing it. The hands-on configuration exercise (grading via Submit)
// is completely unchanged — this is just a second door to the same
// completed state. Either one marks the task done via session.markTaskComplete.
// ============================================================================

import { useEffect, useState } from "react";
import { HARD_QUESTIONS } from "@fortisim/engine";
import { ScenarioSession } from "../hooks/useScenarioSession";

interface HardQuestionCardProps {
  taskId: string | undefined;
  session: ScenarioSession;
}

export function HardQuestionCard({ taskId, session }: HardQuestionCardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);

  useEffect(() => {
    setSelected(null);
    setResult(null);
  }, [taskId]);

  if (!taskId) return null;
  const q = HARD_QUESTIONS[taskId];
  if (!q) return null;

  const id: string = taskId;
  const completed = session.completedTaskIds.has(id);

  function handleAnswer() {
    if (selected === null) return;
    if (selected === q.correctIndex) {
      setResult("correct");
      session.markTaskComplete(id);
    } else {
      setResult("incorrect");
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
      <p className="text-[12.5px] text-gray-500 mb-2">
        Prefer a quick check instead of the hands-on exercise? Answer this correctly to complete the task either way.
      </p>
      <p className="text-[12.5px] text-gray-800 font-medium mb-3 leading-relaxed">{q.question}</p>
      <div className="space-y-1.5 mb-3">
        {q.choices.map((choice, idx) => (
          <label
            key={idx}
            className={`flex items-start gap-2 p-2 rounded border cursor-pointer text-[12.5px] leading-snug transition-colors ${
              selected === idx ? "border-forti-red bg-red-50" : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <input
              type="radio"
              name={`hard-question-${taskId}`}
              className="mt-0.5 shrink-0"
              checked={selected === idx}
              onChange={() => {
                setSelected(idx);
                setResult(null);
              }}
            />
            <span>{choice}</span>
          </label>
        ))}
      </div>
      <button
        onClick={handleAnswer}
        disabled={selected === null}
        className="px-3 py-1.5 bg-forti-red text-white rounded-sm text-[12.5px] hover:bg-forti-red/90 disabled:opacity-40"
      >
        Answer
      </button>
      {result === "correct" && (
        <div className="mt-2 text-[12.5px] text-emerald-600 font-medium">✓ Correct — task marked complete.</div>
      )}
      {result === "incorrect" && (
        <div className="mt-2 text-[12.5px] text-red-600">Not quite — review the scenario and try again.</div>
      )}
    </div>
  );
}
