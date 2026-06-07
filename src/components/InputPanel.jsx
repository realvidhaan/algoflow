import React, { useEffect, useState } from "react";
import { useStore } from "../store/useStore.js";
import { SORTING_IDS, ALGORITHMS } from "../algorithms/index.js";
import AlgorithmPicker from "./AlgorithmPicker.jsx";
import AIBuilder from "./AIBuilder.jsx";

function Label({ children }) {
  return (
    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
      {children}
    </div>
  );
}

function parseNums(str) {
  return str
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

// ---- Array editor (sorting / searching / comparison / AI sample) ----------
function ArrayEditor() {
  const arrayInput = useStore((s) => s.arrayInput);
  const arraySize = useStore((s) => s.arraySize);
  const setArrayInput = useStore((s) => s.setArrayInput);
  const setArraySize = useStore((s) => s.setArraySize);
  const randomizeArray = useStore((s) => s.randomizeArray);

  const [text, setText] = useState(arrayInput.join(", "));
  useEffect(() => {
    setText(arrayInput.join(", "));
  }, [arrayInput]);

  const apply = () => {
    const nums = parseNums(text);
    if (nums.length >= 1) setArrayInput(nums);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Array (comma-separated)</Label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={apply}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              apply();
            }
          }}
          rows={2}
          spellCheck={false}
          className="mono w-full resize-none rounded-md border border-border bg-panel-2 px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-violet-500"
        />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <Label>Size: {arraySize}</Label>
        </div>
        <input
          type="range"
          min={5}
          max={50}
          value={arraySize}
          onChange={(e) => setArraySize(Number(e.target.value))}
          className="w-full"
        />
      </div>
      <button
        onClick={randomizeArray}
        className="w-full rounded-md border border-border bg-panel-2 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:text-white"
      >
        🎲 Randomize
      </button>
    </div>
  );
}

function TargetEditor() {
  const target = useStore((s) => s.target);
  const setTarget = useStore((s) => s.setTarget);
  const autoSort = useStore((s) => s.activeAlgo()?.autoSort);
  return (
    <div className="space-y-2">
      <div>
        <Label>Search target</Label>
        <input
          type="number"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="mono w-full rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-violet-500"
        />
      </div>
      {autoSort && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-300">
          ⓘ Binary search auto-sorts the array first.
        </div>
      )}
    </div>
  );
}

