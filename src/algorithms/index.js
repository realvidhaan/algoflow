// Central registry: id -> algorithm descriptor.
// Each descriptor exposes a generator (yields steps), its source `code`
// string (kept in sync with codeLine values), complexity, and which
// visualizer renders its steps.

import * as bubble from "./sorting/bubblesort.js";
import * as insertion from "./sorting/insertionsort.js";
import * as selection from "./sorting/selectionsort.js";
import * as quick from "./sorting/quicksort.js";
import * as merge from "./sorting/mergesort.js";
import * as heap from "./sorting/heapsort.js";

import * as binary from "./searching/binarysearch.js";
import * as linear from "./searching/linearsearch.js";

import * as bfs from "./graph/bfs.js";
import * as dfs from "./graph/dfs.js";
import * as dijkstra from "./graph/dijkstra.js";

import * as bst from "./tree/bst.js";

import * as fibonacci from "./dp/fibonacci.js";
import * as knapsack from "./dp/knapsack.js";
import * as lcs from "./dp/lcs.js";

export const ALGORITHMS = {
  // ---- Sorting (ArrayVisualizer) ----
  bubble: {
    id: "bubble",
    name: "Bubble Sort",
    category: "Sorting",
    visualizer: "array",
    inputKind: "array",
    generator: bubble.generator,
    code: bubble.code,
    timeComplexity: "O(n²)",
    spaceComplexity: "O(1)",
  },
  insertion: {
    id: "insertion",
    name: "Insertion Sort",
    category: "Sorting",
    visualizer: "array",
    inputKind: "array",
    generator: insertion.generator,
    code: insertion.code,
    timeComplexity: "O(n²)",
    spaceComplexity: "O(1)",
  },
  selection: {
    id: "selection",
    name: "Selection Sort",
    category: "Sorting",
    visualizer: "array",
    inputKind: "array",
    generator: selection.generator,
    code: selection.code,
    timeComplexity: "O(n²)",
    spaceComplexity: "O(1)",
  },
  quick: {
    id: "quick",
    name: "Quick Sort",
    category: "Sorting",
    visualizer: "array",
    inputKind: "array",
    generator: quick.generator,
    code: quick.code,
    timeComplexity: "O(n log n) avg · O(n²) worst",
    spaceComplexity: "O(log n)",
  },
  merge: {
    id: "merge",
    name: "Merge Sort",
    category: "Sorting",
    visualizer: "array",
    inputKind: "array",
    generator: merge.generator,
    code: merge.code,
    timeComplexity: "O(n log n)",
    spaceComplexity: "O(n)",
  },
  heap: {
    id: "heap",
    name: "Heap Sort",
    category: "Sorting",
    visualizer: "array",
    inputKind: "array",
    generator: heap.generator,
    code: heap.code,
    timeComplexity: "O(n log n)",
    spaceComplexity: "O(1)",
  },

  // ---- Searching (ArrayVisualizer) ----
  binary: {
    id: "binary",
    name: "Binary Search",
    category: "Searching",
    visualizer: "array",
    inputKind: "array",
    needsTarget: true,
    autoSort: true,
    generator: binary.generator,
    code: binary.code,
    timeComplexity: "O(log n)",
    spaceComplexity: "O(1)",
  },
  linear: {
    id: "linear",
    name: "Linear Search",
    category: "Searching",
    visualizer: "array",
    inputKind: "array",
    needsTarget: true,
    generator: linear.generator,
    code: linear.code,
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
  },

  // ---- Graph (GraphVisualizer) ----
  bfs: {
    id: "bfs",
    name: "Breadth-First Search",
    category: "Graph",
    visualizer: "graph",
    inputKind: "graph",
    generator: bfs.generator,
    code: bfs.code,
    timeComplexity: "O(V + E)",
    spaceComplexity: "O(V)",
  },
  dfs: {
    id: "dfs",
    name: "Depth-First Search",
    category: "Graph",
    visualizer: "graph",
    inputKind: "graph",
    generator: dfs.generator,
    code: dfs.code,
    timeComplexity: "O(V + E)",
    spaceComplexity: "O(V)",
  },
  dijkstra: {
    id: "dijkstra",
    name: "Dijkstra's Shortest Path",
    category: "Graph",
    visualizer: "graph",
    inputKind: "graph",
    weighted: true,
    generator: dijkstra.generator,
    code: dijkstra.code,
    timeComplexity: "O((V + E) log V)",
    spaceComplexity: "O(V)",
  },

  // ---- Tree (TreeVisualizer) ----
  bst: {
    id: "bst",
    name: "Binary Search Tree",
    category: "Tree",
    visualizer: "tree",
    inputKind: "tree",
    generator: bst.generator,
    code: bst.code,
    timeComplexity: "O(h) per op · O(log n) balanced",
    spaceComplexity: "O(n)",
  },

  // ---- Dynamic Programming (DPVisualizer) ----
  fibonacci: {
    id: "fibonacci",
    name: "Fibonacci (Memoized)",
    category: "Dynamic Programming",
    visualizer: "dp",
    inputKind: "dp-fib",
    generator: fibonacci.generator,
    code: fibonacci.code,
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
  },
  knapsack: {
    id: "knapsack",
    name: "0/1 Knapsack",
    category: "Dynamic Programming",
    visualizer: "dp",
    inputKind: "dp-knapsack",
    generator: knapsack.generator,
    code: knapsack.code,
    timeComplexity: "O(n · W)",
    spaceComplexity: "O(n · W)",
  },
  lcs: {
    id: "lcs",
    name: "Longest Common Subsequence",
    category: "Dynamic Programming",
    visualizer: "dp",
    inputKind: "dp-lcs",
    generator: lcs.generator,
    code: lcs.code,
    timeComplexity: "O(n · m)",
    spaceComplexity: "O(n · m)",
  },
};

export const CATEGORY_ORDER = [
  "Sorting",
  "Searching",
  "Graph",
  "Tree",
  "Dynamic Programming",
];

// Algorithms grouped by category, preserving registry order within a group.
export function groupedAlgorithms() {
  const groups = {};
  for (const algo of Object.values(ALGORITHMS)) {
    (groups[algo.category] ||= []).push(algo);
  }
  return CATEGORY_ORDER.filter((c) => groups[c]).map((c) => ({
    category: c,
    items: groups[c],
  }));
}

// Sorting algorithms only — used by Comparison Mode.
export const SORTING_IDS = ["bubble", "insertion", "selection", "quick", "merge", "heap"];

export function getAlgorithm(id) {
  return ALGORITHMS[id];
}

/**
 * Run an algorithm's generator to completion and collect all steps.
 * This is the heart of the engine: precompute the full steps array, then
 * the UI indexes into it for play / step / scrub / rewind.
 */
export function computeSteps(id, input, opts = {}) {
  const algo = ALGORITHMS[id];
  if (!algo) return [];
  try {
    return Array.from(algo.generator(input, opts));
  } catch (err) {
    console.error(`computeSteps(${id}) failed:`, err);
    return [];
  }
}
