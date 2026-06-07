// Correctness harness for every algorithm: validates final state and that
// every codeLine points to a real line in that algorithm's `code` string.
import { ALGORITHMS, computeSteps } from "../src/algorithms/index.js";

let failures = 0;
const ok = (cond, msg) => {
  if (!cond) {
    failures++;
    console.log("  ✗ " + msg);
  } else {
    console.log("  ✓ " + msg);
  }
};

function lineCount(code) {
  return code.split("\n").length;
}

function checkCodeLines(id, steps) {
  const lc = lineCount(ALGORITHMS[id].code);
  let bad = 0;
  for (const s of steps) {
    if (s.codeLine < 0 || s.codeLine > lc) bad++;
    if (!s.type || typeof s.description !== "string") bad++;
  }
  ok(bad === 0, `${id}: all ${steps.length} steps valid, codeLine in [0, ${lc}]`);
}

const rand = (n) =>
  Array.from({ length: n }, () => Math.floor(Math.random() * 99) + 1);

console.log("=== Sorting ===");
for (const id of ["bubble", "insertion", "selection", "quick", "merge", "heap"]) {
  const input = rand(12);
  const expected = [...input].sort((a, b) => a - b);
  const steps = computeSteps(id, input);
  const final = steps[steps.length - 1].array;
  ok(
    JSON.stringify(final) === JSON.stringify(expected),
    `${id}: final array sorted correctly`
  );
  checkCodeLines(id, steps);
}

// Edge cases for sorting
console.log("=== Sorting edge cases ===");
for (const id of ["bubble", "insertion", "selection", "quick", "merge", "heap"]) {
  for (const input of [[], [1], [2, 1], [5, 5, 5], [3, 1, 2, 1, 3]]) {
    const expected = [...input].sort((a, b) => a - b);
    const steps = computeSteps(id, input);
    const final = steps.length ? steps[steps.length - 1].array : [];
    const pass = JSON.stringify(final) === JSON.stringify(expected);
    if (!pass) {
      failures++;
      console.log(`  ✗ ${id} on [${input}] -> [${final}] expected [${expected}]`);
    }
  }
  console.log(`  ✓ ${id}: edge cases pass`);
}

console.log("=== Searching ===");
{
  const input = [9, 3, 7, 1, 5, 8, 2];
  // linear: present + absent
  let steps = computeSteps("linear", input, { target: 5 });
  ok(steps[steps.length - 1].type === "found", "linear: finds present target");
  steps = computeSteps("linear", input, { target: 100 });
  ok(steps[steps.length - 1].type === "not-found", "linear: reports absent target");
  checkCodeLines("linear", steps);

  steps = computeSteps("binary", input, { target: 7 });
  const last = steps[steps.length - 1];
  ok(last.type === "found", "binary: finds present target (after auto-sort)");
  const sorted = [...input].sort((a, b) => a - b);
  ok(
    last.array && JSON.stringify(last.array) === JSON.stringify(sorted),
    "binary: array auto-sorted"
  );
  steps = computeSteps("binary", input, { target: 6 });
  ok(steps[steps.length - 1].type === "not-found", "binary: reports absent target");
  checkCodeLines("binary", steps);
}

console.log("=== Graph ===");
{
  const graph = {
    nodes: [
      { id: "A", x: 0, y: 0 },
      { id: "B", x: 1, y: 0 },
      { id: "C", x: 2, y: 0 },
      { id: "D", x: 1, y: 1 },
      { id: "E", x: 2, y: 1 },
    ],
    edges: [
      { from: "A", to: "B", weight: 1 },
      { from: "A", to: "D", weight: 4 },
      { from: "B", to: "C", weight: 2 },
      { from: "B", to: "D", weight: 5 },
      { from: "C", to: "E", weight: 1 },
      { from: "D", to: "E", weight: 3 },
    ],
    directed: false,
  };
  for (const id of ["bfs", "dfs"]) {
    const steps = computeSteps(id, graph, { start: "A" });
    const visitedFinal = steps[steps.length - 1].visited || [];
    ok(visitedFinal.length === 5, `${id}: visits all 5 reachable nodes`);
    checkCodeLines(id, steps);
  }
  const steps = computeSteps("dijkstra", graph, { start: "A", end: "E" });
  const last = steps[steps.length - 1];
  // Shortest A->E: A-B-C-E = 1+2+1 = 4
  ok(
    last.dist && last.dist.E === 4,
    `dijkstra: dist[E] = 4 (got ${last.dist && last.dist.E})`
  );
  ok(
    last.path && last.path.join("") === "ABCE",
    `dijkstra: shortest path A→B→C→E (got ${last.path && last.path.join("→")})`
  );
  checkCodeLines("dijkstra", steps);
}

console.log("=== Tree (BST) ===");
{
  const input = [50, 30, 70, 20, 40, 60, 80];
  let steps = computeSteps("bst", input, { op: "build" });
  ok(steps.length > input.length, "bst: build produces steps");
  checkCodeLines("bst", steps);

  steps = computeSteps("bst", input, { op: "search", value: 60 });
  ok(steps[steps.length - 1].type !== "not-found", "bst: search finds 60");
  steps = computeSteps("bst", input, { op: "search", value: 999 });
  ok(steps[steps.length - 1].type === "not-found", "bst: search misses 999");

  steps = computeSteps("bst", input, { op: "delete", value: 30 });
  const tree = steps[steps.length - 1].tree;
  // 30 should be gone; in-order should still be sorted without 30
  const inorder = [];
  (function walk(n) {
    if (!n) return;
    walk(n.left);
    inorder.push(n.value);
    walk(n.right);
  })(tree);
  ok(
    !inorder.includes(30) &&
      JSON.stringify(inorder) === JSON.stringify([...inorder].sort((a, b) => a - b)),
    `bst: delete 30 keeps BST order (inorder ${inorder.join(",")})`
  );
  checkCodeLines("bst", steps);

  steps = computeSteps("bst", input, { op: "insert", value: 65 });
  const t2 = steps[steps.length - 1].tree;
  const io2 = [];
  (function walk(n) {
    if (!n) return;
    walk(n.left);
    io2.push(n.value);
    walk(n.right);
  })(t2);
  ok(io2.includes(65), "bst: insert 65 present in tree");
}

console.log("=== DP ===");
{
  let steps = computeSteps("fibonacci", null, { n: 10 });
  const last = steps[steps.length - 1];
  ok(last.description.includes("55"), `fibonacci: F(10) = 55 (${last.description})`);
  checkCodeLines("fibonacci", steps);

  steps = computeSteps("knapsack", null, {
    weights: [1, 3, 4, 5],
    values: [1, 4, 5, 7],
    capacity: 7,
  });
  // Optimal for this classic instance is 9 (items w3v4 + w4v5)
  ok(
    steps[steps.length - 1].description.includes("9"),
    `knapsack: best value 9 (${steps[steps.length - 1].description})`
  );
  checkCodeLines("knapsack", steps);

  steps = computeSteps("lcs", null, { a: "AGCAT", b: "GAC" });
  // LCS length of AGCAT / GAC is 2
  ok(
    steps[steps.length - 1].description.includes("length = 2"),
    `lcs: length 2 (${steps[steps.length - 1].description})`
  );
  checkCodeLines("lcs", steps);
}

console.log("");
if (failures === 0) {
  console.log("ALL CHECKS PASSED ✓");
  process.exit(0);
} else {
  console.log(`${failures} CHECK(S) FAILED ✗`);
  process.exit(1);
}