// ---- Graph controls -------------------------------------------------------
function GraphControls() {
  const graph = useStore((s) => s.graph);
  const graphStart = useStore((s) => s.graphStart);
  const graphEnd = useStore((s) => s.graphEnd);
  const setGraphStart = useStore((s) => s.setGraphStart);
  const setGraphEnd = useStore((s) => s.setGraphEnd);
  const toggleDirected = useStore((s) => s.toggleDirected);
  const resetGraph = useStore((s) => s.resetGraph);
  const weighted = useStore((s) => s.activeAlgo()?.weighted);

  const ids = graph.nodes.map((n) => n.id);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Start</Label>
          <select
            value={graphStart}
            onChange={(e) => setGraphStart(e.target.value)}
            className="mono w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-violet-500"
          >
            {ids.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>
        {weighted && (
          <div>
            <Label>End</Label>
            <select
              value={graphEnd}
              onChange={(e) => setGraphEnd(e.target.value)}
              className="mono w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-violet-500"
            >
              {ids.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <label className="flex cursor-pointer items-center justify-between rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-xs text-slate-300">
        <span>Directed edges</span>
        <input
          type="checkbox"
          checked={!!graph.directed}
          onChange={toggleDirected}
          className="accent-violet-500"
        />
      </label>
      <button
        onClick={resetGraph}
        className="w-full rounded-md border border-border bg-panel-2 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:text-white"
      >
        Reset graph
      </button>
      <div className="rounded-md border border-border bg-panel-2/50 px-2.5 py-2 text-[11px] leading-relaxed text-slate-400">
        Use the toolbar on the canvas to add nodes/edges, drag to reposition,
        and erase. {weighted ? "Click an edge to set its weight." : ""}
      </div>
    </div>
  );
}

// ---- Tree controls --------------------------------------------------------
function TreeControls() {
  const treeValues = useStore((s) => s.treeValues);
  const setTreeValues = useStore((s) => s.setTreeValues);
  const runTreeOp = useStore((s) => s.runTreeOp);
  const treeOp = useStore((s) => s.treeOp);

  const [text, setText] = useState(treeValues.join(", "));
  const [opVal, setOpVal] = useState("65");
  useEffect(() => {
    setText(treeValues.join(", "));
  }, [treeValues]);

  return (
    <div className="space-y-3">
      <div>
        <Label>Initial values (build BST)</Label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => setTreeValues(parseNums(text))}
          rows={2}
          spellCheck={false}
          className="mono w-full resize-none rounded-md border border-border bg-panel-2 px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-violet-500"
        />
      </div>
      <button
        onClick={() => runTreeOp("build", 0)}
        className={`w-full rounded-md border py-1.5 text-xs font-medium transition ${
          treeOp === "build"
            ? "border-violet-500 bg-violet-600/15 text-white"
            : "border-border bg-panel-2 text-slate-200 hover:border-slate-600"
        }`}
      >
        ▶ Animate build
      </button>
      <div>
        <Label>Operation value</Label>
        <input
          type="number"
          value={opVal}
          onChange={(e) => setOpVal(e.target.value)}
          className="mono mb-2 w-full rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-violet-500"
        />
        <div className="grid grid-cols-3 gap-1.5">
          {["insert", "search", "delete"].map((op) => (
            <button
              key={op}
              onClick={() => runTreeOp(op, opVal)}
              className="rounded-md border border-border bg-panel-2 py-1.5 text-[11px] font-medium capitalize text-slate-200 transition hover:border-violet-500 hover:text-white"
            >
              {op}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- DP controls ----------------------------------------------------------
function DPControls() {
  const kind = useStore((s) => s.activeAlgo()?.inputKind);
  const fibN = useStore((s) => s.fibN);
  const setFibN = useStore((s) => s.setFibN);
  const knapWeights = useStore((s) => s.knapWeights);
  const knapValues = useStore((s) => s.knapValues);
  const knapCapacity = useStore((s) => s.knapCapacity);
  const setKnapsack = useStore((s) => s.setKnapsack);
  const lcsA = useStore((s) => s.lcsA);
  const lcsB = useStore((s) => s.lcsB);
  const setLcs = useStore((s) => s.setLcs);

  const [w, setW] = useState(knapWeights.join(", "));
  const [v, setV] = useState(knapValues.join(", "));
  useEffect(() => setW(knapWeights.join(", ")), [knapWeights]);
  useEffect(() => setV(knapValues.join(", ")), [knapValues]);

  if (kind === "dp-fib") {
    return (
      <div>
        <Label>n = {fibN}</Label>
        <input
          type="range"
          min={1}
          max={22}
          value={fibN}
          onChange={(e) => setFibN(Number(e.target.value))}
          className="w-full"
        />
      </div>
    );
  }

  if (kind === "dp-knapsack") {
    return (
      <div className="space-y-3">
        <div>
          <Label>Weights</Label>
          <input
            value={w}
            onChange={(e) => setW(e.target.value)}
            onBlur={() => setKnapsack({ weights: parseNums(w) })}
            className="mono w-full rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <Label>Values</Label>
          <input
            value={v}
            onChange={(e) => setV(e.target.value)}
            onBlur={() => setKnapsack({ values: parseNums(v) })}
            className="mono w-full rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <Label>Capacity: {knapCapacity}</Label>
          <input
            type="range"
            min={1}
            max={15}
            value={knapCapacity}
            onChange={(e) => setKnapsack({ capacity: Number(e.target.value) })}
            className="w-full"
          />
        </div>
      </div>
    );
  }

  // dp-lcs
  return (
    <div className="space-y-3">
      <div>
        <Label>String A</Label>
        <input
          value={lcsA}
          onChange={(e) => setLcs({ a: e.target.value.toUpperCase() })}
          maxLength={12}
          className="mono w-full rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-xs uppercase text-slate-200 outline-none focus:border-violet-500"
        />
      </div>
      <div>
        <Label>String B</Label>
        <input
          value={lcsB}
          onChange={(e) => setLcs({ b: e.target.value.toUpperCase() })}
          maxLength={12}
          className="mono w-full rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-xs uppercase text-slate-200 outline-none focus:border-violet-500"
        />
      </div>
    </div>
  );
}

// ---- Comparison selectors -------------------------------------------------
function ComparisonSelectors() {
  const comparisonIds = useStore((s) => s.comparisonIds);
  const setComparisonIds = useStore((s) => s.setComparisonIds);

  const toggle = (id) => {
    let next;
    if (comparisonIds.includes(id)) {
      next = comparisonIds.filter((x) => x !== id);
      if (next.length < 2) return; // keep at least 2
    } else {
      next = [...comparisonIds, id].slice(0, 3); // max 3
    }
    setComparisonIds(next);
  };

  return (
    <div>
      <Label>Algorithms to compare (2–3)</Label>
      <div className="grid grid-cols-2 gap-1.5">
        {SORTING_IDS.map((id) => {
          const active = comparisonIds.includes(id);
          const order = comparisonIds.indexOf(id);
          return (
            <button
              key={id}
              onClick={() => toggle(id)}
              className={`flex items-center justify-between rounded-md border px-2 py-1.5 text-xs transition ${
                active
                  ? "border-violet-500 bg-violet-600/15 text-white"
                  : "border-border bg-panel-2 text-slate-300 hover:border-slate-600"
              }`}
            >
              <span>{ALGORITHMS[id].name}</span>
              {active && (
                <span className="ml-1 rounded bg-violet-500 px-1 text-[9px] text-white">
                  {order + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- Main panel -----------------------------------------------------------
export default function InputPanel() {
  const mode = useStore((s) => s.mode);
  const algo = useStore((s) => s.activeAlgo());
  const regenerate = useStore((s) => s.regenerate);
  const play = useStore((s) => s.play);
  const jumpStart = useStore((s) => s.jumpStart);

  if (mode === "comparison") {
    return (
      <div className="space-y-4">
        <ComparisonSelectors />
        <ArrayEditor />
        <RunReset onRun={() => { regenerate(); play(); }} />
      </div>
    );
  }

  if (mode === "ai") {
    return (
      <div className="space-y-4">
        <AIBuilder />
        <div className="h-px bg-border" />
        <ArrayEditor />
      </div>
    );
  }

  const kind = algo?.inputKind;
  return (
    <div className="space-y-4">
      <AlgorithmPicker />
      <div className="h-px bg-border" />
      {(kind === "array") && (
        <>
          <ArrayEditor />
          {algo?.needsTarget && <TargetEditor />}
        </>
      )}
      {kind === "graph" && <GraphControls />}
      {kind === "tree" && <TreeControls />}
      {(kind === "dp-fib" || kind === "dp-knapsack" || kind === "dp-lcs") && (
        <DPControls />
      )}
      {kind === "array" && (
        <RunReset
          onRun={() => {
            jumpStart();
            play();
          }}
        />
      )}
    </div>
  );
}

function RunReset({ onRun }) {
  const jumpStart = useStore((s) => s.jumpStart);
  return (
    <div className="grid grid-cols-2 gap-2 pt-1">
      <button
        onClick={onRun}
        className="rounded-md bg-violet-600 py-2 text-xs font-semibold text-white transition hover:bg-violet-500"
      >
        ▶ Run
      </button>
      <button
        onClick={jumpStart}
        className="rounded-md border border-border bg-panel-2 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:text-white"
      >
        ↺ Reset
      </button>
    </div>
  );
}
