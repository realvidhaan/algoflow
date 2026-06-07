import { makeStep } from "../../lib/stepSchema.js";

export const code = `function linearSearch(a, target) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] === target) {
      return i;
    }
  }
  return -1;
}`;

export function* generator(input, opts = {}) {
  const a = [...input];
  const n = a.length;
  const target = opts.target ?? a[Math.floor(n / 2)];
  const c = { comparisons: 0, swaps: 0, arrayAccesses: 0 };
  const step = (type, f) =>
    makeStep(type, { ...f, array: [...a], counters: { ...c } });

  yield step("highlight", {
    indices: [],
    codeLine: 1,
    description: `Linear Search for ${target}: scan left to right until found.`,
  });

  for (let i = 0; i < n; i++) {
    c.comparisons++;
    c.arrayAccesses++;
    yield step("compare", {
      indices: [i],
      pointers: { i },
      codeLine: 3,
      description: `Compare a[${i}] = ${a[i]} with target ${target}.`,
    });
    if (a[i] === target) {
      yield step("found", {
        indices: [i],
        pointers: { i },
        codeLine: 4,
        description: `Found target ${target} at index ${i}.`,
      });
      return;
    }
  }

  yield step("not-found", {
    indices: [],
    codeLine: 7,
    description: `Target ${target} is not in the array. Return -1.`,
  });
}
