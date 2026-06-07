// Vercel serverless function (also served locally by a Vite middleware).
// Proxies the AI Custom Algorithm Builder to Groq, keeping the API key
// strictly server-side.
//
// ARCHITECTURE (the important part):
// The model is asked to return ONLY executable JavaScript — it does NOT
// hand-write the visualization trace. Instead, we run that code here against
// an instrumented array (a Proxy that records every read, write, swap, and
// comparison). The steps therefore come from REAL execution, which guarantees
// the visualization and the underlying data structure can never disagree: the
// final frame is, by construction, the genuine output of the algorithm.
//
// Accepts POST { description, sampleArray } and returns
// { name, code, steps, timeComplexity, spaceComplexity }.

const SYSTEM_PROMPT = `You are an expert algorithms engineer. The user describes an algorithm in plain
English. You write a correct JavaScript implementation that runs inside an instrumented
visualizer. Your code is EXECUTED for real — so correctness is everything.

Take your time and prioritise correctness, depth, and precision over speed. It is
completely acceptable to reason slowly and carefully. A correct, fully-working algorithm
is infinitely more valuable than a fast but broken one. Double-check your index bounds and
loop conditions before you answer.

Respond with ONLY a single JSON object (no markdown, no prose):
{
  "name": string,            // short human name, e.g. "Cocktail Shaker Sort"
  "timeComplexity": string,  // worst-case time, e.g. "O(n^2)"
  "spaceComplexity": string, // auxiliary space, e.g. "O(1)"
  "code": string             // a JavaScript function named "sort" (use \\n for newlines)
}

THE EXECUTION CONTRACT — your "code" MUST define a function:

    function sort(arr) { ...; return arr; }

"arr" is a special instrumented array. Operate on it ONLY through this API so the
visualizer can animate every operation:

  - arr.length              -> number of elements
  - arr.compare(i, j)       -> returns arr[i] - arr[j]; records a comparison.
                               Use its sign: > 0 means arr[i] > arr[j].
  - arr.swap(i, j)          -> swaps the two elements (records a swap)
  - arr.get(i)              -> reads the value at index i
  - arr.set(i, value)       -> writes value at index i (records a write)
  - arr.markSorted(i)       -> marks index i as locked in its final position
  - arr.found(i)            -> (search algorithms) marks index i as the found target
  - arr.notFound()          -> (search algorithms) signals the target was not found

Hard rules:
  - Define exactly one function named "sort" that takes "arr" and returns it.
  - Use ONLY index-based loops (for / while). Do NOT use "for...of", spread, .map,
    .sort, .push, or destructuring on "arr".
  - To compare two elements ALWAYS use arr.compare(i, j) — never read them into plain
    variables just to compare, or the comparison won't be visualised.
  - To move/exchange elements use arr.swap(i, j) (for exchanges) or arr.set(i, v)
    (for overwrites). Never reorder by reassigning plain variables only.
  - For sorting, the array MUST end fully sorted in ascending order.
  - Keep it to a single self-contained function. No comments referencing line numbers.

Worked example — Bubble Sort using the contract:

function sort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      if (arr.compare(j, j + 1) > 0) {
        arr.swap(j, j + 1);
      }
    }
    arr.markSorted(n - 1 - i);
  }
  arr.markSorted(0);
  return arr;
}

Return strictly valid JSON only.`;

