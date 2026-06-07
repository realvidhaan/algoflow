import React from "react";
import { motion } from "framer-motion";
import { useStore } from "../store/useStore.js";

const COUNTER_LABELS = {
  comparisons: "Comparisons",
  swaps: "Swaps",
  arrayAccesses: "Array Accesses",
  visited: "Visited",
  queued: "Queued",
  edges: "Edges",
  settled: "Settled",
  relaxations: "Relaxations",
  maxDepth: "Max Depth",
  calls: "Calls",
  cacheHits: "Cache Hits",
  additions: "Additions",
  cellsFilled: "Cells Filled",
  matches: "Matches",
};

function StatChip({ label, value }) {
  return (
    <div className="flex flex-col items-center rounded-md border border-border bg-panel-2 px-3 py-1">
      <span className="mono text-sm font-semibold tabular-nums text-white">
        {value}
      </span>
      <span className="text-[9px] uppercase tracking-wide text-slate-500">
        {label}
      </span>
    </div>
  );
}

export default function StatsOverlay() {
  const mode = useStore((s) => s.mode);
  const step = useStore((s) => s.currentStepObj());
  const algo = useStore((s) => s.activeAlgo());
  const ai = useStore((s) => s.ai);

  const counters = (step && step.counters) || {};
  const chips = Object.entries(counters)
    .filter(([, v]) => typeof v === "number")
    .slice(0, 5);

  const title = mode === "ai" ? ai.name || "Custom Algorithm" : algo?.name;
  const time = mode === "ai" ? (ai.timeComplexity || "varies") : algo?.timeComplexity;
  const space = mode === "ai" ? (ai.spaceComplexity || "varies") : algo?.spaceComplexity;

  return (
    <div className="flex flex-col gap-2 border-b border-border bg-panel/40 px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">{title}</span>
          <span className="hidden items-center gap-2 text-[11px] text-slate-400 sm:flex">
            <span className="rounded bg-panel-2 px-1.5 py-0.5">
              Time: <span className="mono text-slate-200">{time}</span>
            </span>
            <span className="rounded bg-panel-2 px-1.5 py-0.5">
              Space: <span className="mono text-slate-200">{space}</span>
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {chips.map(([key, value]) => (
            <StatChip
              key={key}
              label={COUNTER_LABELS[key] || key}
              value={value}
            />
          ))}
        </div>
      </div>
      <motion.div
        key={step ? step.description : "none"}
        initial={{ opacity: 0, y: -3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="min-h-[20px] text-[13px] leading-snug text-slate-300"
      >
        {step ? step.description : "Ready."}
      </motion.div>
    </div>
  );
}
