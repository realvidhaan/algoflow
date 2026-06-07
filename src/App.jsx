import React from "react";
import { useStore } from "./store/useStore.js";
import { usePlayback } from "./hooks/usePlayback.js";
import Header from "./components/Header.jsx";
import InputPanel from "./components/InputPanel.jsx";
import Stage from "./components/Stage.jsx";
import Controls from "./components/Controls.jsx";
import CodePanel from "./components/CodePanel.jsx";
import ComparisonMode from "./components/ComparisonMode.jsx";

export default function App() {
  usePlayback();
  const mode = useStore((s) => s.mode);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg text-slate-200">
      <Header />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        {/* Left — input panel */}
        <aside className="w-full shrink-0 border-b border-border bg-panel/30 p-3 lg:w-72 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <InputPanel />
        </aside>

        {/* Center — stage + controls */}
        <section className="flex min-h-[62vh] flex-1 flex-col bg-bg lg:min-h-0 lg:min-w-0">
          <div className="min-h-0 flex-1">
            {mode === "comparison" ? <ComparisonMode /> : <Stage />}
          </div>
          <Controls />
        </section>

        {/* Right — code panel */}
        <aside className="h-[340px] w-full shrink-0 border-t border-border bg-panel lg:h-auto lg:w-[380px] lg:border-l lg:border-t-0">
          <CodePanel />
        </aside>
      </main>
    </div>
  );
}
