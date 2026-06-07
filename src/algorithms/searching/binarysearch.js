import { makeStep } from "../../lib/stepSchema.js";

export const code = `function binarySearch(a, target) {
  a = [...a].sort((x, y) => x - y);
  let lo = 0, hi = a.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid] === target) return mid;
    if (a[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`;

// Flag consumed by the UI to show the "auto-sorted" notice.
export const autoSort = true;

export function* generator(input, opts = {}) {
  const a = [...input].sort((x, y) => x - y);
  const n = a.length;
  const target = opts.target ?? a[Math.floor(n / 2)];
  const c = { comparisons: 0, swaps: 0, arrayAccesses: 0 };
  const step = (type, f) =>
    makeStep(type, { ...f, array: [...a], counters: { ...c } });

  yield step("highlight", {
    indices: Array.from({ length: n }, (_, k) => k),
    codeLine: 2,
    description: `Input auto-sorted ascending for Binary Search. Searching for ${target}.`,
  });

  let lo = 0;
  let hi = n - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    yield step("pointer", {
      indices: [mid],
      pointers: { lo, mid, hi },
      codeLine: 5,
      description: `Window [${lo}, ${hi}] → examine mid = ${mid} (a[${mid}] = ${a[mid]}).`,
    });
    c.comparisons++;
    c.arrayAccesses++;
    yield step("compare", {
      indices: [mid],
      pointers: { lo, mid, hi },
      codeLine: 6,
      description: `Compare a[${mid}] = ${a[mid]} with target ${target}.`,
    });
    if (a[mid] === target) {
      yield step("found", {
        indices: [mid],
        pointers: { lo, mid, hi },
        codeLine: 6,
        description: `Found target ${target} at index ${mid}.`,
      });
      return;
    }
    if (a[mid] < target) {
      lo = mid + 1;
      yield step("pointer", {
        indices: [],
        pointers: { lo, hi },
        codeLine: 7,
        description: `a[${mid}] < ${target} → discard left half; search [${lo}, ${hi}].`,
      });
    } else {
      hi = mid - 1;
      yield step("pointer", {
        indices: [],
        pointers: { lo, hi },
        codeLine: 8,
        description: `a[${mid}] > ${target} → discard right half; search [${lo}, ${hi}].`,
      });
    }
  }

  yield step("not-found", {
    indices: [],
    codeLine: 10,
    description: `Window is empty — target ${target} is not present. Return -1.`,
  });
}
