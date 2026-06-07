import { makeStep } from "../../lib/stepSchema.js";

export const code = `function quickSort(a, lo = 0, hi = a.length - 1) {
  if (lo >= hi) return;
  const pivot = a[hi];
  let i = lo;
  for (let j = lo; j < hi; j++) {
    if (a[j] < pivot) {
      swap(a, i, j);
      i++;
    }
  }
  swap(a, i, hi);
  quickSort(a, lo, i - 1);
  quickSort(a, i + 1, hi);
}`;

export function* generator(input) {
  const a = [...input];
  const n = a.length;
  const c = { comparisons: 0, swaps: 0, arrayAccesses: 0 };
  const sorted = new Set();
  const step = (type, f) =>
    makeStep(type, { ...f, array: [...a], sorted: [...sorted], counters: { ...c } });
  const range = (lo, hi) =>
    lo > hi ? [] : Array.from({ length: hi - lo + 1 }, (_, k) => lo + k);

  function* qs(lo, hi) {
    if (lo >= hi) {
      if (lo === hi) {
        sorted.add(lo);
        yield step("mark-sorted", {
          indices: [lo],
          codeLine: 2,
          description: `Subarray [${lo}, ${hi}] has one element — a[${lo}] = ${a[lo]} is in place.`,
        });
      }
      return;
    }
    const pivot = a[hi];
    c.arrayAccesses++;
    yield step("pointer", {
      indices: [hi],
      pivot: hi,
      pointers: { lo, hi },
      codeLine: 3,
      description: `Partition [${lo}, ${hi}]: choose pivot = a[${hi}] = ${pivot}.`,
    });
    let i = lo;
    for (let j = lo; j < hi; j++) {
      c.comparisons++;
      c.arrayAccesses += 2;
      yield step("compare", {
        indices: [j],
        pivot: hi,
        pointers: { i, j, lo, hi },
        codeLine: 6,
        description: `Compare a[${j}] = ${a[j]} with pivot ${pivot}.`,
      });
      if (a[j] < pivot) {
        const x = a[i];
        const y = a[j];
        [a[i], a[j]] = [a[j], a[i]];
        c.swaps++;
        c.arrayAccesses += 2;
        yield step("swap", {
          indices: [i, j],
          pivot: hi,
          pointers: { i, j, lo, hi },
          codeLine: 7,
          description:
            i === j
              ? `${y} < ${pivot} → a[${i}] already in the "less" region; advance i.`
              : `${y} < ${pivot} → swap a[${i}] = ${x} and a[${j}] = ${y}; grow "less" region.`,
        });
        i++;
      }
    }
    const px = a[i];
    [a[i], a[hi]] = [a[hi], a[i]];
    c.swaps++;
    c.arrayAccesses += 2;
    yield step("swap", {
      indices: [i, hi],
      pivot: i,
      pointers: { i, lo, hi },
      codeLine: 11,
      description: `Place pivot ${pivot} at a[${i}] (swap with a[${hi}] = ${px}).`,
    });
    sorted.add(i);
    yield step("mark-sorted", {
      indices: [i],
      codeLine: 11,
      description: `Pivot a[${i}] = ${pivot} is now in its final sorted position.`,
    });

    if (lo <= i - 1) {
      yield step("highlight", {
        indices: range(lo, i - 1),
        pointers: { lo, hi: i - 1 },
        codeLine: 12,
        description: `Recurse on the left subarray [${lo}, ${i - 1}].`,
      });
    }
    yield* qs(lo, i - 1);
    if (i + 1 <= hi) {
      yield step("highlight", {
        indices: range(i + 1, hi),
        pointers: { lo: i + 1, hi },
        codeLine: 13,
        description: `Recurse on the right subarray [${i + 1}, ${hi}].`,
      });
    }
    yield* qs(i + 1, hi);
  }

  yield step("highlight", {
    indices: [],
    codeLine: 1,
    description: `Quicksort (Lomuto partition) on ${n} elements.`,
  });
  yield* qs(0, n - 1);

  for (let k = 0; k < n; k++) sorted.add(k);
  yield step("mark-sorted", {
    indices: Array.from({ length: n }, (_, k) => k),
    codeLine: 14,
    description: `Done — array is fully sorted.`,
  });
}
