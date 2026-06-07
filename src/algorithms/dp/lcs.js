import { makeStep } from "../../lib/stepSchema.js";

export const code = `function lcs(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[n][m];
}`;

export function* generator(input, opts = {}) {
  const a = String(opts.a ?? "AGCAT").slice(0, 12);
  const b = String(opts.b ?? "GAC").slice(0, 12);
  const n = a.length;
  const m = b.length;

  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  const c = { cellsFilled: 0, matches: 0 };
  const colLabels = ["∅", ...b.split("")];
  const rowLabels = ["∅", ...a.split("")];
  const step = (type, f) =>
    makeStep(type, {
      ...f,
      table: dp.map((r) => r.slice()),
      extra: { colLabels, rowLabels, kind: "grid", a, b },
      counters: { ...c },
    });

  yield step("highlight", {
    cell: null,
    deps: [],
    codeLine: 1,
    description: `Longest Common Subsequence of "${a}" and "${b}". dp[i][j] = LCS length of prefixes a[0..i), b[0..j).`,
  });
  yield step("highlight", {
    cell: null,
    deps: [],
    codeLine: 3,
    description: `Row 0 and column 0 are zero (empty prefix has no common subsequence).`,
  });

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      c.cellsFilled++;
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        c.matches++;
        yield step("dp-cell", {
          cell: [i, j],
          deps: [[i - 1, j - 1]],
          codeLine: 7,
          description: `Match '${a[i - 1]}' = '${b[j - 1]}' → dp[${i}][${j}] = dp[${i - 1}][${j - 1}] + 1 = ${dp[i][j]}.`,
        });
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        yield step("dp-cell", {
          cell: [i, j],
          deps: [
            [i - 1, j],
            [i, j - 1],
          ],
          codeLine: 9,
          description: `'${a[i - 1]}' ≠ '${b[j - 1]}' → dp[${i}][${j}] = max(dp[${i - 1}][${j}], dp[${i}][${j - 1}]) = ${dp[i][j]}.`,
        });
      }
    }
  }

  // Backtrack to recover one LCS string.
  let i = n;
  let j = m;
  const out = [];
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      out.push(a[i - 1]);
      yield step("found", {
        cell: [i, j],
        deps: [[i - 1, j - 1]],
        codeLine: 7,
        description: `Backtrack: '${a[i - 1]}' is part of the LCS.`,
      });
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  const lcsStr = out.reverse().join("");
  yield step("found", {
    cell: [n, m],
    deps: [],
    codeLine: 13,
    description: `LCS length = ${dp[n][m]}${lcsStr ? `, e.g. "${lcsStr}"` : ""}.`,
  });
}
