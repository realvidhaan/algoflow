import { makeStep } from "../../lib/stepSchema.js";
import { buildAdjacency, edgeKey } from "./_util.js";

export const code = `function dijkstra(graph, start, target) {
  const dist = {}, prev = {};
  for (const v of graph.nodes) dist[v] = Infinity;
  dist[start] = 0;
  const pq = new MinPriorityQueue();
  pq.push(start, 0);
  while (!pq.isEmpty()) {
    const u = pq.popMin();
    if (u === target) break;
    for (const { to, weight } of neighbors(u)) {
      const alt = dist[u] + weight;
      if (alt < dist[to]) {
        dist[to] = alt;
        prev[to] = u;
        pq.push(to, alt);
      }
    }
  }
  return reconstruct(prev, target);
}`;

export function* generator(graph, opts = {}) {
  const adj = buildAdjacency(graph);
  const ids = (graph.nodes || []).map((n) => n.id);
  const start = opts.start ?? ids[0];
  const target = opts.end ?? ids[ids.length - 1];
  if (start === undefined) return;

  const dist = {};
  const prev = {};
  for (const id of ids) dist[id] = Infinity;
  dist[start] = 0;

  const settled = new Set();
  const traversed = [];
  const traversedKeys = new Set();
  let pq = [{ node: start, d: 0 }];
  const c = { settled: 0, relaxations: 0, edges: 0 };

  const frontierNodes = () => [
    ...new Set(pq.map((p) => p.node).filter((n) => !settled.has(n))),
  ];
  const step = (type, f) =>
    makeStep(type, {
      ...f,
      visited: [...settled],
      frontier: frontierNodes(),
      traversed: traversed.map((e) => [e[0], e[1]]),
      dist: { ...dist },
      counters: { ...c },
    });

  yield step("highlight", {
    current: start,
    nodes: [start],
    codeLine: 4,
    description: `Dijkstra from ${start}${target !== undefined ? ` to ${target}` : ""}. dist[${start}] = 0, all others ∞.`,
  });

  while (pq.length > 0) {
    let mi = 0;
    for (let k = 1; k < pq.length; k++) if (pq[k].d < pq[mi].d) mi = k;
    const { node: u } = pq.splice(mi, 1)[0];
    if (settled.has(u)) continue;
    settled.add(u);
    c.settled++;
    yield step("dequeue", {
      current: u,
      nodes: [u],
      codeLine: 8,
      description: `Settle ${u} with shortest distance ${fmt(dist[u])}.`,
    });
    if (target !== undefined && u === target) {
      yield step("highlight", {
        current: u,
        nodes: [u],
        codeLine: 9,
        description: `Reached target ${target} — its distance is final.`,
      });
      break;
    }
    for (const { to: v, weight } of adj.get(u) || []) {
      const key = edgeKey(u, v, graph.directed);
      if (!traversedKeys.has(key)) {
        traversedKeys.add(key);
        traversed.push([u, v]);
      }
      c.edges++;
      const alt = dist[u] + weight;
      yield step("edge-traverse", {
        current: u,
        activeEdge: [u, v],
        nodes: [u, v],
        codeLine: 11,
        description: `Relax ${u} → ${v}: alt = ${fmt(dist[u])} + ${weight} = ${fmt(alt)} vs dist[${v}] = ${fmt(dist[v])}.`,
      });
      if (alt < dist[v]) {
        dist[v] = alt;
        prev[v] = u;
        pq.push({ node: v, d: alt });
        c.relaxations++;
        yield step("set", {
          current: u,
          nodes: [v],
          activeEdge: [u, v],
          codeLine: 13,
          description: `Improved: dist[${v}] = ${fmt(alt)} via ${u}. Push ${v} to the queue.`,
        });
      }
    }
  }

  // Reconstruct path to target (if any).
  if (target !== undefined && dist[target] < Infinity) {
    const path = [];
    let cur = target;
    while (cur !== undefined && cur !== null) {
      path.unshift(cur);
      cur = prev[cur];
      if (cur === start) {
        path.unshift(start);
        break;
      }
    }
    const pathEdges = [];
    for (let i = 0; i + 1 < path.length; i++) pathEdges.push([path[i], path[i + 1]]);
    yield step("found", {
      current: target,
      nodes: path,
      path,
      traversed: pathEdges,
      codeLine: 19,
      description: `Shortest path ${path.join(" → ")} with total cost ${fmt(dist[target])}.`,
    });
  } else {
    yield step("not-found", {
      current: null,
      nodes: [],
      codeLine: 19,
      description:
        target !== undefined
          ? `No path from ${start} to ${target}.`
          : `Dijkstra complete — all reachable distances finalized.`,
    });
  }
}

function fmt(x) {
  return x === Infinity ? "∞" : x;
}
