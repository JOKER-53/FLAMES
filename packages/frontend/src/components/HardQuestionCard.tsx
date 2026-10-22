// ============================================================================
// Knowledge check: one multiple-choice question per lesson, AI-generated when
// the tutor is configured, otherwise from the curated bank. Answering correctly
// is an alternative way to complete the lesson. One attempt per question.
// ============================================================================

import { useEffect } from "react";
import { ScenarioSession } from "../hooks/useScenarioSession";
import { useKnowledgeCheck } from "../hooks/useKnowledgeCheck";
import { TutorSourceTag } from "./TutorSourceTag";
import { Icon } from "./ui/Icon";

interface KnowledgeCheckCardProps {
  platform: "fortigate" | "paloalto";
  taskId: string | undefined;
  completed: boolean;
  onComplete: (taskId: string) => void;
  /** Load a question as soon as the card mounts (otherwise on request). */
  autoLoad?: boolean;
}

export function KnowledgeCheckCard({ platform, taskId, completed, onComplete, autoLoad = false }: KnowledgeCheckCardProps) {
  const { kqData: question, kqLoading: loading, kqError: error, kqSelected: selected, setKqSelected: setSelected, kqResult: result, kqLocked: locked, loadKQ, answerKQ } = useKnowledgeCheck(platform, taskId, onComplete);
  useEffect(() => { if (autoLoad) void loadKQ(); }, [autoLoad, loadKQ]);
  if (!taskId) return null;
  const disabled = locked || completed;

  return (
    <section className="card">
      <div className="px-5 py-4 border-b border-line">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Knowledge check</h2>
          <TutorSourceTag source={question?.source} />
        </div>
        <p className="text-sm text-muted mt-0.5">Answer correctly to complete the lesson without the hands-on exercise. One attempt per question.</p>
      </div>
      <div className="px-5 py-4">
        {!question && !loading && !error && (
          <button className="btn-secondary" onClick={() => void loadKQ()}>Show a question</button>
        )}
        {loading && <p className="text-sm text-muted" role="status">Loading question…</p>}
        {error && (
          <div className="text-sm text-danger" role="alert">
            {error} <button className="link ml-1" onClick={() => void loadKQ()}>Try another question</button>
          </div>
        )}
        {question && (
          <fieldset disabled={disabled}>
            <legend className="text-sm font-medium text-ink leading-relaxed mb-3">{question.question}</legend>
            <div className="space-y-2 mb-4">
              {question.choices.map((choice, idx) => (
                <label key={idx} className={`flex items-start gap-3 rounded-md border px-3.5 py-2.5 text-sm leading-snug transition-colors ${disabled ? "cursor-not-allowed" : "cursor-pointer hover:border-line-strong"} ${selected === idx ? "border-accent bg-accent-soft" : "border-line"}`}>
                  <input type="radio" name={`knowledge-check-${taskId}`} className="mt-0.5 accent-[rgb(var(--accent))]" checked={selected === idx} onChange={() => setSelected(idx)} />
                  <span className="text-body">{choice}</span>
                </label>
              ))}
            </div>
            <button onClick={answerKQ} disabled={selected === null || disabled} className="btn-primary">Submit answer</button>
          </fieldset>
        )}
        {result === "correct" && <p className="mt-3 flex items-center gap-2 text-sm font-medium text-success"><Icon name="checkCircle" size={16} />Correct — lesson marked complete.</p>}
        {result === "incorrect" && (
          <p className="mt-3 text-sm text-danger">Not correct, and this question is now locked. Complete the hands-on exercise to finish the lesson.</p>
        )}
        {completed && !result && question && <p className="mt-3 text-sm text-muted">You have already completed this lesson.</p>}
      </div>
    </section>
  );
}

/** FortiGate lessons load their question automatically. */
export function HardQuestionCard({ taskId, session }: { taskId: string | undefined; session: ScenarioSession }) {
  return <KnowledgeCheckCard platform="fortigate" taskId={taskId} completed={!!taskId && session.completedTaskIds.has(taskId)} onComplete={session.markTaskComplete} autoLoad />;
}
