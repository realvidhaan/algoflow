import React from "react";
import { useStore } from "../store/useStore.js";
import { groupedAlgorithms } from "../algorithms/index.js";

export default function AlgorithmPicker() {
  const algorithmId = useStore((s) => s.algorithmId);
  const mode = useStore((s) => s.mode);
  const setAlgorithm = useStore((s) => s.setAlgorithm);
  const groups = groupedAlgorithms();

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.category}>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {group.category}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {group.items.map((algo) => {
              const active = mode === "single" && algo.id === algorithmId;
              return (
                <button
                  key={algo.id}
                  onClick={() => setAlgorithm(algo.id)}
                  className={`rounded-md border px-2 py-1.5 text-left text-xs transition ${
                    active
                      ? "border-violet-500 bg-violet-600/15 text-white"
                      : "border-border bg-panel-2 text-slate-300 hover:border-slate-600 hover:text-white"
                  }`}
                >
                  {algo.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
