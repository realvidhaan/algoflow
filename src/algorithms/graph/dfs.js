import { makeStep } from "../../lib/stepSchema.js";
import { buildAdjacency, edgeKey } from "./_util.js";

export const code = `function dfs(graph, start) {
  const visited = new Set();
  function explore(node) {
    visited.add(node);
    visit(node);
    for (const next of neighbors(node)) {
      if (!visited.has(next)) {
        explore(next);
      }
    }
  }
  explore(start);
}`;

export function* generator(graph, opts = {}) {
  const adj = buildAdjacency(graph);
  const start = opts.start ?? (graph.nodes[0] && graph.nodes[0].id);
  if (start === undefined) return;

  const visited = new Set();
  const order = [];
  const stack = [];
  const traversed = [];
  const traversedKeys = new Set();
  const c = { visited: 0, edges: 0, maxDepth: 0 };
  const step = (type, f) =>
    makeStep(type, {
      ...f,
      visited: [...order],
      frontier: [...stack],
      traversed: traversed.map((e) => [e[0], e[1]]),
      counters: { ...c },
    });

  function* explore(node) {
    visited.add(node);
    order.push(node);
    stack.push(node);
    c.visited++;
    c.maxDepth = Math.max(c.maxDepth, stack.length);
    yield step("visit", {
      current: node,
      nodes: [node],
      codeLine: 5,
      description: `Visit ${node}; push to the call stack (depth ${stack.length}).`,
    });
    for (const { to: next } of adj.get(node) || []) {
      const key = edgeKey(node, next, graph.directed);
      if (!traversedKeys.has(key)) {
        traversedKeys.add(key);
        traversed.push([node, next]);
      }
      c.edges++;
      yield step("edge-traverse", {
        current: node,
        activeEdge: [node, next],
        nodes: [node, next],
        codeLine: 6,
        description: `From ${node}, look at neighbor ${next}.`,
      });
      if (!visited.has(next)) {
        yield* explore(next);
        yield step("visit", {
          current: node,
          nodes: [node],
          codeLine: 6,
          description: `Backtrack to ${node}.`,
        });
      } else {
        yield step("edge-traverse", {
          current: node,
          activeEdge: [node, next],
          nodes: [node, next],
          codeLine: 7,
          description: `${next} already visited — skip.`,
        });
      }
    }
    stack.pop();
  }

  yield step("highlight", {
    current: start,
    nodes: [start],
    codeLine: 12,
    description: `Start DFS at ${start}.`,
  });
  yield* explore(start);

  yield step("highlight", {
    current: null,
    nodes: [],
    codeLine: 13,
    description: `DFS complete. Visit order: ${order.join(" → ")}.`,
  });
}
