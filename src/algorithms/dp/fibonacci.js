import { makeStep } from "../../lib/stepSchema.js";

export const code = `function fib(n, memo = {}) {
  if (n <= 1) return n;
  if (memo[n] !== undefined) return memo[n];
  memo[n] = fib(n - 1, memo) + fib(n - 2, memo);
  return memo[n];
}`;

export function* generator(input, opts = {}) {
  let n = opts.n ?? (Array.isArray(input) ? input.length : input) ?? 10;
  n = Math.max(1, Math.min(22, Math.floor(n)));

  const memo = {};
  const row = new Array(n + 1).fill(null);
  const c = { calls: 0, cacheHits: 0, additions: 0 };
  const colLabels = Array.from({ length: n + 1 }, (_, i) => `F(${i})`);
  const step = (type, f) =>
    makeStep(type, {
      ...f,
      table: [row.slice()],
      extra: { colLabels, rowLabels: ["value"], kind: "fib", n },
      counters: { ...c },
    });

  yield step("highlight", {
    cell: null,
    deps: [],
    codeLine: 1,
    description: `Memoized Fibonacci for n = ${n}. Each F(k) is computed once and cached.`,
  });

  function* fib(k) {
    c.calls++;
    if (k <= 1) {
      memo[k] = k;
      row[k] = k;
      yield step("dp-cell", {
        cell: [0, k],
        deps: [],
        codeLine: 2,
        description: `Base case: F(${k}) = ${k}.`,
      });
      return k;
    }
    if (memo[k] !== undefined) {
      c.cacheHits++;
      yield step("dp-cell", {
        cell: [0, k],
        deps: [],
        codeLine: 3,
        description: `F(${k}) already memoized = ${memo[k]} — reuse it.`,
      });
      return memo[k];
    }
    const a = yield* fib(k - 1);
    const b = yield* fib(k - 2);
    memo[k] = a + b;
    row[k] = memo[k];
    c.additions++;
    yield step("dp-cell", {
      cell: [0, k],
      deps: [
        [0, k - 1],
        [0, k - 2],
      ],
      codeLine: 4,
      description: `F(${k}) = F(${k - 1}) + F(${k - 2}) = ${a} + ${b} = ${memo[k]}.`,
    });
    return memo[k];
  }

  const result = yield* fib(n);

  yield step("found", {
    cell: [0, n],
    deps: [],
    codeLine: 5,
    description: `Result: F(${n}) = ${result}.`,
  });
}
