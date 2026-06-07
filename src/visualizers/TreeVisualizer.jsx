import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { layoutTree } from "../lib/treeLayout.js";

const VW = 1000;
const VH = 560;
const R = 22;

const STATE = {
  default: { fill: "#1a1a1f", stroke: "#3a3a42", text: "#cbd5e1" },
  path: { fill: "#0c4a6e", stroke: "#0ea5e9", text: "#e0f2fe" },
  current: { fill: "#f59e0b", stroke: "#fbbf24", text: "#0a0a0b" },
  found: { fill: "#10b981", stroke: "#34d399", text: "#0a0a0b" },
};

export default function TreeVisualizer({ step }) {
  const tree = step?.tree || null;
  const current = step?.current;
  const path = new Set(step?.path || []);
  const isFound = step?.type === "found";

  const { nodes, edges, width, height } = layoutTree(tree);

  if (!tree || nodes.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-slate-500">
        <div className="text-center">
          <div className="text-sm">The tree is empty.</div>
          <div className="mt-1 text-xs text-slate-600">
            Insert values from the input panel to build a BST.
          </div>
        </div>
      </div>
    );
  }

  const px = (x) => ((x + 0.5) / Math.max(1, width)) * VW;
  const py = (y) => ((y + 0.5) / Math.max(1, height)) * VH;

  const pos = {};
  for (const n of nodes) pos[n.value] = { x: px(n.x), y: py(n.y) };

  const stateFor = (value) => {
    if (value === current) return isFound ? "found" : "current";
    if (path.has(value)) return "path";
    return "default";
  };

  return (
    <div className="flex h-full w-full flex-col">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
      >
        {/* Edges */}
        {edges.map(([from, to]) => {
          const a = pos[from];
          const b = pos[to];
          if (!a || !b) return null;
          const onPath = path.has(from) && path.has(to);
          return (
            <motion.line
              key={`${from}-${to}`}
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                x1: a.x,
                y1: a.y,
                x2: b.x,
                y2: b.y,
                stroke: onPath ? "#0ea5e9" : "#3a3a42",
              }}
              transition={{ type: "spring", stiffness: 200, damping: 28 }}
              strokeWidth={onPath ? 4 : 2.5}
              strokeLinecap="round"
            />
          );
        })}

        {/* Nodes — each wrapped in a group translated to its position so the
            circle and its value label always move together and stay centered. */}
        <AnimatePresence>
          {nodes.map((n) => {
            const st = STATE[stateFor(n.value)];
            const p = pos[n.value];
            return (
              <motion.g
                key={n.value}
                initial={{ opacity: 0, scale: 0.4, x: p.x, y: p.y }}
                animate={{ opacity: 1, scale: 1, x: p.x, y: p.y }}
                exit={{ opacity: 0, scale: 0.4 }}
                transition={{ type: "spring", stiffness: 220, damping: 24 }}
              >
                <motion.circle
                  cx={0}
                  cy={0}
                  r={R}
                  animate={{ fill: st.fill, stroke: st.stroke }}
                  transition={{ duration: 0.18 }}
                  strokeWidth="3"
                />
                <text
                  x={0}
                  y={6}
                  textAnchor="middle"
                  fontSize="17"
                  fontWeight="700"
                  fill={st.text}
                  style={{ userSelect: "none", pointerEvents: "none" }}
                >
                  {n.value}
                </text>
              </motion.g>
            );
          })}
        </AnimatePresence>
      </svg>
    </div>
  );
}
