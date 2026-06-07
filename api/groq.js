// Vercel serverless function (also served locally by a Vite middleware).
// Proxies the AI Custom Algorithm Builder to Groq, keeping the API key
// strictly server-side. Accepts POST { description, sampleArray } and returns
// the model's parsed JSON: { name, code, steps }.

const SYSTEM_PROMPT = `You are an algorithm tracer for a step-by-step array visualizer.
The user describes an algorithm in plain English and gives a sample array.
You must mentally execute that algorithm on the EXACT sample array and emit a
trace.

Respond with ONLY a single JSON object (no markdown, no prose) of this shape:
{
  "name": string,            // short human name for the algorithm
  "code": string,            // readable JavaScript implementation (use \\n for newlines)
  "steps": [ Step, ... ]     // the execution trace on the provided sample array
}

A Step is:
{
  "type": one of "compare" | "swap" | "set" | "highlight" | "mark-sorted" | "pointer" | "found" | "not-found",
  "indices": number[],       // array indices this step touches (0-based)
  "values": any[],           // for "set": the new value(s) written at indices
  "pointers": { [label]: number }, // optional named index pointers (e.g. { "i": 0, "j": 3 })
  "codeLine": number,        // 1-based line number in "code" this step corresponds to
  "description": string,     // one short sentence explaining the step
  "counters": { "comparisons"?: number, "swaps"?: number, "arrayAccesses"?: number } // running totals
}

Rules:
- Use ONLY the array-based step types listed above. Never use graph/tree/dp types.
- "swap" MUST list exactly two indices being exchanged.
- "set" MUST list the index in "indices" and the new value in "values".
- "compare" lists the indices being compared.
- Use "mark-sorted" when an element reaches its final position; "found"/"not-found" for searches.
- codeLine must be a valid 1-based line number of your "code" string and should
  point at the line that performs the operation.
- "counters" should carry running cumulative totals so the UI can show live stats.
- Keep the trace faithful and correct: applying the swaps/sets in order to the
  sample array must yield the algorithm's true result.
- Keep it reasonably small: at most ~120 steps.
Return strictly valid JSON.`;

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
    return res.status(400).json({ error: "Missing 'description' string in request body." });
  }

  const sample =
    Array.isArray(sampleArray) && sampleArray.length
      ? sampleArray.map(Number).filter(Number.isFinite)
      : [5, 3, 8, 1, 9, 2, 7];

  const userMessage = `Sample array: [${sample.join(", ")}]
Algorithm description: ${description}

Trace this algorithm on exactly the sample array above and return the JSON object.`;

  try {
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
          temperature: 0.2,
          max_tokens: 2000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
        }),
      }
    );

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
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content;

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

    return res.status(200).json(parsed);
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Server error while contacting Groq: " + (err && err.message) });
  }
}
