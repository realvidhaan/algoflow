import React from "react";
import { useStore } from "../store/useStore.js";
import StatsOverlay from "./StatsOverlay.jsx";
import ArrayVisualizer from "../visualizers/ArrayVisualizer.jsx";
import GraphVisualizer from "../visualizers/GraphVisualizer.jsx";
import TreeVisualizer from "../visualizers/TreeVisualizer.jsx";
import DPVisualizer from "../visualizers/DPVisualizer.jsx";

function Legend({ items }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border bg-panel/30 px-4 py-1.5">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: it.color }}
          />
          <span className="text-[10px] text-slate-400">{it.label}</span>
        </div>
      ))}
    </div>
  );
}

const ARRAY_LEGEND = [
  { color: "#64748b", label: "Unsorted" },
  { color: "#f59e0b", label: "Comparing" },
  { color: "#ef4444", label: "Swapping" },
  { color: "#8b5cf6", label: "Pivot" },
  { color: "#10b981", label: "Sorted / Found" },
  { color: "#0ea5e9", label: "Pointer" },
];
const GRAPH_LEGEND = [
  { color: "#f59e0b", label: "Current" },
  { color: "#0ea5e9", label: "Frontier" },
  { color: "#334155", label: "Visited" },
  { color: "#10b981", label: "Path" },
];
const TREE_LEGEND = [
  { color: "#f59e0b", label: "Current" },
  { color: "#0ea5e9", label: "Path" },
  { color: "#10b981", label: "Found" },
];
const DP_LEGEND = [
  { color: "#f59e0b", label: "Filling" },
  { color: "#0c4a6e", label: "Depends on" },
  { color: "#10b981", label: "Answer" },
];

export default function Stage() {
  const mode = useStore((s) => s.mode);
  const algo = useStore((s) => s.activeAlgo());
  const step = useStore((s) => s.currentStepObj());
  const fallbackArray = useStore((s) => s.arrayInput);

  const visualizer = mode === "ai" ? "array" : algo?.visualizer || "array";

  const legend =
    visualizer === "array"
      ? ARRAY_LEGEND
      : visualizer === "graph"
      ? GRAPH_LEGEND
      : visualizer === "tree"
      ? TREE_LEGEND
      : DP_LEGEND;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <StatsOverlay />
      <div className="relative min-h-0 flex-1 overflow-hidden p-4">
        {visualizer === "array" && (
          <ArrayVisualizer step={step} fallbackArray={fallbackArray} />
        )}
        {visualizer === "graph" && <GraphVisualizer step={step} />}
        {visualizer === "tree" && <TreeVisualizer step={step} />}
        {visualizer === "dp" && <DPVisualizer step={step} />}
      </div>
      <Legend items={legend} />
    </div>
  );
}
