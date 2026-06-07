import { makeStep } from "../../lib/stepSchema.js";

// Line numbers in `code` are 1-indexed and match the codeLine of each step.
export const code = `function bubbleSort(a) {
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      if (a[j] > a[j + 1]) {
        swap(a, j, j + 1);
        swapped = true;
      }
    }
    markSorted(n - 1 - i);
    if (!swapped) break;
  }
  return a;
}`;

export function* generator(input) {
  const a = [...input];
  const n = a.length;
  const c = { comparisons: 0, swaps: 0, arrayAccesses: 0 };
  const sorted = new Set();
  const step = (type, f) =>
    makeStep(type, { ...f, array: [...a], sorted: [...sorted], counters: { ...c } });

  yield step("highlight", {
    indices: [],
    codeLine: 1,
    description: `Bubble Sort on ${n} elements. Repeatedly swap adjacent out-of-order pairs.`,
  });

  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    yield step("highlight", {
      indices: [],
      codeLine: 3,
      description: `Pass ${i + 1}: bubble the largest unsorted value to the right.`,
    });
    for (let j = 0; j < n - 1 - i; j++) {
      c.comparisons++;
      c.arrayAccesses += 2;
      yield step("compare", {
        indices: [j, j + 1],
        codeLine: 6,
        description: `Compare a[${j}] = ${a[j]} and a[${j + 1}] = ${a[j + 1]}.`,
      });
      if (a[j] > a[j + 1]) {
        const x = a[j];
        const y = a[j + 1];
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        c.swaps++;
        c.arrayAccesses += 2;
        swapped = true;
        yield step("swap", {
          indices: [j, j + 1],
          codeLine: 7,
          description: `${x} > ${y} → swap a[${j}] and a[${j + 1}].`,
        });
      }
    }
    sorted.add(n - 1 - i);
    yield step("mark-sorted", {
      indices: [n - 1 - i],
      codeLine: 12,
      description: `a[${n - 1 - i}] is now in its final sorted position.`,
    });
    if (!swapped) {
      for (let k = 0; k <= n - 1 - i; k++) sorted.add(k);
      yield step("mark-sorted", {
        indices: [...sorted],
        codeLine: 13,
        description: `No swaps this pass — the array is already sorted. Stop early.`,
      });
      break;
    }
  }

  for (let k = 0; k < n; k++) sorted.add(k);
  yield step("mark-sorted", {
    indices: Array.from({ length: n }, (_, k) => k),
    codeLine: 15,
    description: `Done — array is fully sorted.`,
  });
}
