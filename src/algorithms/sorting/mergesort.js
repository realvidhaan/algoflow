import { makeStep } from "../../lib/stepSchema.js";

export const code = `function mergeSort(a, lo = 0, hi = a.length - 1) {
  if (lo >= hi) return;
  const mid = (lo + hi) >> 1;
  mergeSort(a, lo, mid);
  mergeSort(a, mid + 1, hi);
  merge(a, lo, mid, hi);
}

function merge(a, lo, mid, hi) {
  const left = a.slice(lo, mid + 1);
  const right = a.slice(mid + 1, hi + 1);
  let i = 0, j = 0, k = lo;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) {
      a[k++] = left[i++];
    } else {
      a[k++] = right[j++];
    }
  }
  while (i < left.length) a[k++] = left[i++];
  while (j < right.length) a[k++] = right[j++];
}`;

export function* generator(input) {
  const a = [...input];
  const n = a.length;
  const c = { comparisons: 0, swaps: 0, arrayAccesses: 0 };
  const sorted = new Set();
  const step = (type, f) =>
    makeStep(type, { ...f, array: [...a], sorted: [...sorted], counters: { ...c } });
  const range = (lo, hi) =>
    lo > hi ? [] : Array.from({ length: hi - lo + 1 }, (_, p) => lo + p);

  function* merge(lo, mid, hi) {
    const left = a.slice(lo, mid + 1);
    const right = a.slice(mid + 1, hi + 1);
    c.arrayAccesses += left.length + right.length;
    let i = 0,
      j = 0,
      k = lo;
    yield step("highlight", {
      indices: range(lo, hi),
      pointers: { lo, mid, hi },
      codeLine: 10,
      description: `Merge sorted runs [${lo}, ${mid}] and [${mid + 1}, ${hi}].`,
    });
    while (i < left.length && j < right.length) {
      c.comparisons++;
      c.arrayAccesses += 2;
      yield step("compare", {
        indices: [k],
        pointers: { k },
        codeLine: 14,
        description: `Compare left run ${left[i]} vs right run ${right[j]} → smaller goes to a[${k}].`,
      });
      if (left[i] <= right[j]) {
        a[k] = left[i];
        c.arrayAccesses++;
        yield step("set", {
          indices: [k],
          pointers: { k },
          codeLine: 15,
          description: `Write ${left[i]} (from left run) into a[${k}].`,
        });
        i++;
        k++;
      } else {
        a[k] = right[j];
        c.arrayAccesses++;
        yield step("set", {
          indices: [k],
          pointers: { k },
          codeLine: 17,
          description: `Write ${right[j]} (from right run) into a[${k}].`,
        });
        j++;
        k++;
      }
    }
    while (i < left.length) {
      a[k] = left[i];
      c.arrayAccesses++;
      yield step("set", {
        indices: [k],
        pointers: { k },
        codeLine: 20,
        description: `Copy remaining left value ${left[i]} into a[${k}].`,
      });
      i++;
      k++;
    }
    while (j < right.length) {
      a[k] = right[j];
      c.arrayAccesses++;
      yield step("set", {
        indices: [k],
        pointers: { k },
        codeLine: 21,
        description: `Copy remaining right value ${right[j]} into a[${k}].`,
      });
      j++;
      k++;
    }
  }

  function* ms(lo, hi) {
    if (lo >= hi) return;
    const mid = (lo + hi) >> 1;
    yield step("highlight", {
      indices: range(lo, hi),
      pointers: { lo, mid, hi },
      codeLine: 3,
      description: `Split [${lo}, ${hi}] at mid = ${mid}.`,
    });
    yield* ms(lo, mid);
    yield* ms(mid + 1, hi);
    yield* merge(lo, mid, hi);
  }

  yield step("highlight", {
    indices: [],
    codeLine: 1,
    description: `Merge Sort on ${n} elements. Recursively split, then merge sorted runs.`,
  });
  yield* ms(0, n - 1);

  for (let p = 0; p < n; p++) sorted.add(p);
  yield step("mark-sorted", {
    indices: Array.from({ length: n }, (_, p) => p),
    codeLine: 6,
    description: `Done — array is fully sorted.`,
  });
}
