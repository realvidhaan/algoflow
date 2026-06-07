import { makeStep } from "../../lib/stepSchema.js";

export const code = `function insertionSort(a) {
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;
    while (j >= 0 && a[j] > key) {
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = key;
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
    description: `Insertion Sort on ${n} elements. Grow a sorted prefix one element at a time.`,
  });
  if (n > 0) sorted.add(0);
  yield step("mark-sorted", {
    indices: [0],
    codeLine: 2,
    description: `a[0] forms the initial sorted prefix.`,
  });

  for (let i = 1; i < n; i++) {
    const key = a[i];
    c.arrayAccesses++;
    let j = i - 1;
    yield step("pointer", {
      indices: [i],
      pointers: { i, j },
      codeLine: 3,
      description: `Pick up key = a[${i}] = ${key}; insert it into the sorted prefix.`,
    });

    while (j >= 0) {
      c.comparisons++;
      c.arrayAccesses++;
      yield step("compare", {
        indices: [j],
        pointers: { i, j },
        codeLine: 5,
        description: `Compare a[${j}] = ${a[j]} with key ${key}.`,
      });
      if (a[j] > key) {
        a[j + 1] = a[j];
        c.arrayAccesses += 2;
        c.swaps++;
        yield step("set", {
          indices: [j + 1],
          pointers: { i, j },
          codeLine: 6,
          description: `${a[j]} > ${key} → shift a[${j}] right into a[${j + 1}].`,
        });
        j--;
      } else {
        break;
      }
    }

    a[j + 1] = key;
    c.arrayAccesses++;
    for (let k = 0; k <= i; k++) sorted.add(k);
    yield step("set", {
      indices: [j + 1],
      pointers: { i, j },
      codeLine: 9,
      description: `Place key ${key} at a[${j + 1}]. Sorted prefix is now length ${i + 1}.`,
    });
  }

  for (let k = 0; k < n; k++) sorted.add(k);
  yield step("mark-sorted", {
    indices: Array.from({ length: n }, (_, k) => k),
    codeLine: 12,
    description: `Done — array is fully sorted.`,
  });
}
