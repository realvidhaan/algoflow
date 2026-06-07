import React from "react";
import { motion } from "framer-motion";

export default function DPVisualizer({ step }) {
  const table = step?.table || [];
  const extra = step?.extra || {};
  const colLabels = extra.colLabels || [];
  const rowLabels = extra.rowLabels || [];
  const cell = step?.cell || null;
  const deps = step?.deps || [];
  const isFound = step?.type === "found";

  const rows = table.length;
  const cols = rows ? table[0].length : 0;

  const depSet = new Set(deps.map(([r, c]) => `${r},${c}`));
  const curKey = cell ? `${cell[0]},${cell[1]}` : null;

  const cellState = (r, c) => {
    const key = `${r},${c}`;
    if (key === curKey) return isFound ? "found" : "current";
    if (depSet.has(key)) return "dep";
    if (table[r][c] !== null && table[r][c] !== undefined) return "filled";
    return "empty";
  };

  const bg = {
    current: "#f59e0b",
    dep: "#0c4a6e",
    found: "#10b981",
    filled: "#15151a",
    empty: "#0e0e11",
  };
  const fg = {
    current: "#0a0a0b",
    dep: "#bae6fd",
    found: "#0a0a0b",
    filled: "#e2e8f0",
    empty: "#3f3f46",
  };

  if (!rows) {
    return (
      <div className="flex h-full w-full items-center justify-center text-slate-500">
        No table to display.
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto p-3">
      <div className="inline-block">
        <table className="border-separate" style={{ borderSpacing: 4 }}>
          {colLabels.length > 0 && (
            <thead>
              <tr>
                <th className="px-1" />
                {colLabels.map((label, c) => (
                  <th
                    key={c}
                    className="mono px-1 pb-1 text-[11px] font-medium text-slate-400"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {table.map((row, r) => (
              <tr key={r}>
                <td className="mono pr-2 text-right text-[11px] font-medium text-slate-400 whitespace-nowrap">
                  {rowLabels[r] ?? r}
                </td>
                {row.map((val, c) => {
                  const st = cellState(r, c);
                  const empty = val === null || val === undefined;
                  return (
                    <td key={c} className="p-0">
                      <motion.div
                        className="mono flex items-center justify-center rounded-md text-[13px] font-semibold"
                        style={{
                          minWidth: 34,
                          height: 34,
                          width: "100%",
                          color: fg[st],
                          border:
                            st === "dep"
                              ? "2px solid #0ea5e9"
                              : st === "current"
                              ? "2px solid #fbbf24"
                              : "1px solid #26262b",
                        }}
                        animate={{
                          backgroundColor: bg[st],
                          scale: st === "current" ? 1.12 : 1,
                        }}
                        transition={{ duration: 0.18 }}
                      >
                        {empty ? "" : val}
                      </motion.div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
