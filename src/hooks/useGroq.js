import { useState, useCallback } from "react";
import { useStore } from "../store/useStore.js";
import {
  validateSteps,
  hydrateArraySteps,
  ARRAY_STEP_TYPES,
} from "../lib/stepSchema.js";

// Remove ```json ... ``` / ``` ... ``` fences the model sometimes wraps code in.
function stripFences(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/^\s*```[a-zA-Z]*\s*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();
}

/**
 * Calls the app's own /api/groq serverless proxy, then safely parses and
 * validates the response before feeding it into the shared ArrayVisualizer.
 * Every failure mode maps to a distinct, user-facing message.
 */
export function useGroq() {
  const loadAiResult = useStore((s) => s.loadAiResult);
  const setAi = useStore((s) => s.setAi);
  const arrayInput = useStore((s) => s.arrayInput);
  const [pending, setPending] = useState(false);

  const generate = useCallback(
    async (description) => {
      if (!description || !description.trim()) {
        setAi({ status: "error", error: "Please describe an algorithm first.", raw: "" });
        return;
      }
      // The proxy caps output at max_tokens=2000, which bounds the trace to
      // ~30 steps. Trace a small sample so the run COMPLETES within budget.
      const sample = arrayInput.slice(0, 6);
      setPending(true);
      setAi({ status: "loading", error: "", raw: "", description });

      let res;
      try {
        res = await fetch("/api/groq", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description, sampleArray: sample }),
        });
      } catch (err) {
        setAi({
          status: "error",
          error: "Network error — could not reach the server. Is the dev server running?",
          raw: String(err && err.message),
        });
        setPending(false);
        return;
      }

      const bodyText = await res.text();

      if (!res.ok) {
        let msg = `The AI service returned an error (HTTP ${res.status}).`;
        try {
          const j = JSON.parse(bodyText);
          if (j && j.error) msg = j.error;
        } catch {
          /* keep default */
        }
        if (res.status === 429)
          msg = "Rate limited by Groq. Wait a few seconds and try again.";
        else if (res.status === 401 || res.status === 403)
          msg = "The server's GROQ_API_KEY is missing or invalid. Set it in your environment.";
        else if (res.status === 500 && /GROQ_API_KEY/.test(bodyText))
          msg = "GROQ_API_KEY is not configured on the server.";
        setAi({ status: "error", error: msg, raw: bodyText });
        setPending(false);
        return;
      }

      // Parse the proxy's JSON payload.
      let data;
      try {
        data = JSON.parse(bodyText);
      } catch {
        setAi({
          status: "error",
          error: "The AI returned a response that wasn't valid JSON.",
          raw: bodyText,
        });
        setPending(false);
        return;
      }

      // The proxy returns the model's JSON object directly: { name, code, steps }.
      const payload = data && data.result ? data.result : data;

      if (!payload || typeof payload !== "object") {
        setAi({
          status: "error",
          error: "The AI response was empty or malformed.",
          raw: bodyText,
        });
        setPending(false);
        return;
      }

      // `steps` may arrive as an array or as a JSON string.
      let steps = payload.steps;
      if (typeof steps === "string") {
        try {
          steps = JSON.parse(stripFences(steps));
        } catch {
          steps = null;
        }
      }

      const validation = validateSteps(steps, { allowedTypes: ARRAY_STEP_TYPES });
      if (!validation.ok) {
        setAi({
          status: "error",
          error: `The AI produced steps that don't match the schema: ${validation.reason}.`,
          raw: JSON.stringify(payload, null, 2),
        });
        setPending(false);
        return;
      }

      // Steps now come from REAL server-side execution of the generated code,
      // so each already carries its own `array`/`sorted` snapshot. Only fall
      // back to replay-hydration if a snapshot is somehow missing.
      const needsHydration = validation.steps.some((s) => !Array.isArray(s.array));
      const finalSteps = needsHydration
        ? hydrateArraySteps(validation.steps, sample)
        : validation.steps;
      const code = stripFences(payload.code || "// (no code returned)");
      const name = (payload.name && String(payload.name)) || "Custom Algorithm";

      loadAiResult({
        name,
        code,
        steps: finalSteps,
        raw: bodyText,
        description,
        timeComplexity: (payload.timeComplexity && String(payload.timeComplexity)) || "",
        spaceComplexity: (payload.spaceComplexity && String(payload.spaceComplexity)) || "",
      });
      setPending(false);
    },
    [arrayInput, loadAiResult, setAi]
  );

  return { generate, pending };
}
