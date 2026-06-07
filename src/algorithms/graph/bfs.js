import { makeStep } from "../../lib/stepSchema.js";
import { buildAdjacency, edgeKey } from "./_util.js";

export const code = `function bfs(graph, start) {
  const visited = new Set([start]);
  const queue = [start];
  while (queue.length > 0) {
    const node = queue.shift();
    visit(node);
    for (const next of neighbors(node)) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
}`;

export function* generator(graph, opts = {}) {
  const adj = buildAdjacency(graph);
  const start = opts.start ?? (graph.nodes[0] && graph.nodes[0].id);
  if (start === undefined) return;

  const discovered = new Set([start]);
  const processed = [];
  const traversed = [];
  const traversedKeys = new Set();
  const queue = [start];
  const c = { visited: 0, queued: 1, edges: 0 };
  const step = (type, f) =>
    makeStep(type, {
      ...f,
      visited: [...processed],
      frontier: [...queue],
      traversed: traversed.map((e) => [e[0], e[1]]),
      counters: { ...c },
    });

  yield step("enqueue", {
    current: start,
    nodes: [start],
    codeLine: 3,
    description: `Start BFS at ${start}. Enqueue ${start}.`,
  });

  while (queue.length > 0) {
    const node = queue.shift();
    yield step("dequeue", {
      current: node,
      nodes: [node],
      codeLine: 5,
      description: `Dequeue ${node} (FIFO).`,
    });
    processed.push(node);
    c.visited++;
    yield step("visit", {
      current: node,
      nodes: [node],
      codeLine: 6,
      description: `Visit ${node}.`,
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
        codeLine: 7,
        description: `Explore edge ${node} → ${next}.`,
      });
      if (!discovered.has(next)) {
        discovered.add(next);
        queue.push(next);
        c.queued++;
        yield step("enqueue", {
          current: next,
          nodes: [next],
          activeEdge: [node, next],
          codeLine: 10,
          description: `${next} not yet seen → enqueue it.`,
        });
      }
    }
  }

  yield step("highlight", {
    current: null,
    nodes: [],
    codeLine: 13,
    description: `BFS complete. Visited ${processed.length} node(s) in order: ${processed.join(" → ")}.`,
  });
}
