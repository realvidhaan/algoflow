// Verifies the AI-builder execution engine: the instrumented runner must
// derive steps from REAL execution so the final frame equals the algorithm's
// true output. This is the regression guard for the "animation looked sorted
// but the data wasn't" bug.

import { runInstrumented, isSorted } from "../api/groq.js";

let pass = 0;
let fail = 0;
const ok = (cond, msg) => {
  if (cond) {
    pass++;
    console.log("  ✓ " + msg);
  } else {
    fail++;
    console.log("  ✗ " + msg);
  }
};

const SAMPLE = [42, 7, 91, 15, 63, 28];

// ---- 1. Correct cocktail shaker sort using the contract API --------------- //
const cocktail = `function sort(arr) {
  let down = 0;
  let up = arr.length - 1;
  let swapped = true;
  while (swapped) {
    swapped = false;
    for (let i = down; i < up; i++) {
      if (arr.compare(i, i + 1) > 0) {
        arr.swap(i, i + 1);
        swapped = true;
      }
    }
    up--;
    for (let i = up; i > down; i--) {
      if (arr.compare(i - 1, i) > 0) {
        arr.swap(i - 1, i);
        swapped = true;
      }
    }
    down++;
  }
  return arr;
}`;

{
  const { steps, final } = runInstrumented(cocktail, SAMPLE);
  ok(isSorted(final), `cocktail (contract API) sorts: ${JSON.stringify(final)}`);
  ok(steps.length > 0, `cocktail produced ${steps.length} steps`);
  ok(
    steps[steps.length - 1].array.join() === [...SAMPLE].sort((a, b) => a - b).join(),
    "cocktail final step.array equals the true sorted array"
  );
  ok(
    steps.every((s) => Array.isArray(s.array) && s.array.length === SAMPLE.length),
    "every step carries a full array snapshot"
  );
  ok(
    steps.some((s) => s.type === "compare") && steps.some((s) => s.type === "swap"),
    "trace contains both compare and swap operations"
  );
}

// ---- 2. The BUGGY backward pass from the screenshot must be caught -------- //
// (Line 13 used `for (let i = up; i > down; i--)` comparing arr[i] < arr[i-1]
//  after `up--`, which leaves the array unsorted.)
const buggy = `function sort(arr) {
  let down = 0;
  let up = arr.length - 1;
  for (let pass = 0; pass < 1; pass++) {
    for (let i = down; i < up; i++) {
      if (arr.compare(i, i + 1) > 0) arr.swap(i, i + 1);
    }
    up--;
  }
  return arr;
}`;
{
  const { final } = runInstrumented(buggy, SAMPLE);
  ok(!isSorted(final), `buggy single-pass detected as NOT sorted: ${JSON.stringify(final)}`);
}

// ---- 3. Idiomatic code using raw arr[i] writes is still captured --------- //
const idiomaticInsertion = `function sort(arr) {
  const n = arr.length;
  for (let i = 1; i < n; i++) {
    let key = arr[i];
    let j = i - 1;
    while (j >= 0 && arr[j] > key) {
      arr[j + 1] = arr[j];
      j--;
    }
    arr[j + 1] = key;
  }
  return arr;
}`;
{
  const { steps, final } = runInstrumented(idiomaticInsertion, SAMPLE);
  ok(isSorted(final), `idiomatic insertion (raw arr[i]=) sorts: ${JSON.stringify(final)}`);
  ok(
    steps.some((s) => s.type === "set"),
    "raw arr[i] = v writes are captured as 'set' steps via the Proxy"
  );
}

// ---- 4. codeLine is mapped into a sane range ------------------------------ //
{
  const { steps } = runInstrumented(cocktail, SAMPLE);
  const lineCount = cocktail.split("\n").length;
  const lined = steps.filter((s) => s.codeLine > 0);
  ok(lined.length > 0, "at least some steps resolved a source line");
  ok(
    lined.every((s) => s.codeLine >= 1 && s.codeLine <= lineCount),
    `all resolved codeLines are within 1..${lineCount}`
  );
}

// ---- 5. Find maximum marks the index as found ----------------------------- //
const findMax = `function sort(arr) {
  let maxIdx = 0;
  for (let i = 1; i < arr.length; i++) {
    if (arr.compare(i, maxIdx) > 0) {
      maxIdx = i;
    }
  }
  arr.found(maxIdx);
  return arr;
}`;
{
  const { steps } = runInstrumented(findMax, SAMPLE);
  const foundSteps = steps.filter((s) => s.type === "found");
  ok(foundSteps.length > 0, "find maximum has at least one 'found' step");
  if (foundSteps.length > 0) {
    const foundIdx = foundSteps[0].indices[0];
    const maxVal = Math.max(...SAMPLE);
    const actualMax = SAMPLE[foundIdx];
    ok(actualMax === maxVal, `found index ${foundIdx} is the actual maximum (${maxVal})`);
  }
}

// ---- 6. Infinite loop is contained ---------------------------------------- //
const infinite = `function sort(arr) { while (true) { arr.compare(0, 1); } return arr; }`;
{
  let threw = false;
  try {
    runInstrumented(infinite, SAMPLE);
  } catch (e) {
    threw = /operation limit/.test(e.message);
  }
  ok(threw, "infinite loop hits the operation-limit backstop");
}

console.log(`\n${fail === 0 ? "ALL AI-ENGINE CHECKS PASSED ✓" : "SOME CHECKS FAILED ✗"}  (${pass} passed, ${fail} failed, total checks: ${pass + fail})`);
process.exit(fail === 0 ? 0 : 1);
