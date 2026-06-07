import { makeStep } from "../../lib/stepSchema.js";
import { serializeTree } from "../../lib/treeLayout.js";

export const code = `function insert(root, value) {
  if (!root) return { value, left: null, right: null };
  if (value < root.value)
    root.left = insert(root.left, value);
  else if (value > root.value)
    root.right = insert(root.right, value);
  return root;
}

function search(root, value) {
  let node = root;
  while (node) {
    if (value === node.value) return node;
    node = value < node.value ? node.left : node.right;
  }
  return null;
}

function remove(root, value) {
  if (!root) return null;
  if (value < root.value)
    root.left = remove(root.left, value);
  else if (value > root.value)
    root.right = remove(root.right, value);
  else {
    if (!root.left) return root.right;
    if (!root.right) return root.left;
    let s = root.right;
    while (s.left) s = s.left;
    root.value = s.value;
    root.right = remove(root.right, s.value);
  }
  return root;
}`;

const mkNode = (value) => ({ value, left: null, right: null });

export function* generator(input, opts = {}) {
  const state = { root: null };
  const c = { comparisons: 0 };
  const snap = () => serializeTree(state.root);
  const step = (type, f) =>
    makeStep(type, { ...f, tree: snap(), counters: { ...c } });

  // Build the tree from the input values (no animation) — used as the
  // starting point for an explicit insert/search/delete operation.
  const buildSilently = () => {
    for (const v of input) {
      if (!Number.isFinite(v)) continue;
      let node = state.root;
      if (!node) {
        state.root = mkNode(v);
        continue;
      }
      while (true) {
        if (v < node.value) {
          if (!node.left) {
            node.left = mkNode(v);
            break;
          }
          node = node.left;
        } else if (v > node.value) {
          if (!node.right) {
            node.right = mkNode(v);
            break;
          }
          node = node.right;
        } else break;
      }
    }
  };

  function* insertOp(value) {
    if (!state.root) {
      state.root = mkNode(value);
      yield step("tree-node", {
        nodes: [value],
        current: value,
        path: [value],
        codeLine: 2,
        description: `Tree is empty — ${value} becomes the root.`,
      });
      return;
    }
    let node = state.root;
    const path = [];
    while (true) {
      path.push(node.value);
      c.comparisons++;
      const line = value < node.value ? 3 : value > node.value ? 5 : 3;
      yield step("compare", {
        nodes: [node.value],
        current: node.value,
        path: [...path],
        codeLine: line,
        description:
          value === node.value
            ? `${value} already exists at this node — no insertion.`
            : `Compare ${value} with ${node.value} → go ${value < node.value ? "left" : "right"}.`,
      });
      if (value < node.value) {
        if (!node.left) {
          node.left = mkNode(value);
          path.push(value);
          yield step("tree-node", {
            nodes: [value],
            current: value,
            path: [...path],
            codeLine: 4,
            description: `Empty left child — insert ${value} here.`,
          });
          return;
        }
        node = node.left;
      } else if (value > node.value) {
        if (!node.right) {
          node.right = mkNode(value);
          path.push(value);
          yield step("tree-node", {
            nodes: [value],
            current: value,
            path: [...path],
            codeLine: 6,
            description: `Empty right child — insert ${value} here.`,
          });
          return;
        }
        node = node.right;
      } else {
        return;
      }
    }
  }

  function* searchOp(value) {
    let node = state.root;
    const path = [];
    while (node) {
      path.push(node.value);
      c.comparisons++;
      yield step("compare", {
        nodes: [node.value],
        current: node.value,
        path: [...path],
        codeLine: 13,
        description: `Compare ${value} with ${node.value}.`,
      });
      if (value === node.value) {
        yield step("found", {
          nodes: [node.value],
          current: node.value,
          path: [...path],
          codeLine: 13,
          description: `Found ${value}.`,
        });
        return;
      }
      yield step("compare", {
        nodes: [node.value],
        current: node.value,
        path: [...path],
        codeLine: 14,
        description: `${value} ${value < node.value ? "<" : ">"} ${node.value} → go ${value < node.value ? "left" : "right"}.`,
      });
      node = value < node.value ? node.left : node.right;
    }
    yield step("not-found", {
      nodes: [],
      current: null,
      path: [...path],
      codeLine: 16,
      description: `${value} is not in the tree.`,
    });
  }

  function* removeRec(node, value, path) {
    if (!node) {
      yield step("not-found", {
        nodes: [],
        current: null,
        path: [...path],
        codeLine: 20,
        description: `${value} not found — nothing to delete.`,
      });
      return null;
    }
    path.push(node.value);
    c.comparisons++;
    yield step("compare", {
      nodes: [node.value],
      current: node.value,
      path: [...path],
      codeLine: value < node.value ? 21 : value > node.value ? 23 : 25,
      description:
        value === node.value
          ? `Found ${value} — this is the node to remove.`
          : `Compare ${value} with ${node.value} → go ${value < node.value ? "left" : "right"}.`,
    });
    if (value < node.value) {
      node.left = yield* removeRec(node.left, value, path);
      return node;
    } else if (value > node.value) {
      node.right = yield* removeRec(node.right, value, path);
      return node;
    } else {
      if (!node.left) {
        yield step("tree-node", {
          nodes: [node.value],
          current: node.value,
          path: [...path],
          codeLine: 26,
          description: `No left child — replace ${node.value} with its right subtree.`,
        });
        return node.right;
      }
      if (!node.right) {
        yield step("tree-node", {
          nodes: [node.value],
          current: node.value,
          path: [...path],
          codeLine: 27,
          description: `No right child — replace ${node.value} with its left subtree.`,
        });
        return node.left;
      }
      // Two children: find in-order successor (min of right subtree).
      let s = node.right;
      const spath = [node.value];
      while (s.left) {
        spath.push(s.value);
        yield step("compare", {
          nodes: [s.value],
          current: s.value,
          path: [...spath],
          codeLine: 29,
          description: `Find in-order successor: go left from ${s.value}.`,
        });
        s = s.left;
      }
      spath.push(s.value);
      const succ = s.value;
      node.value = succ;
      yield step("set", {
        nodes: [succ],
        current: succ,
        path: [...spath],
        codeLine: 30,
        description: `Copy successor ${succ} into the deleted node, then remove the duplicate.`,
      });
      node.right = yield* removeRec(node.right, succ, [succ]);
      return node;
    }
  }

  // ---- Drive the requested operation -------------------------------------
  const op = opts.op || "build";

  if (op === "build") {
    yield step("highlight", {
      nodes: [],
      current: null,
      path: [],
      codeLine: 1,
      description: `Build a Binary Search Tree by inserting: ${input.join(", ")}.`,
    });
    for (const v of input) {
      if (!Number.isFinite(v)) continue;
      yield* insertOp(v);
    }
    yield step("highlight", {
      nodes: [],
      current: null,
      path: [],
      codeLine: 7,
      description: `BST built. In-order traversal yields the sorted sequence.`,
    });
    return;
  }

  buildSilently();
  const value = opts.value;
  yield step("highlight", {
    nodes: [],
    current: null,
    path: [],
    codeLine: op === "search" ? 10 : op === "delete" ? 19 : 1,
    description: `Starting tree built from ${input.join(", ")}. Now ${op} ${value}.`,
  });

  if (op === "search") {
    yield* searchOp(value);
  } else if (op === "insert") {
    yield* insertOp(value);
    yield step("highlight", {
      nodes: [value],
      current: value,
      path: [],
      codeLine: 7,
      description: `Inserted ${value}.`,
    });
  } else if (op === "delete") {
    state.root = yield* removeRec(state.root, value, []);
    yield step("mark-sorted", {
      nodes: [],
      current: null,
      path: [],
      codeLine: 33,
      description: `Removed ${value}. Tree updated.`,
    });
  }
}
