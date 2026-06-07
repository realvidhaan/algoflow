import { create } from "zustand";
import {
  ALGORITHMS,
  computeSteps,
  SORTING_IDS,
} from "../algorithms/index.js";

// ---------------------------------------------------------------------------
// Default inputs
// ---------------------------------------------------------------------------
const randomArray = (n, max = 99) =>
  Array.from({ length: n }, () => Math.floor(Math.random() * max) + 1);

const DEFAULT_GRAPH = {
  nodes: [
    { id: "A", x: 0.18, y: 0.28 },
    { id: "B", x: 0.5, y: 0.16 },
    { id: "C", x: 0.82, y: 0.3 },
    { id: "D", x: 0.34, y: 0.72 },
    { id: "E", x: 0.7, y: 0.74 },
  ],
  edges: [
    { from: "A", to: "B", weight: 4 },
    { from: "A", to: "D", weight: 3 },
    { from: "B", to: "C", weight: 5 },
    { from: "B", to: "D", weight: 2 },
    { from: "C", to: "E", weight: 6 },
    { from: "D", to: "E", weight: 7 },
  ],
  directed: false,
};

// Base ms-per-step at 1x speed.
const BASE_INTERVAL = 360;

export const useStore = create((set, get) => ({
  // ---- Mode ----
  mode: "single", // "single" | "comparison" | "ai"

  // ---- Selection & inputs ----
  algorithmId: "quick",
  arrayInput: [42, 7, 91, 15, 63, 28, 4, 77, 50, 19, 88, 33],
  arraySize: 12,
  target: 50,

  graph: structuredClone(DEFAULT_GRAPH),
  graphStart: "A",
  graphEnd: "E",

  treeValues: [50, 30, 70, 20, 40, 60, 80],
  treeOp: "build", // build | insert | search | delete
  treeValue: 65,

  fibN: 10,
  knapWeights: [2, 3, 4, 5],
  knapValues: [3, 4, 5, 6],
  knapCapacity: 8,
  lcsA: "AGCAT",
  lcsB: "GAC",

  // ---- Playback ----
  steps: [],
  currentStep: 0,
  isPlaying: false,
  speed: 1,
  baseInterval: BASE_INTERVAL,

  // ---- Comparison mode ----
  comparisonIds: ["quick", "merge"],
  comparison: [], // [{ id, name, steps }]

  // ---- AI builder ----
  ai: {
    status: "idle", // idle | loading | success | error
    name: "",
    code: "",
    steps: [],
    error: "",
    raw: "",
    description: "",
    timeComplexity: "",
    spaceComplexity: "",
  },

  // ----------------------------------------------------------------------
  // Derived helpers
  // ----------------------------------------------------------------------
  activeAlgo() {
    return ALGORITHMS[get().algorithmId];
  },
  activeSteps() {
    const s = get();
    if (s.mode === "ai") return s.ai.steps || [];
    return s.steps;
  },
  activeCode() {
    const s = get();
    if (s.mode === "ai") return s.ai.code || "";
    if (s.mode === "comparison" && s.comparison.length) {
      const algo = ALGORITHMS[s.comparison[0].id];
      return algo ? algo.code : "";
    }
    const algo = ALGORITHMS[s.algorithmId];
    return algo ? algo.code : "";
  },
  currentStepObj() {
    const s = get();
    if (s.mode === "comparison" && s.comparison.length) {
      const pane = s.comparison[0];
      const idx = Math.min(s.currentStep, pane.steps.length - 1);
      return pane.steps[idx] || null;
    }
    const steps = get().activeSteps();
    return steps[get().currentStep] || null;
  },

  // ----------------------------------------------------------------------
  // Step computation
  // ----------------------------------------------------------------------
  buildOpts() {
    const s = get();
    const algo = ALGORITHMS[s.algorithmId];
    if (!algo) return { input: [], opts: {} };
    switch (algo.inputKind) {
      case "array":
        return {
          input: s.arrayInput,
          opts: algo.needsTarget ? { target: s.target } : {},
        };
      case "graph":
        return {
          input: s.graph,
          opts: { start: s.graphStart, end: s.graphEnd },
        };
      case "tree":
        return {
          input: s.treeValues,
          opts: { op: s.treeOp, value: s.treeValue },
        };
      case "dp-fib":
        return { input: null, opts: { n: s.fibN } };
      case "dp-knapsack":
        return {
          input: null,
          opts: {
            weights: s.knapWeights,
            values: s.knapValues,
            capacity: s.knapCapacity,
          },
        };
      case "dp-lcs":
        return { input: null, opts: { a: s.lcsA, b: s.lcsB } };
      default:
        return { input: s.arrayInput, opts: {} };
    }
  },

  regenerate() {
    const s = get();
    if (s.mode === "comparison") {
      get().regenerateComparison();
      return;
    }
    if (s.mode === "ai") {
      set({ currentStep: 0, isPlaying: false });
      return;
    }
    const { input, opts } = get().buildOpts();
    const steps = computeSteps(s.algorithmId, input, opts);
    set({ steps, currentStep: 0, isPlaying: false });
  },

  regenerateComparison() {
    const s = get();
    const comparison = s.comparisonIds.map((id) => ({
      id,
      name: ALGORITHMS[id].name,
      steps: computeSteps(id, s.arrayInput, {}),
    }));
    set({ comparison, currentStep: 0, isPlaying: false });
  },

  comparisonLength() {
    const c = get().comparison;
    return c.reduce((m, p) => Math.max(m, p.steps.length), 0);
  },

  totalSteps() {
    const s = get();
    if (s.mode === "comparison") return get().comparisonLength();
    return get().activeSteps().length;
  },

  // ----------------------------------------------------------------------
  // Selection actions
  // ----------------------------------------------------------------------
  setAlgorithm(id) {
    const algo = ALGORITHMS[id];
    if (!algo) return;
    set({ algorithmId: id, mode: "single" });
    // Reset target into range for searches.
    if (algo.needsTarget) {
      const arr = get().arrayInput;
      set({ target: arr[Math.floor(arr.length / 2)] ?? 0 });
    }
    if (algo.inputKind === "tree") set({ treeOp: "build" });
    get().regenerate();
  },

  setMode(mode) {
    set({ mode });
    get().regenerate();
  },

  // ---- Array input ----
  setArrayInput(arr) {
    const clean = arr
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x));
    if (clean.length === 0) return;
    set({ arrayInput: clean, arraySize: clean.length });
    // keep target valid
    set({ target: clean[Math.floor(clean.length / 2)] });
    get().regenerate();
  },
  randomizeArray() {
    const n = get().arraySize;
    const arr = randomArray(n);
    set({ arrayInput: arr, target: arr[Math.floor(n / 2)] });
    get().regenerate();
  },
  setArraySize(n) {
    const size = Math.max(5, Math.min(50, Math.round(n)));
    const arr = randomArray(size);
    set({ arraySize: size, arrayInput: arr, target: arr[Math.floor(size / 2)] });
    get().regenerate();
  },
  setTarget(t) {
    set({ target: Number(t) });
    get().regenerate();
  },

  // ---- Graph editing ----
  setGraph(graph) {
    set({ graph });
    get().regenerate();
  },
  addNode(x, y) {
    const g = structuredClone(get().graph);
    // Next free single-letter / numbered id
    const used = new Set(g.nodes.map((n) => n.id));
    let id = null;
    for (let i = 0; i < 26; i++) {
      const cand = String.fromCharCode(65 + i);
      if (!used.has(cand)) {
        id = cand;
        break;
      }
    }
    if (id === null) id = "N" + g.nodes.length;
    g.nodes.push({ id, x, y });
    set({ graph: g });
    get().regenerate();
    return id;
  },
  moveNode(id, x, y) {
    const g = structuredClone(get().graph);
    const node = g.nodes.find((n) => n.id === id);
    if (node) {
      node.x = Math.max(0.04, Math.min(0.96, x));
      node.y = Math.max(0.06, Math.min(0.94, y));
    }
    set({ graph: g });
  },
  addEdge(from, to, weight = 1) {
    if (from === to) return;
    const g = structuredClone(get().graph);
    const exists = g.edges.some(
      (e) =>
        (e.from === from && e.to === to) ||
        (!g.directed && e.from === to && e.to === from)
    );
    if (!exists) g.edges.push({ from, to, weight: Number(weight) || 1 });
    set({ graph: g });
    get().regenerate();
  },
  setEdgeWeight(from, to, weight) {
    const g = structuredClone(get().graph);
    const e = g.edges.find((e) => e.from === from && e.to === to);
    if (e) e.weight = Number(weight) || 1;
    set({ graph: g });
    get().regenerate();
  },
  deleteNode(id) {
    const g = structuredClone(get().graph);
    g.nodes = g.nodes.filter((n) => n.id !== id);
    g.edges = g.edges.filter((e) => e.from !== id && e.to !== id);
    let { graphStart, graphEnd } = get();
    if (graphStart === id) graphStart = g.nodes[0] && g.nodes[0].id;
    if (graphEnd === id) graphEnd = g.nodes[g.nodes.length - 1] && g.nodes[g.nodes.length - 1].id;
    set({ graph: g, graphStart, graphEnd });
    get().regenerate();
  },
  deleteEdge(from, to) {
    const g = structuredClone(get().graph);
    g.edges = g.edges.filter(
      (e) =>
        !(
          (e.from === from && e.to === to) ||
          (!g.directed && e.from === to && e.to === from)
        )
    );
    set({ graph: g });
    get().regenerate();
  },
  toggleDirected() {
    const g = structuredClone(get().graph);
    g.directed = !g.directed;
    set({ graph: g });
    get().regenerate();
  },
  setGraphStart(id) {
    set({ graphStart: id });
    get().regenerate();
  },
  setGraphEnd(id) {
    set({ graphEnd: id });
    get().regenerate();
  },
  resetGraph() {
    set({
      graph: structuredClone(DEFAULT_GRAPH),
      graphStart: "A",
      graphEnd: "E",
    });
    get().regenerate();
  },

  // ---- Tree ops ----
  setTreeValues(arr) {
    const clean = arr.map(Number).filter(Number.isFinite);
    set({ treeValues: clean });
    get().regenerate();
  },
  runTreeOp(op, value) {
    set({ treeOp: op, treeValue: Number(value) });
    // For insert/delete, also reflect into treeValues so subsequent ops build on it.
    if (op === "insert" && Number.isFinite(Number(value))) {
      const tv = [...get().treeValues, Number(value)];
      set({ treeValues: tv });
    } else if (op === "delete") {
      const tv = get().treeValues.filter((v) => v !== Number(value));
      set({ treeValues: tv });
    }
    get().regenerate();
  },

  // ---- DP inputs ----
  setFibN(n) {
    set({ fibN: Math.max(1, Math.min(22, Math.round(n))) });
    get().regenerate();
  },
  setKnapsack({ weights, values, capacity }) {
    set((s) => ({
      knapWeights: weights ?? s.knapWeights,
      knapValues: values ?? s.knapValues,
      knapCapacity: capacity ?? s.knapCapacity,
    }));
    get().regenerate();
  },
  setLcs({ a, b }) {
    set((s) => ({ lcsA: a ?? s.lcsA, lcsB: b ?? s.lcsB }));
    get().regenerate();
  },

  // ---- Comparison ----
  setComparisonIds(ids) {
    const valid = ids.filter((id) => SORTING_IDS.includes(id));
    set({ comparisonIds: valid.length >= 2 ? valid : get().comparisonIds });
    if (get().mode === "comparison") get().regenerateComparison();
  },

  // ---- AI ----
  setAi(partial) {
    set((s) => ({ ai: { ...s.ai, ...partial } }));
  },
  loadAiResult({ name, code, steps, raw, description, timeComplexity, spaceComplexity }) {
    set({
      ai: {
        status: "success",
        name,
        code,
        steps,
        error: "",
        raw: raw || "",
        description: description || "",
        timeComplexity: timeComplexity || "",
        spaceComplexity: spaceComplexity || "",
      },
      mode: "ai",
      currentStep: 0,
      isPlaying: false,
    });
  },

  // ----------------------------------------------------------------------
  // Playback controls
  // ----------------------------------------------------------------------
  play() {
    if (get().totalSteps() === 0) return;
    if (get().currentStep >= get().totalSteps() - 1) set({ currentStep: 0 });
    set({ isPlaying: true });
  },
  pause() {
    set({ isPlaying: false });
  },
  togglePlay() {
    get().isPlaying ? get().pause() : get().play();
  },
  stepForward() {
    const total = get().totalSteps();
    set((s) => ({
      currentStep: Math.min(total - 1, s.currentStep + 1),
      isPlaying: false,
    }));
  },
  stepBack() {
    set((s) => ({ currentStep: Math.max(0, s.currentStep - 1), isPlaying: false }));
  },
  jumpStart() {
    set({ currentStep: 0, isPlaying: false });
  },
  jumpEnd() {
    set({ currentStep: Math.max(0, get().totalSteps() - 1), isPlaying: false });
  },
  setStep(i) {
    const total = get().totalSteps();
    set({ currentStep: Math.max(0, Math.min(total - 1, Math.round(i))) });
  },
  setSpeed(v) {
    set({ speed: v });
  },
  // Advance one tick from the playback hook; auto-pause at the end.
  tick() {
    const s = get();
    if (s.currentStep >= s.totalSteps() - 1) {
      set({ isPlaying: false });
      return;
    }
    set({ currentStep: s.currentStep + 1 });
  },
}));

// Initialize the first run.
useStore.getState().regenerate();
