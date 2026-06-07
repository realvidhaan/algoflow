import React from "react";
import { useStore } from "../store/useStore.js";

const MODES = [
  { id: "single", label: "Visualize" },
  { id: "comparison", label: "Compare" },
  { id: "ai", label: "AI Builder" },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 32 32" className="shrink-0">
        <rect width="32" height="32" rx="7" fill="#141417" stroke="#26262b" />
        <rect x="6" y="17" width="4" height="9" rx="1.5" fill="#64748b" />
        <rect x="12" y="11" width="4" height="15" rx="1.5" fill="#8b5cf6" />
        <rect x="18" y="14" width="4" height="12" rx="1.5" fill="#f59e0b" />
        <rect x="24" y="8" width="4" height="18" rx="1.5" fill="#10b981" />
      </svg>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold tracking-tight text-white">Algo</span>
        <span className="text-lg font-bold tracking-tight text-violet-400">Flow</span>
      </div>
    </div>
  );
}

export default function Header() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);

  return (
    <header className="flex items-center justify-between gap-2 border-b border-border bg-panel/60 px-3 py-2.5 backdrop-blur sm:px-4">
      <div className="flex min-w-0 items-center gap-4">
        <Logo />
        <span className="hidden text-xs text-slate-500 md:inline">
          Interactive algorithm visualizer
        </span>
      </div>

      <nav className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-panel p-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-medium transition sm:text-xs ${
              mode === m.id
                ? "bg-violet-600 text-white shadow-sm"
                : "text-slate-300 hover:bg-panel-2 hover:text-white"
            }`}
          >
            {m.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
