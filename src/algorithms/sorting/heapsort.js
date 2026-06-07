import { makeStep } from "../../lib/stepSchema.js";

export const code = `function heapSort(a) {
  const n = a.length;
  for (let i = (n >> 1) - 1; i >= 0; i--) {
    heapify(a, n, i);
  }
  for (let end = n - 1; end > 0; end--) {
    swap(a, 0, end);
    heapify(a, end, 0);
  }
  return a;
}

function heapify(a, n, i) {
  let largest = i;
  const l = 2 * i + 1, r = 2 * i + 2;
  if (l < n && a[l] > a[largest]) largest = l;
  if (r < n && a[r] > a[largest]) largest = r;
  if (largest !== i) {
    swap(a, i, largest);
    heapify(a, n, largest);
  }
}`;

export function* generator(input) {
  const a = [...input];
  const n = a.length;
  const c = { comparisons: 0, swaps: 0, arrayAccesses: 0 };
  const sorted = new Set();
  const step = (type, f) =>
    makeStep(type, { ...f, array: [...a], sorted: [...sorted], counters: { ...c } });

  function* heapify(size, i) {
    let largest = i;
    const l = 2 * i + 1;
    const r = 2 * i + 2;
    if (l < size) {
      c.comparisons++;
      c.arrayAccesses += 2;
      yield step("compare", {
        indices: [l, largest],
        pointers: { i, l },
        codeLine: 16,
        description: `Compare left child a[${l}] = ${a[l]} with a[${largest}] = ${a[largest]}.`,
      });
      if (a[l] > a[largest]) largest = l;
    }
    if (r < size) {
      c.comparisons++;
      c.arrayAccesses += 2;
      yield step("compare", {
        indices: [r, largest],
        pointers: { i, r },
        codeLine: 17,
        description: `Compare right child a[${r}] = ${a[r]} with a[${largest}] = ${a[largest]}.`,
      });
      if (a[r] > a[largest]) largest = r;
    }
    if (largest !== i) {
      const x = a[i];
      const y = a[largest];
      [a[i], a[largest]] = [a[largest], a[i]];
      c.swaps++;
      c.arrayAccesses += 2;
      yield step("swap", {
        indices: [i, largest],
        pointers: { i, largest },
        codeLine: 19,
        description: `a[${largest}] = ${y} > a[${i}] = ${x} → swap and sift down.`,
      });
      yield* heapify(size, largest);
    }
  }

  yield step("highlight", {
    indices: [],
    codeLine: 1,
    description: `Heap Sort on ${n} elements. Build a max-heap, then extract the max repeatedly.`,
  });

  yield step("highlight", {
    indices: Array.from({ length: n }, (_, k) => k),
    codeLine: 3,
    description: `Phase 1 — build a max-heap from the bottom up.`,
  });
  for (let i = (n >> 1) - 1; i >= 0; i--) {
    yield* heapify(n, i);
  }

  yield step("highlight", {
    indices: Array.from({ length: n }, (_, k) => k),
    codeLine: 6,
    description: `Phase 2 — swap the root (max) to the end and re-heapify the rest.`,
  });
  for (let end = n - 1; end > 0; end--) {
    const x = a[0];
    const y = a[end];
    [a[0], a[end]] = [a[end], a[0]];
    c.swaps++;
    c.arrayAccesses += 2;
    yield step("swap", {
      indices: [0, end],
      pointers: { end },
      codeLine: 7,
      description: `Move current max a[0] = ${x} to a[${end}] (swap with ${y}).`,
    });
    sorted.add(end);
    yield step("mark-sorted", {
      indices: [end],
      codeLine: 7,
      description: `a[${end}] = ${x} is now in its final sorted position.`,
    });
    yield* heapify(end, 0);
  }

  for (let k = 0; k < n; k++) sorted.add(k);
  yield step("mark-sorted", {
    indices: Array.from({ length: n }, (_, k) => k),
    codeLine: 11,
    description: `Done — array is fully sorted.`,
  });
}
