// stepSchema.js
// ---------------------------------------------------------------------------
// The single source of truth for the "step" object every algorithm yields.
// A step is a plain, serializable object describing ONE atomic operation.
// The visualization engine consumes a precomputed array of these and renders
// state[i] on demand — which is what makes step-back and scrubbing trivial.
// ---------------------------------------------------------------------------

export const STEP_TYPES = [
  "compare",
  "swap",
  "set",
  "highlight",
  "mark-sorted",
  "pointer",
  "visit",
  "enqueue",
  "dequeue",
  "edge-traverse",
  "tree-node",
  "dp-cell",
  "found",
  "not-found",
];

// Types the AI builder is allowed to emit (array-based only).
export const ARRAY_STEP_TYPES = [
  "compare",
  "swap",
  "set",
  "highlight",
  "mark-sorted",
  "pointer",
  "found",
  "not-found",
];

/**
 * Build a normalized step. Only `type`, `codeLine`, and `description` are
 * guaranteed; everything else is included only when provided. Counters are
 * merged so callers can pass a running tally.
 */
export function makeStep(type, fields = {}) {
  const step = {
    type,
    codeLine: fields.codeLine ?? 0,
    description: fields.description ?? "",
  };
  if (fields.indices) step.indices = fields.indices;
  if (fields.values) step.values = fields.values;
  if (fields.nodes) step.nodes = fields.nodes;
  if (fields.edges) step.edges = fields.edges;
  if (fields.cell) step.cell = fields.cell;
  if (fields.deps) step.deps = fields.deps;
  if (fields.pointers) step.pointers = fields.pointers;
  if (fields.sorted) step.sorted = fields.sorted;
  if (fields.pivot !== undefined && fields.pivot !== null)
    step.pivot = fields.pivot;
  if (fields.array) step.array = fields.array;
  if (fields.counters) step.counters = { ...fields.counters };
  if (fields.path) step.path = fields.path;
  if (fields.tree) step.tree = fields.tree;
  if (fields.table) step.table = fields.table;
  if (fields.extra) step.extra = fields.extra;
  // Graph decoration (scrub-safe snapshots)
  if (fields.current !== undefined && fields.current !== null)
    step.current = fields.current;
  if (fields.visited) step.visited = fields.visited;
  if (fields.frontier) step.frontier = fields.frontier;
  if (fields.traversed) step.traversed = fields.traversed;
  if (fields.dist) step.dist = fields.dist;
  if (fields.activeEdge) step.activeEdge = fields.activeEdge;
  return step;
}

/**
 * A small helper class algorithms use to accumulate steps while keeping a
 * live snapshot of the working array and the running counters. Every push
 * deep-copies the array so each step owns its own immutable snapshot — this
 * is the contract scrubbing relies on.
 */
export class StepRecorder {
  constructor(initialArray = []) {
    this.array = Array.isArray(initialArray) ? [...initialArray] : [];
    this.steps = [];
    this.counters = { comparisons: 0, swaps: 0, arrayAccesses: 0 };
  }

  bump(key, by = 1) {
    this.counters[key] = (this.counters[key] || 0) + by;
  }

  push(type, fields = {}) {
    const step = makeStep(type, {
      ...fields,
      array: fields.array ?? [...this.array],
      counters: { ...this.counters },
    });
    this.steps.push(step);
    return step;
  }

  done() {
    return this.steps;
  }
}

/**
 * Validate a single step coming from an untrusted source (the AI builder).
 * Returns { ok: true } or { ok: false, reason }.
 */
export function validateStep(step, { allowedTypes = STEP_TYPES } = {}) {
  if (typeof step !== "object" || step === null)
    return { ok: false, reason: "step is not an object" };
  if (!allowedTypes.includes(step.type))
    return { ok: false, reason: `unknown step type "${step.type}"` };
  if (typeof step.description !== "string")
    return { ok: false, reason: "description must be a string" };
  if (step.indices && !Array.isArray(step.indices))
    return { ok: false, reason: "indices must be an array" };
  if (step.values && !Array.isArray(step.values))
    return { ok: false, reason: "values must be an array" };
  return { ok: true };
}

/**
 * Validate an array of steps. Returns { ok, steps?, reason? }.
 * `codeLine` is coerced to a number and defaulted to 0 when absent.
 */
export function validateSteps(steps, opts = {}) {
  if (!Array.isArray(steps))
    return { ok: false, reason: "steps is not an array" };
  if (steps.length === 0)
    return { ok: false, reason: "steps array is empty" };
  const normalized = [];
  for (let i = 0; i < steps.length; i++) {
    const res = validateStep(steps[i], opts);
    if (!res.ok) return { ok: false, reason: `step ${i}: ${res.reason}` };
    const s = steps[i];
    normalized.push({
      ...s,
      codeLine: Number.isFinite(s.codeLine) ? s.codeLine : 0,
      description: s.description || "",
    });
  }
  return { ok: true, steps: normalized };
}

/**
 * Reconstruct a renderable array snapshot for every step coming from the AI
 * builder. The model emits operations (swap/set/mark-sorted/...) traced on the
 * sample array; we replay them to attach a concrete `array` and accumulated
 * `sorted` set to each step, so the ArrayVisualizer can render them exactly
 * like a built-in algorithm — even if the model omitted array snapshots.
 */
export function hydrateArraySteps(steps, sampleArray) {
  const a = Array.isArray(sampleArray) ? [...sampleArray] : [];
  const inBounds = (i) => Number.isInteger(i) && i >= 0 && i < a.length;
  const sorted = new Set();
  return steps.map((s) => {
    const indices = Array.isArray(s.indices) ? s.indices : [];
    if (s.type === "swap" && indices.length >= 2) {
      const [i, j] = indices;
      if (inBounds(i) && inBounds(j)) {
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
      }
    } else if (s.type === "set" && indices.length >= 1) {
      const i = indices[0];
      const v =
        Array.isArray(s.values) && s.values.length ? s.values[0] : a[i];
      if (inBounds(i)) a[i] = v;
    } else if (s.type === "mark-sorted") {
      for (const i of indices) if (inBounds(i)) sorted.add(i);
    } else if (s.type === "found") {
      for (const i of indices) if (inBounds(i)) sorted.add(i);
    }
    return { ...s, array: [...a], sorted: [...sorted] };
  });
}

// State color tokens shared by the array renderer and legends.
export const STATE_COLORS = {
  default: "#64748b",
  compare: "#f59e0b",
  swap: "#ef4444",
  sorted: "#10b981",
  pivot: "#8b5cf6",
  pointer: "#0ea5e9",
  found: "#facc15", // bright yellow — found max/min/value
  notfound: "#ef4444",
};
