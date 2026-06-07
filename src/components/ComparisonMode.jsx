import React from "react";
import { useStore } from "../store/useStore.js";
import ArrayVisualizer from "../visualizers/ArrayVisualizer.jsx";

function Pane({ pane, currentStep, isWinner }) {
  const len = pane.steps.length;
  const idx = Math.min(currentStep, len - 1);
  const step = pane.steps[idx] || null;
  const done = currentStep >= len - 1;
  const counters = (step && step.counters) || {};

  return (
    <div
      className={`flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border bg-panel ${
        isWinner ? "border-emerald-500/60" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white">{pane.name}</span>
          {isWinner && (
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300">
              FEWEST STEPS
            </span>
          )}
        </div>
        <span
          className={`mono text-[10px] ${done ? "text-emerald-400" : "text-slate-500"}`}
        >
          {done ? "done" : `${idx + 1}/${len}`}
        </span>
      </div>

      <div className="relative min-h-0 flex-1 p-3">
        <ArrayVisualizer step={step} compact />
      </div>

      <div className="grid grid-cols-3 border-t border-border text-center">
        <div className="border-r border-border py-1.5">
          <div className="mono text-sm font-semibold text-amber-400">
            {counters.comparisons ?? 0}
          </div>
          <div className="text-[9px] uppercase tracking-wide text-slate-500">
            Compares
          </div>
        </div>
        <div className="border-r border-border py-1.5">
          <div className="mono text-sm font-semibold text-red-400">
            {counters.swaps ?? 0}
          </div>
          <div className="text-[9px] uppercase tracking-wide text-slate-500">
            Swaps
          </div>
        </div>
        <div className="py-1.5">
          <div className="mono text-sm font-semibold text-slate-200">{len}</div>
          <div className="text-[9px] uppercase tracking-wide text-slate-500">
            Steps
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ComparisonMode() {
  const comparison = useStore((s) => s.comparison);
  const currentStep = useStore((s) => s.currentStep);
  const arrayInput = useStore((s) => s.arrayInput);

  if (!comparison.length) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Select 2–3 sorting algorithms to compare.
      </div>
    );
  }

  const minSteps = Math.min(...comparison.map((p) => p.steps.length));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-panel/40 px-4 py-2.5">
        <div className="text-sm font-semibold text-white">
          Comparison — same input, one clock
        </div>
        <div className="mono text-[11px] text-slate-400">
          input: [{arrayInput.join(", ")}]
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row">
        {comparison.map((pane, i) => (
          <Pane
            key={pane.id + i}
            pane={pane}
            currentStep={currentStep}
            isWinner={pane.steps.length === minSteps}
          />
        ))}
      </div>
    </div>
  );
}
