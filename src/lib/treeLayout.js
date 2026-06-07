// treeLayout.js
// ---------------------------------------------------------------------------
// Tidy binary-tree layout. We assign each node an x from an in-order walk
// (which guarantees no two nodes share a column and left<node<right visually)
// and a y from its depth. The visualizer scales these unit coordinates into
// pixels, so nodes never overlap regardless of tree shape.
// ---------------------------------------------------------------------------

/**
 * @param {object|null} root  node shape: { value, left, right }
 * @returns {{ nodes: Array<{value, x, y, depth}>, edges: Array<[from, to]>, width:number, height:number }}
 * x is the in-order index (0..n-1), y is the depth (0..h). Coordinates are in
 * "grid units"; the renderer maps them to pixels.
 */
export function layoutTree(root) {
  const nodes = [];
  const edges = [];
  let order = 0;
  let maxDepth = 0;

  function walk(node, depth, parentValue) {
    if (!node) return;
    walk(node.left, depth + 1, node.value);
    const x = order++;
    maxDepth = Math.max(maxDepth, depth);
    nodes.push({ value: node.value, x, y: depth, depth });
    if (parentValue !== undefined && parentValue !== null) {
      edges.push([parentValue, node.value]);
    }
    walk(node.right, depth + 1, node.value);
  }

  walk(root, 0, null);
  return {
    nodes,
    edges,
    width: Math.max(order, 1),
    height: maxDepth + 1,
  };
}

/** Build a plain serializable tree object from a BST root (value/left/right). */
export function serializeTree(root) {
  if (!root) return null;
  return {
    value: root.value,
    left: serializeTree(root.left),
    right: serializeTree(root.right),
  };
}
