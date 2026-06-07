// Vercel serverless function (also served locally by a Vite middleware).
// Proxies the AI Custom Algorithm Builder to Groq, keeping the API key
// strictly server-side. Accepts POST { description, sampleArray } and returns
// the model's parsed JSON: { name, timeComplexity, spaceComplexity, code, steps }.

const SYSTEM_PROMPT = `You are a precise algorithm tracer for a step-by-step array visualizer.

Your job: mentally execute the described algorithm on the provided sample array and emit a
complete, faithful execution trace. CORRECTNESS IS YOUR TOP PRIORITY — take as much time
as you need to reason carefully through each step. A thorough, accurate trace is far
more valuable than a fast but wrong one. Do not rush.

Respond with ONLY a single JSON object (no markdown, no prose):
{
  "name": string,             // short human name for the algorithm
  "timeComplexity": string,   // worst-case time complexity, e.g. "O(n^2)"
  "spaceComplexity": string,  // auxiliary space complexity, e.g. "O(1)"
  "code": string,             // clean JavaScript implementation (use \\n for newlines)
  "steps": [ Step, ... ]      // the full, correct execution trace on the sample array
}

A Step is:
{
  "type": one of "compare" | "swap" | "set" | "highlight" | "mark-sorted" | "pointer" | "found" | "not-found",
  "indices": number[],        // 0-based array indices this step touches
  "values": any[],            // for "set": the new value(s) written at those indices
  "pointers": { [label]: number }, // optional named index labels (e.g. { "i": 2, "j": 4 })
  "codeLine": number,         // 1-based line number in "code" that this step corresponds to
  "description": string,      // one short sentence explaining this step
  "counters": { "comparisons"?: number, "swaps"?: number, "arrayAccesses"?: number }
}

Rules:
- Use ONLY the step types listed above. Never use graph, tree, or DP types.
- "swap" MUST list exactly two indices. The engine will physically exchange those elements.
- "set" MUST list the index in "indices" and the replacement value in "values".
- "compare" lists the two indices being compared.
- "mark-sorted" marks elements that have permanently reached their final position.
- "found" / "not-found" are for search algorithms only.
- codeLine must be a valid 1-based line number within your "code" string.
- "counters" must carry running cumulative totals (not per-step deltas).
- CRITICAL CORRECTNESS CHECK: Before finalising your response, mentally simulate applying
  every "swap" and "set" operation in your steps array to the sample array in order.
  The resulting array MUST equal the correct output of the algorithm. For sorting algorithms,
  the final array must be fully sorted in ascending order. If it is not, fix your steps
  before responding — do not emit an incorrect trace.
- Trace EVERY comparison, swap, and assignment — omitting steps causes the visualizer to
  show incorrect intermediate states.
- At most 120 steps total.

Return strictly valid JSON only — no markdown fences, no explanatory text.`;

// ---------------------------------------------------------------------------
// Server-side correctness verification helpers
// ---------------------------------------------------------------------------

/** Replay swap/set steps and return the resulting array. */
function replaySteps(steps, sampleArray) {
  const a = [...sampleArray];
  for (const step of steps) {
    const idx = Array.isArray(step.indices) ? step.indices : [];
    if (step.type === "swap" && idx.length >= 2) {
      const [i, j] = idx;
      if (i >= 0 && i < a.length && j >= 0 && j < a.length) {
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
      }
    } else if (step.type === "set" && idx.length >= 1) {
      const i = idx[0];
      const v =
        Array.isArray(step.values) && step.values.length
          ? step.values[0]
          : undefined;
      if (i >= 0 && i < a.length && v !== undefined) a[i] = Number(v);
    }
  }
  return a;
}

/** Return true if arr is sorted ascending. */
function isSorted(arr) {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < arr[i - 1]) return false;
  }
  return true;
}

/** True if the description sounds like a sorting algorithm. */
function looksLikeSort(desc) {
  return /sort|order|arrange|bubble|insert|select|merge|quick|heap|shell|comb|gnome|cocktail|cycle|strand|tim/i.test(
    desc
  );
}

// ---------------------------------------------------------------------------
// Core fetch helper (single attempt)
// ---------------------------------------------------------------------------
async function callGroq(apiKey, messages) {
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages,
    }),
  });
  return resp;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
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

Trace this algorithm on exactly the sample array above and return the JSON object.`;

  // ---- First attempt ---------------------------------------------------- //
  let groqRes;
  try {
    groqRes = await callGroq(apiKey, [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ]);
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Server error while contacting Groq: " + (err && err.message) });
  }

  if (!groqRes.ok) {
    const text = await groqRes.text();
    const status = groqRes.status === 429 ? 429 : groqRes.status;
    return res.status(status).json({
      error: `Groq API error (HTTP ${groqRes.status}).`,
      detail: text.slice(0, 600),
    });
  }

  const data = await groqRes.json();
  const content =
    data?.choices?.[0]?.message?.content;

  if (!content) {
    return res.status(502).json({ error: "Groq returned an empty completion." });
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return res
      .status(502)
      .json({ error: "Groq returned content that was not valid JSON.", raw: content });
  }

  // ---- Server-side correctness verification + one retry ----------------- //
  const steps = Array.isArray(parsed.steps) ? parsed.steps : [];
  const needsSortCheck = looksLikeSort(description);

  if (needsSortCheck && steps.length > 0) {
    const result = replaySteps(steps, sample);
    if (!isSorted(result)) {
      // Build a correction prompt with the exact wrong output so the model
      // can see what it produced and fix it.
      const wrongOutput = `[${result.join(", ")}]`;
      const correctionMessage = `Your previous trace was incorrect.
When I applied your swap/set operations to [${sample.join(", ")}] in order, the final
array was ${wrongOutput}, which is NOT sorted in ascending order.

Please re-trace the algorithm very carefully — walk through every pass and every
comparison, and emit the correct, complete swap sequence so the array ends up fully
sorted. Return only the corrected JSON object.`;

      let retryRes;
      try {
        retryRes = await callGroq(apiKey, [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
          { role: "assistant", content: content },
          { role: "user", content: correctionMessage },
        ]);
      } catch {
        // If the retry call itself fails, fall through and return the first result.
        retryRes = null;
      }

      if (retryRes && retryRes.ok) {
        const retryData = await retryRes.json();
        const retryContent = retryData?.choices?.[0]?.message?.content;
        if (retryContent) {
          try {
            const retryParsed = JSON.parse(retryContent);
            // Accept the retry result regardless (we gave it a second chance).
            return res.status(200).json(retryParsed);
          } catch {
            // Retry returned invalid JSON — fall through to the original.
          }
        }
      }
    }
  }

  return res.status(200).json(parsed);
}
