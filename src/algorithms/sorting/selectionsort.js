import { makeStep } from "../../lib/stepSchema.js";

export const code = `function selectionSort(a) {
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let min = i;
    for (let j = i + 1; j < n; j++) {
      if (a[j] < a[min]) {
        min = j;
      }
    }
    if (min !== i) {
      swap(a, i, min);
    }
    markSorted(i);
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
    description: `Selection Sort on ${n} elements. Select the minimum of the unsorted region each pass.`,
  });

  for (let i = 0; i < n - 1; i++) {
    let min = i;
    yield step("pointer", {
      indices: [i],
      pointers: { i, min },
      codeLine: 4,
      description: `Pass ${i + 1}: assume a[${i}] = ${a[i]} is the minimum of the rest.`,
    });
    for (let j = i + 1; j < n; j++) {
      c.comparisons++;
      c.arrayAccesses += 2;
      yield step("compare", {
        indices: [j, min],
        pointers: { i, j, min },
        codeLine: 6,
        description: `Compare a[${j}] = ${a[j]} with current min a[${min}] = ${a[min]}.`,
      });
      if (a[j] < a[min]) {
        min = j;
        yield step("pointer", {
          indices: [min],
          pointers: { i, j, min },
          codeLine: 7,
          description: `New minimum: a[${min}] = ${a[min]}.`,
        });
      }
    }
    if (min !== i) {
      const x = a[i];
      const y = a[min];
      [a[i], a[min]] = [a[min], a[i]];
      c.swaps++;
      c.arrayAccesses += 2;
      yield step("swap", {
        indices: [i, min],
        pointers: { i, min },
        codeLine: 11,
        description: `Swap a[${i}] = ${x} with minimum a[${min}] = ${y}.`,
      });
    }
    sorted.add(i);
    yield step("mark-sorted", {
      indices: [i],
      codeLine: 13,
      description: `a[${i}] is now in its final sorted position.`,
    });
  }

  for (let k = 0; k < n; k++) sorted.add(k);
  yield step("mark-sorted", {
    indices: Array.from({ length: n }, (_, k) => k),
    codeLine: 15,
    description: `Done — array is fully sorted.`,
  });
}
