import React, { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useStore } from "../store/useStore.js";

const VW = 1000;
const VH = 640;
const R = 24;

const NODE_COLORS = {
  default: { fill: "#1a1a1f", stroke: "#3a3a42", text: "#cbd5e1" },
  current: { fill: "#f59e0b", stroke: "#fbbf24", text: "#0a0a0b" },
  frontier: { fill: "#0ea5e9", stroke: "#38bdf8", text: "#0a0a0b" },
  visited: { fill: "#334155", stroke: "#475569", text: "#e2e8f0" },
  path: { fill: "#10b981", stroke: "#34d399", text: "#0a0a0b" },
};

const MODES = [
  { id: "select", label: "Move", hint: "Drag nodes to reposition" },
  { id: "addNode", label: "+ Node", hint: "Click empty space to add a node" },
  { id: "addEdge", label: "+ Edge", hint: "Drag from one node to another" },
  { id: "erase", label: "Erase", hint: "Click a node or edge to delete" },
];

export default function GraphVisualizer({ step }) {
  const graph = useStore((s) => s.graph);
  const graphStart = useStore((s) => s.graphStart);
  const graphEnd = useStore((s) => s.graphEnd);
  const weighted = useStore((s) => s.activeAlgo()?.weighted);
  const addNode = useStore((s) => s.addNode);
  const moveNode = useStore((s) => s.moveNode);
  const addEdge = useStore((s) => s.addEdge);
  const deleteNode = useStore((s) => s.deleteNode);
  const deleteEdge = useStore((s) => s.deleteEdge);
  const setEdgeWeight = useStore((s) => s.setEdgeWeight);

  const svgRef = useRef(null);
  const [mode, setMode] = useState("select");
  const [drag, setDrag] = useState(null); // { id } while moving
  const [edgeDraft, setEdgeDraft] = useState(null); // { from, x, y }

  const current = step?.current;
  const visited = new Set(step?.visited || []);
  const frontier = new Set(step?.frontier || []);
  const pathArr = step?.path || [];
  const path = new Set(pathArr);
  const dist = step?.dist || {};
  const activeEdge = step?.activeEdge;
  const traversed = step?.traversed || [];

  // Set of "a~b" keys for consecutive nodes in the final path.
  const pathEdgeKeys = new Set();
  for (let i = 0; i + 1 < pathArr.length; i++) {
    const x = String(pathArr[i]);
    const y = String(pathArr[i + 1]);
    pathEdgeKeys.add(`${x}>${y}`);
    if (!graph.directed) pathEdgeKeys.add(`${y}>${x}`);
  }

  const nodePos = useCallback(
    (id) => {
      const node = graph.nodes.find((n) => n.id === id);
      if (!node) return { x: 0, y: 0 };
      return { x: node.x * VW, y: node.y * VH };
    },
    [graph.nodes]
  );

  const toLocal = (e) => {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: p.x, y: p.y };
  };

  // ---- Background interactions -------------------------------------------
  const onSvgPointerDown = (e) => {
    if (mode !== "addNode") return;
    if (e.target.dataset && e.target.dataset.kind) return; // hit a node/edge
    const { x, y } = toLocal(e);
    addNode(
      Math.max(0.04, Math.min(0.96, x / VW)),
      Math.max(0.06, Math.min(0.94, y / VH))
    );
  };

  const onSvgPointerMove = (e) => {
    if (drag) {
      const { x, y } = toLocal(e);
      moveNode(drag.id, x / VW, y / VH);
    } else if (edgeDraft) {
      const { x, y } = toLocal(e);
      setEdgeDraft({ ...edgeDraft, x, y });
    }
  };

  const onSvgPointerUp = () => {
    setDrag(null);
    setEdgeDraft(null);
  };

  // ---- Node interactions -------------------------------------------------
  const onNodePointerDown = (e, id) => {
    e.stopPropagation();
    if (mode === "select") {
      setDrag({ id });
    } else if (mode === "addEdge") {
      const p = nodePos(id);
      setEdgeDraft({ from: id, x: p.x, y: p.y });
    } else if (mode === "erase") {
      deleteNode(id);
    }
  };

  const onNodePointerUp = (e, id) => {
    e.stopPropagation();
    if (mode === "addEdge" && edgeDraft && edgeDraft.from !== id) {
      let w = 1;
      if (weighted) {
        const input = window.prompt(`Weight for edge ${edgeDraft.from} → ${id}:`, "1");
        if (input === null) {
          setEdgeDraft(null);
          return;
        }
        w = Number(input) || 1;
      }
      addEdge(edgeDraft.from, id, w);
    }
    setEdgeDraft(null);
    setDrag(null);
  };

  const onEdgeClick = (e, edge) => {
    e.stopPropagation();
    if (mode === "erase") {
      deleteEdge(edge.from, edge.to);
    } else if (mode === "select" && weighted) {
      const input = window.prompt(
        `Weight for edge ${edge.from} → ${edge.to}:`,
        String(edge.weight ?? 1)
      );
      if (input !== null) setEdgeWeight(edge.from, edge.to, Number(input) || 1);
    }
  };

  const edgeState = (e) => {
    if (pathEdgeKeys.has(`${e.from}>${e.to}`)) return "path";
    if (
      activeEdge &&
      ((activeEdge[0] === e.from && activeEdge[1] === e.to) ||
        (!graph.directed && activeEdge[0] === e.to && activeEdge[1] === e.from))
    )
      return "active";
    const isTraversed = traversed.some(
      (t) =>
        (t[0] === e.from && t[1] === e.to) ||
        (!graph.directed && t[0] === e.to && t[1] === e.from)
    );
    if (isTraversed) return "traversed";
    return "default";
  };

  const edgeStroke = {
    default: "#3a3a42",
    traversed: "#0ea5e9",
    active: "#f59e0b",
    path: "#10b981",
  };

  const nodeState = (id) => {
    if (id === current) return "current";
    if (path.has(id)) return "path";
    if (frontier.has(id)) return "frontier";
    if (visited.has(id)) return "visited";
    return "default";
  };

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Toolbar */}
      <div className="absolute left-2 top-2 z-10 flex flex-wrap items-center gap-1 rounded-lg border border-border bg-panel/80 p-1 backdrop-blur">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            title={m.hint}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              mode === m.id
                ? "bg-violet-600 text-white"
                : "text-slate-300 hover:bg-panel-2"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="pointer-events-none absolute right-2 top-2 z-10 rounded-md border border-border bg-panel/70 px-2 py-1 text-[10px] text-slate-400 backdrop-blur">
        {MODES.find((m) => m.id === mode)?.hint}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid meet"
        className={`h-full w-full ${mode === "addNode" ? "cursor-crosshair" : ""}`}
        onPointerDown={onSvgPointerDown}
        onPointerMove={onSvgPointerMove}
        onPointerUp={onSvgPointerUp}
        onPointerLeave={onSvgPointerUp}
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
          </marker>
        </defs>

        {/* Edges */}
        {graph.edges.map((e, i) => {
          const a = nodePos(e.from);
          const b = nodePos(e.to);
          const st = edgeState(e);
          const stroke = edgeStroke[st];
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          return (
            <g key={`${e.from}-${e.to}-${i}`}>
              <line
                data-kind="edge"
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={stroke}
                strokeWidth={st === "default" ? 2.5 : 5}
                strokeLinecap="round"
                markerEnd={graph.directed ? "url(#arrow)" : undefined}
                className={mode === "erase" ? "cursor-pointer" : weighted ? "cursor-pointer" : ""}
                onClick={(ev) => onEdgeClick(ev, e)}
                style={{ transition: "stroke 0.18s, stroke-width 0.18s" }}
              />
              {weighted && (
                <g
                  onClick={(ev) => onEdgeClick(ev, e)}
                  className={weighted ? "cursor-pointer" : ""}
                >
                  <circle cx={mx} cy={my} r="13" fill="#0a0a0b" stroke={stroke} strokeWidth="1.5" />
                  <text
                    x={mx}
                    y={my + 4}
                    textAnchor="middle"
                    className="mono"
                    fontSize="13"
                    fill="#e2e8f0"
                  >
                    {e.weight}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Edge draft line */}
        {edgeDraft && (
          <line
            x1={nodePos(edgeDraft.from).x}
            y1={nodePos(edgeDraft.from).y}
            x2={edgeDraft.x}
            y2={edgeDraft.y}
            stroke="#8b5cf6"
            strokeWidth="3"
            strokeDasharray="6 5"
          />
        )}

        {/* Nodes */}
        {graph.nodes.map((node) => {
          const st = nodeState(node.id);
          const col = NODE_COLORS[st];
          const x = node.x * VW;
          const y = node.y * VH;
          const d = dist[node.id];
          return (
            <g
              key={node.id}
              data-kind="node"
              onPointerDown={(e) => onNodePointerDown(e, node.id)}
              onPointerUp={(e) => onNodePointerUp(e, node.id)}
              className={mode === "select" ? "cursor-grab" : "cursor-pointer"}
              style={{ touchAction: "none" }}
            >
              <motion.circle
                data-kind="node"
                cx={x}
                cy={y}
                animate={{ fill: col.fill, stroke: col.stroke, r: st === "current" ? R + 3 : R }}
                transition={{ duration: 0.18 }}
                strokeWidth="3"
              />
              <text
                data-kind="node"
                x={x}
                y={y + 6}
                textAnchor="middle"
                fontSize="18"
                fontWeight="700"
                fill={col.text}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {node.id}
              </text>
              {/* start / end badges */}
              {node.id === graphStart && (
                <text x={x} y={y - R - 8} textAnchor="middle" fontSize="12" fill="#34d399" fontWeight="700">
                  START
                </text>
              )}
              {node.id === graphEnd && node.id !== graphStart && (
                <text x={x} y={y - R - 8} textAnchor="middle" fontSize="12" fill="#f472b6" fontWeight="700">
                  END
                </text>
              )}
              {/* dijkstra distance */}
              {d !== undefined && (
                <text
                  x={x + R + 4}
                  y={y - R + 2}
                  textAnchor="start"
                  className="mono"
                  fontSize="12"
                  fill={d === Infinity ? "#64748b" : "#fbbf24"}
                  style={{ pointerEvents: "none" }}
                >
                  {d === Infinity ? "∞" : d}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
