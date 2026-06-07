// Small presentation helpers shared by the overlay and the AI builder.

const SUPERSCRIPTS = {
  0: "⁰",
  1: "¹",
  2: "²",
  3: "³",
  4: "⁴",
  5: "⁵",
  6: "⁶",
  7: "⁷",
  8: "⁸",
  9: "⁹",
  n: "ⁿ",
  m: "ᵐ",
  k: "ᵏ",
  i: "ⁱ",
  "+": "⁺",
  "-": "⁻",
};

/**
 * Render a complexity string cleanly: caret notation like "O(n^2)" becomes
 * "O(n²)" using real superscripts, and the multiplication dot is normalized.
 * Anything it can't map is left untouched, so it's safe to run on values that
 * are already pretty (e.g. "O(n log n)").
 */
export function prettyComplexity(raw) {
  if (raw === undefined || raw === null || raw === "") return "";
  return String(raw)
    .replace(/\^(\{[^}]+\}|[A-Za-z0-9+\-]+)/g, (_, group) => {
      const body = group.replace(/^\{|\}$/g, "");
      let out = "";
      for (const ch of body) out += SUPERSCRIPTS[ch] ?? `^${ch}`;
      return out;
    })
    .replace(/\s*\*\s*/g, " · ");
}