// Remove ```json ... ``` / ``` ... ``` fences if the model adds them anyway.
function stripFences(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/^\s*```[a-zA-Z]*\s*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();
}

export function isSorted(arr) {
  for (let i = 1; i < arr.length; i++) {
    if (Number(arr[i]) < Number(arr[i - 1])) return false;
  }
  return true;
}

function looksLikeSort(desc) {
  return /sort|order|arrange|bubble|insert|select|merge|quick|heap|shell|comb|gnome|cocktail|cycle|strand|tim|radix|bucket|count/i.test(
    desc
  );
}

// ---------------------------------------------------------------------------
// The instrumented runner. Executes model code against a Proxy-wrapped array
// that records a step for every visual operation. Because the steps are a
// byproduct of REAL execution, the final array is the algorithm's true output.
// ---------------------------------------------------------------------------
export function runInstrumented(rawCode, sample) {
  const code = stripFences(rawCode);
  const numLines = code.split("\n").length;

  const state = {
    a: sample.map(Number),
    steps: [],
    counters: { comparisons: 0, swaps: 0, arrayAccesses: 0 },
    sorted: new Set(),
    ops: 0,
  };

  const MAX_OPS = 100000; // infinite-loop backstop
  const guard = () => {
    if (++state.ops > MAX_OPS) {
      throw new Error("operation limit exceeded (likely an infinite loop)");
    }
  };

  // Best-effort source line of the current operation, parsed from the stack of
  // the dynamically-compiled function. `new Function(arg, body)` places body
  // line 1 at script line 3 in V8, so user line = script line - 2.
  const lineOf = () => {
    const stack = new Error().stack || "";
    for (const frame of stack.split("\n")) {
      const m = frame.match(/<anonymous>:(\d+):\d+/);
      if (m) {
        const v = parseInt(m[1], 10) - 2;
        return v >= 1 && v <= numLines ? v : 0;
      }
    }
    return 0;
  };

  const snap = (type, fields) => {
    state.steps.push({
      type,
      codeLine: fields.codeLine ?? 0,
      description: fields.description ?? "",
      ...(fields.indices ? { indices: fields.indices } : {}),
      ...(fields.values ? { values: fields.values } : {}),
      array: [...state.a],
      sorted: [...state.sorted],
      counters: { ...state.counters },
    });
  };

  const api = {
    get length() {
      return state.a.length;
    },
    get(i) {
      guard();
      state.counters.arrayAccesses++;
      return state.a[i];
    },
    compare(i, j) {
      guard();
      state.counters.comparisons++;
      state.counters.arrayAccesses += 2;
      snap("compare", {
        indices: [i, j],
        codeLine: lineOf(),
        description: `Compare positions ${i} and ${j}`,
      });
      return state.a[i] - state.a[j];
    },
    swap(i, j) {
      guard();
      const t = state.a[i];
      state.a[i] = state.a[j];
      state.a[j] = t;
      state.counters.swaps++;
      state.counters.arrayAccesses += 2;
      snap("swap", {
        indices: [i, j],
        codeLine: lineOf(),
        description: `Swap positions ${i} and ${j}`,
      });
    },
    set(i, v) {
      guard();
      state.a[i] = v;
      state.counters.arrayAccesses++;
      snap("set", {
        indices: [i],
        values: [v],
        codeLine: lineOf(),
        description: `Set position ${i} to ${v}`,
      });
    },
    highlight(...idx) {
      guard();
      snap("highlight", {
        indices: idx,
        codeLine: lineOf(),
        description: `Examine position ${idx.join(", ")}`,
      });
    },
    markSorted(i) {
      guard();
      state.sorted.add(i);
      snap("mark-sorted", {
        indices: [i],
        codeLine: lineOf(),
        description: `Lock position ${i}`,
      });
    },
    found(i) {
      guard();
      state.sorted.add(i);
      snap("found", {
        indices: [i],
        codeLine: lineOf(),
        description: `Found target at position ${i}`,
      });
    },
    notFound() {
      guard();
      snap("not-found", {
        indices: [],
        codeLine: lineOf(),
        description: `Target not found`,
      });
    },
    [Symbol.iterator]() {
      return state.a[Symbol.iterator]();
    },
  };

  // Proxy so even idiomatic arr[i] reads / arr[i] = v writes are captured,
  // guaranteeing the data array stays in lock-step with the visualization.
  const proxy = new Proxy(api, {
    get(target, prop, recv) {
      if (typeof prop === "string" && /^\d+$/.test(prop)) {
        guard();
        state.counters.arrayAccesses++;
        return state.a[+prop];
      }
      return Reflect.get(target, prop, recv);
    },
    set(target, prop, value) {
      if (typeof prop === "string" && /^\d+$/.test(prop)) {
        guard();
        state.a[+prop] = value;
        state.counters.arrayAccesses++;
        snap("set", {
          indices: [+prop],
          values: [value],
          codeLine: lineOf(),
          description: `Set position ${prop} to ${value}`,
        });
        return true;
      }
      return Reflect.set(target, prop, value);
    },
  });

  // eslint-disable-next-line no-new-func
  const runner = new Function(
    "arr",
    code + '\nreturn (typeof sort === "function") ? sort(arr) : undefined;'
  );
  const returned = runner(proxy);
  if (returned === undefined) {
    throw new Error('code did not define a function named "sort"');
  }

  return { code, steps: state.steps, final: [...state.a] };
}

// ---------------------------------------------------------------------------
// A single Groq round-trip + local execution. Returns a normalized result or
// throws with a descriptive message.
// ---------------------------------------------------------------------------
async function attempt(apiKey, messages, sample) {
  const groqRes = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        max_tokens: 2048,
        response_format: { type: "json_object" },
        messages,
      }),
    }
  );

  if (!groqRes.ok) {
    const text = await groqRes.text();
    const err = new Error(`Groq API error (HTTP ${groqRes.status}).`);
    err.httpStatus = groqRes.status;
    err.detail = text.slice(0, 600);
    throw err;
  }

  const data = await groqRes.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned an empty completion.");

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    const err = new Error("Groq returned content that was not valid JSON.");
    err.raw = content;
    throw err;
  }

  if (!parsed || typeof parsed.code !== "string" || !parsed.code.trim()) {
    const err = new Error("Model response did not include a 'code' string.");
    err.raw = content;
    throw err;
  }

  // Execute for real — this is where correctness is enforced.
  const exec = runInstrumented(parsed.code, sample);

  return {
    rawContent: content,
    name: (parsed.name && String(parsed.name)) || "Custom Algorithm",
    timeComplexity: parsed.timeComplexity ? String(parsed.timeComplexity) : "",
    spaceComplexity: parsed.spaceComplexity
      ? String(parsed.spaceComplexity)
      : "",
    code: exec.code,
    steps: exec.steps,
    final: exec.final,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "GROQ_API_KEY is not configured on the server." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const { description, sampleArray } = body || {};

  if (!description || typeof description !== "string") {
    return res
      .status(400)
      .json({ error: "Missing 'description' string in request body." });
  }

  const sample =
    Array.isArray(sampleArray) && sampleArray.length
      ? sampleArray.map(Number).filter(Number.isFinite)
      : [5, 3, 8, 1, 9, 2, 7];

  const userMessage = `Sample array: [${sample.join(", ")}]
Algorithm description: ${description}

Write the "sort" function for this algorithm following the execution contract exactly.`;

  const baseMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  const wantSorted = looksLikeSort(description);

  // ---- First attempt ---------------------------------------------------- //
  let first;
  try {
    first = await attempt(apiKey, baseMessages, sample);
  } catch (err) {
    if (err.httpStatus) {
      const status = err.httpStatus === 429 ? 429 : err.httpStatus;
      return res
        .status(status)
        .json({ error: err.message, detail: err.detail });
    }
    // Execution / parse failure on the first try → fall through to a retry
    // that feeds the failure back to the model.
    first = { error: err.message, rawContent: err.raw || "" };
  }

  const firstIsGood =
    first &&
    !first.error &&
    Array.isArray(first.steps) &&
    first.steps.length > 0 &&
    (!wantSorted || isSorted(first.final));

  let chosen = firstIsGood ? first : null;

  // ---- Correction retry ------------------------------------------------- //
  if (!chosen) {
    let feedback;
    if (first.error) {
      feedback = `Your previous code failed to execute: ${first.error}.
Re-read the execution contract and return corrected JSON. Make sure you define
function sort(arr) and use arr.compare / arr.swap / arr.set / arr.markSorted.`;
    } else {
      feedback = `Your previous code ran but produced an INCORRECT result.
Starting from [${sample.join(", ")}], your function returned [${first.final.join(
        ", "
      )}], which is not correctly sorted in ascending order.
Carefully re-check your loop bounds and comparison/swap logic (a common bug is an
off-by-one in a reverse pass) and return corrected JSON that sorts the array fully.`;
    }

    const retryMessages = [
      ...baseMessages,
      {
        role: "assistant",
        content: first.rawContent || "(previous response omitted)",
      },
      { role: "user", content: feedback },
    ];

    try {
      const second = await attempt(apiKey, retryMessages, sample);
      const secondIsGood =
        Array.isArray(second.steps) &&
        second.steps.length > 0 &&
        (!wantSorted || isSorted(second.final));
      // Prefer the retry if it's good, otherwise prefer whichever actually ran.
      chosen = secondIsGood ? second : second.steps?.length ? second : first;
    } catch (err) {
      if (first.error) {
        // Both attempts failed to run.
        return res.status(502).json({
          error: `The generated code could not be executed. ${err.message}`,
          raw: first.rawContent || err.raw || "",
        });
      }
      chosen = first; // keep the first (ran, just imperfect)
    }
  }

  if (!chosen || !Array.isArray(chosen.steps) || chosen.steps.length === 0) {
    return res.status(502).json({
      error: "The model did not produce a runnable algorithm.",
      raw: (chosen && chosen.rawContent) || (first && first.rawContent) || "",
    });
  }

  // ---- Clean final frame ------------------------------------------------ //
  // Guarantee the last frame shows the completed state (all green when sorted)
  // without any clutter description — the legend already conveys the state.
  const steps = chosen.steps;
  const completed = !wantSorted || isSorted(chosen.final);
  if (completed) {
    const allIdx = chosen.final.map((_, i) => i);
    steps.push({
      type: "mark-sorted",
      codeLine: 0,
      description: "",
      indices: allIdx,
      array: [...chosen.final],
      sorted: allIdx,
      counters: steps[steps.length - 1].counters,
    });
  }

  return res.status(200).json({
    name: chosen.name,
    code: chosen.code,
    steps,
    timeComplexity: chosen.timeComplexity,
    spaceComplexity: chosen.spaceComplexity,
  });
}
