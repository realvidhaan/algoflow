import { makeStep } from "../../lib/stepSchema.js";

export const code = `function knapsack(w, v, W) {
  const n = w.length;
  const dp = Array.from({ length: n + 1 }, () => Array(W + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let c = 0; c <= W; c++) {
      dp[i][c] = dp[i - 1][c];
      if (w[i - 1] <= c) {
        dp[i][c] = Math.max(
          dp[i][c],
          dp[i - 1][c - w[i - 1]] + v[i - 1]
        );
      }
    }
  }
  return dp[n][W];
}`;

export function* generator(input, opts = {}) {
  const w = (opts.weights && opts.weights.length ? opts.weights : [2, 3, 4, 5]).slice(0, 8);
  const v = (opts.values && opts.values.length ? opts.values : [3, 4, 5, 6]).slice(0, 8);
  const n = Math.min(w.length, v.length);
  const W = Math.max(0, Math.min(15, Math.floor(opts.capacity ?? 8)));

  const dp = Array.from({ length: n + 1 }, () => Array(W + 1).fill(0));
  const c = { cellsFilled: 0, comparisons: 0 };
  const colLabels = Array.from({ length: W + 1 }, (_, i) => String(i));
  const rowLabels = ["∅", ...Array.from({ length: n }, (_, i) => `i${i + 1} w${w[i]} v${v[i]}`)];
  const step = (type, f) =>
    makeStep(type, {
      ...f,
      table: dp.map((r) => r.slice()),
      extra: { colLabels, rowLabels, kind: "grid", weights: w, values: v, capacity: W },
      counters: { ...c },
    });

  yield step("highlight", {
    cell: null,
    deps: [],
    codeLine: 1,
    description: `0/1 Knapsack — capacity ${W}, ${n} items. dp[i][c] = best value using first i items within capacity c.`,
  });
  yield step("highlight", {
    cell: null,
    deps: [],
    codeLine: 3,
    description: `Row 0 (no items) and column 0 (capacity 0) are all zero.`,
  });

  for (let i = 1; i <= n; i++) {
    for (let cap = 0; cap <= W; cap++) {
      dp[i][cap] = dp[i - 1][cap];
      c.cellsFilled++;
      const fits = w[i - 1] <= cap;
      const deps = [[i - 1, cap]];
      let desc = `Skip item ${i}: dp[${i}][${cap}] = dp[${i - 1}][${cap}] = ${dp[i - 1][cap]}.`;
      if (fits) {
        c.comparisons++;
        const take = dp[i - 1][cap - w[i - 1]] + v[i - 1];
        deps.push([i - 1, cap - w[i - 1]]);
        if (take > dp[i][cap]) {
          dp[i][cap] = take;
          desc = `Take item ${i} (w${w[i - 1]}, v${v[i - 1]}): dp[${i - 1}][${cap - w[i - 1]}] + ${v[i - 1]} = ${take} > skip ${dp[i - 1][cap]}.`;
        } else {
          desc = `Item ${i} fits but skipping is better: keep ${dp[i][cap]} (take would give ${take}).`;
        }
      }
      yield step("dp-cell", {
        cell: [i, cap],
        deps,
        codeLine: fits ? 8 : 6,
        description: desc,
      });
    }
  }

  // Backtrack to recover chosen items.
  const chosen = [];
  let cap = W;
  for (let i = n; i >= 1; i--) {
    if (dp[i][cap] !== dp[i - 1][cap]) {
      chosen.push(i);
      yield step("found", {
        cell: [i, cap],
        deps: [[i - 1, cap - w[i - 1]]],
        codeLine: 8,
        description: `Backtrack: item ${i} was taken (dp[${i}][${cap}] ≠ dp[${i - 1}][${cap}]).`,
      });
      cap -= w[i - 1];
    }
  }

  yield step("found", {
    cell: [n, W],
    deps: [],
    codeLine: 15,
    description: `Best value = ${dp[n][W]} using items {${chosen.reverse().join(", ") || "none"}}.`,
  });
}
