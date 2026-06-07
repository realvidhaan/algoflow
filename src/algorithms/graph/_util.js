// Shared helpers for graph algorithms.
// Graph shape: { nodes: [{ id, x, y }], edges: [{ from, to, weight }], directed }

export function buildAdjacency(graph) {
  const order = new Map(); // id -> index, for deterministic neighbor ordering
  (graph.nodes || []).forEach((n, i) => order.set(n.id, i));
  const adj = new Map();
  for (const n of graph.nodes || []) adj.set(n.id, []);
  for (const e of graph.edges || []) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    if (!adj.has(e.to)) adj.set(e.to, []);
    const w = e.weight ?? 1;
    adj.get(e.from).push({ to: e.to, weight: w });
    if (!graph.directed) adj.get(e.to).push({ to: e.from, weight: w });
  }
  // Deterministic neighbor order: by node placement order, then id.
  for (const [, list] of adj) {
    list.sort((a, b) => {
      const oa = order.has(a.to) ? order.get(a.to) : Infinity;
      const ob = order.has(b.to) ? order.get(b.to) : Infinity;
      if (oa !== ob) return oa - ob;
      return String(a.to).localeCompare(String(b.to));
    });
  }
  return adj;
}

// Normalize an undirected edge key so [a,b] and [b,a] collapse.
export function edgeKey(a, b, directed) {
  if (directed) return `${a}->${b}`;
  return [String(a), String(b)].sort().join("~");
}
