import React, { useMemo } from "react";
import { motion } from "framer-motion";

const COLORS = {
  default: "#475569", // slate-600
  defaultTop: "#64748b",
  compare: "#f59e0b", // amber
  swap: "#ef4444", // red
  set: "#fb7185", // rose (writes)
  sorted: "#10b981", // emerald
  pivot: "#8b5cf6", // violet
  pointer: "#0ea5e9", // sky
  found: "#10b981",
  notfound: "#ef4444",
};

/**
 * Renders the array state for a single precomputed step. Pure function of the
 * step object — no internal animation state — so scrubbing to any index draws
 * exactly the right frame.
 */
export default function ArrayVisualizer({ step, fallbackArray = [], compact = false }) {
  const array = (step && step.array) || fallbackArray;
  const n = array.length;
  const indices = (step && step.indices) || [];
  const sorted = new Set((step && step.sorted) || []);
  const pivot = step && step.pivot;
  const pointers = (step && step.pointers) || {};
  const type = step && step.type;

  const { min, max } = useMemo(() => {
    if (!n) return { min: 0, max: 1 };
    let mn = Infinity;
    let mx = -Infinity;
    for (const v of array) {
      const num = Number(v);
      if (num < mn) mn = num;
      if (num > mx) mx = num;
    }
    if (mn === mx) {
      mn = Math.min(0, mn);
      mx = mx === 0 ? 1 : mx;
    }
    return { min: mn, max: mx };
  }, [array, n]);

  const indexSet = new Set(indices);

  const colorFor = (i) => {
    if (type === "found" && indexSet.has(i)) return COLORS.found;
    if (indexSet.has(i)) {
      if (type === "swap") return COLORS.swap;
      if (type === "set") return COLORS.set;
      if (type === "compare") return COLORS.compare;
      if (type === "pointer") return COLORS.pointer;
      if (type === "highlight") return COLORS.compare;
      if (type === "mark-sorted") return COLORS.sorted;
      return COLORS.compare;
    }
    if (pivot === i) return COLORS.pivot;
    if (sorted.has(i)) return COLORS.sorted;
    return COLORS.default;
  };

  const showLabels = n <= 30 && !compact;
  const showIndex = n <= 22 && !compact;

  // Pointers grouped by index for stacked labels under bars.
  const pointersByIndex = useMemo(() => {
    const map = {};
    for (const [label, idx] of Object.entries(pointers)) {
      if (idx === undefined || idx === null || idx < 0) continue;
      (map[idx] ||= []).push(label);
    }
    return map;
  }, [pointers]);

  const heightPct = (v) => {
    const frac = (Number(v) - min) / (max - min || 1);
    return 12 + frac * 84; // 12%..96%
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex flex-1 items-end justify-center gap-[2%] px-2 pb-1">
        <div
          className="flex h-full w-full items-end justify-center"
          style={{ gap: `clamp(1px, ${Math.max(1, 14 - n / 4)}px, 8px)` }}
        >
          {array.map((v, i) => {
            const color = colorFor(i);
            const active = indexSet.has(i) || pivot === i;
            return (
              <div
                key={i}
                className="relative flex h-full flex-1 flex-col items-center justify-end"
                style={{ maxWidth: 64 }}
              >
                <motion.div
                  layout
                  className="w-full rounded-t-[3px]"
                  style={{ backgroundColor: color }}
                  animate={{
                    height: `${heightPct(v)}%`,
                    backgroundColor: color,
                    boxShadow: active
                      ? `0 0 14px ${color}aa`
                      : "0 0 0 rgba(0,0,0,0)",
                  }}
                  transition={{
                    height: { type: "spring", stiffness: 320, damping: 26 },
                    backgroundColor: { duration: 0.18 },
                  }}
                />
                {showLabels && (
                  <span
                    className="mono mt-1 select-none text-[10px] leading-none"
                    style={{ color: active ? "#fff" : "#9ca3af" }}
                  >
                    {v}
                  </span>
                )}
                {/* pointer markers */}
                {pointersByIndex[i] && (
                  <div className="absolute -bottom-[18px] flex flex-col items-center gap-[1px]">
                    <div className="flex gap-[2px]">
                      {pointersByIndex[i].map((label) => (
                        <span
                          key={label}
                          className="mono rounded bg-state-pointer/20 px-[3px] text-[9px] font-semibold leading-tight text-sky-300"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {/* index ruler */}
      {showIndex && (
        <div className="mt-5 flex w-full justify-center px-2">
          <div
            className="flex w-full justify-center"
            style={{ gap: `clamp(1px, ${Math.max(1, 14 - n / 4)}px, 8px)` }}
          >
            {array.map((_, i) => (
              <span
                key={i}
                className="mono flex-1 text-center text-[9px] text-slate-600"
                style={{ maxWidth: 64 }}
              >
                {i}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
