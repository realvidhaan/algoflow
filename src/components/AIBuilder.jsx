import React, { useState } from "react";
import { useStore } from "../store/useStore.js";
import { useGroq } from "../hooks/useGroq.js";

const EXAMPLES = [
  "Cocktail shaker sort",
  "Gnome sort",
  "Sort by counting occurrences",
  "Find the maximum value",
];

export default function AIBuilder() {
  const ai = useStore((s) => s.ai);
  const { generate, pending } = useGroq();
  const [text, setText] = useState("");
  const [showRaw, setShowRaw] = useState(false);

  const submit = () => {
    if (!pending) generate(text);
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Describe an algorithm
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          rows={3}
          placeholder="e.g. Sort the array using cocktail shaker sort, swapping adjacent elements in both directions each pass."
          className="w-full resize-none rounded-md border border-border bg-panel-2 px-2.5 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-violet-500"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => setText(ex)}
            className="rounded-full border border-border bg-panel-2 px-2 py-0.5 text-[10px] text-slate-400 transition hover:border-violet-500 hover:text-white"
          >
            {ex}
          </button>
        ))}
      </div>

      <button
        onClick={submit}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-violet-600 py-2 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <>
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Tracing on Groq…
          </>
        ) : (
          <>✦ Generate & Visualize</>
        )}
      </button>

      {/* Status */}
      {ai.status === "error" && (
        <div className="space-y-1.5 rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-2">
          <div className="text-[11px] font-medium text-red-300">{ai.error}</div>
          {ai.raw && (
            <button
              onClick={() => setShowRaw((v) => !v)}
              className="text-[10px] text-red-400/80 underline"
            >
              {showRaw ? "Hide" : "Show"} raw response
            </button>
          )}
          {showRaw && ai.raw && (
            <pre className="mono max-h-40 overflow-auto rounded bg-black/40 p-2 text-[10px] text-slate-400">
              {ai.raw}
            </pre>
          )}
        </div>
      )}
      {ai.status === "success" && (
        <div className="space-y-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-2 text-[11px] text-emerald-300">
          <div>
            Loaded <span className="font-semibold">{ai.name}</span> with{" "}
            {ai.steps.length} steps.
          </div>
          {(ai.timeComplexity || ai.spaceComplexity) && (
            <div className="flex gap-2 text-[10px] text-emerald-400/80">
              {ai.timeComplexity && (
                <span className="rounded bg-emerald-900/40 px-1.5 py-0.5">
                  Time: <span className="mono">{ai.timeComplexity}</span>
                </span>
              )}
              {ai.spaceComplexity && (
                <span className="rounded bg-emerald-900/40 px-1.5 py-0.5">
                  Space: <span className="mono">{ai.spaceComplexity}</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}
      {ai.status === "idle" && (
        <div className="rounded-md border border-border bg-panel-2/50 px-2.5 py-2 text-[11px] leading-relaxed text-slate-400">
          Describe any array algorithm and the model will trace it step-by-step
          on the first 6 values of the sample array, then play it back in the
          visualizer using the same engine as the built-ins.
        </div>
      )}
    </div>
  );
}
