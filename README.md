# AlgoFlow

An interactive algorithm visualizer. Watch sorting, searching, graph, tree, and
dynamic-programming algorithms execute one atomic step at a time — with synced
source-code highlighting, live counters, full scrub/step-back, a side-by-side
comparison mode, and an **AI Custom Algorithm Builder** that traces any
algorithm you describe in plain English.

![AlgoFlow](public/favicon.svg)

## Features

- **5 algorithm families, 15 algorithms**
  - **Sorting** — Quicksort (Lomuto), Merge, Bubble, Insertion, Selection, Heap
  - **Searching** — Binary Search (auto-sorts + low/mid/high pointers), Linear Search
  - **Graph** — BFS, DFS, Dijkstra on a fully interactive canvas
  - **Tree** — Binary Search Tree insert / search / delete with animated paths
  - **Dynamic Programming** — Memoized Fibonacci, 0/1 Knapsack, LCS (animated tables)
- **Execution controls** — play/pause, step forward/back, jump to start/end, a
  0.25×–8× speed slider, and a draggable progress scrubber. Rewind and scrubbing
  render the precomputed state at an index — never by reversing operations, so
  the visualization can never desync from the stats.
- **Synced code panel** — a read-only Monaco editor shows the running source and
  highlights the exact line for the current step. Click any line to jump to the
  first step that executes it.
- **Live stats** — comparisons, swaps, array accesses (and graph/DP-specific
  counters), plus static time/space complexity and the current step description.
- **Comparison mode** — run 2–3 sorting algorithms on the *same* input against a
  single step clock and see which finishes in the fewest steps, with live
  comparison/swap counts per pane.
- **Interactive graph editor** — click to add nodes, drag node-to-node to add
  edges, set weights, drag to reposition, and erase nodes/edges.
- **AI Custom Algorithm Builder** — describe an algorithm; the app calls its own
  serverless Groq proxy, validates the returned trace against the step schema,
  and plays it through the *same* array visualizer as the built-ins.

## Tech Stack

React 18 · Vite · Tailwind CSS · Framer Motion · Zustand · @monaco-editor/react ·
Groq (llama-3.3-70b-versatile) via a Vercel serverless function.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173.

### Enabling the AI builder locally

The AI builder needs a Groq API key (free at https://console.groq.com/keys).

```bash
cp .env.example .env
# then edit .env and set GROQ_API_KEY=your_key_here
```

`.env` is gitignored. The key is read **only** server-side by
[`api/groq.js`](api/groq.js); it is never sent to the browser. During `vite dev`,
a small middleware in [`vite.config.js`](vite.config.js) serves `/api/groq`
exactly like the Vercel function does in production, so the builder "just works"
locally too. Everything except the AI builder works with no key at all.

### Verify the algorithms

```bash
node scripts/verify.mjs
```

This runs a correctness harness over every algorithm (final state correctness,
edge cases, and that every `codeLine` points to a real line of its source).

## Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel (the Vite preset is
   auto-detected: build `vite build`, output `dist`). The `api/` folder is
   automatically deployed as a serverless function.
2. In **Project → Settings → Environment Variables**, add:

   ```
   GROQ_API_KEY = your_key_here
   ```

3. Deploy. `vercel deploy` from the CLI works too.

## Tech & Architecture — the generator-based step engine

The core design principle: **every algorithm is a generator function that yields
discrete, plain-object "steps."** A step describes one atomic operation
(`compare`, `swap`, `set`, `visit`, `dp-cell`, …) and carries everything a
renderer needs to draw that exact frame.

```js
{
  type: "swap",
  indices: [2, 5],
  array: [/* full snapshot at this moment */],
  sorted: [0, 1],
  pointers: { i: 2, j: 5 },
  codeLine: 7,
  description: "12 > 9 → swap a[2] and a[5].",
  counters: { comparisons: 14, swaps: 6, arrayAccesses: 40 }
}
```

The engine ([`src/algorithms/index.js`](src/algorithms/index.js)) runs a
generator to completion **once** and collects the steps into an array:

```js
const steps = Array.from(algo.generator(input, opts));
```

Playback is then just an **index into that array**. The store holds a single
`currentStep` integer; play increments it on a timer, step-back decrements it,
and the scrubber sets it directly. Each visualizer is a *pure function of
`steps[currentStep]`* — it holds no animation state of its own. This is what
makes rewind, scrubbing, and click-to-jump trivial and always correct: there is
no operation to "undo," only a different frame to render.

Why this matters:

- **Decoupled logic & rendering** — algorithms never touch the DOM; renderers
  never know the algorithm. The same `ArrayVisualizer` renders Bubble Sort,
  Binary Search, *and* AI-generated traces.
- **Scrub-safe by construction** — because each step embeds its own snapshot
  (array contents, sorted set, visited/frontier sets, DP table, tree shape),
  jumping to step *i* can never disagree with the stats at step *i*.
- **`codeLine` ↔ source sync** — each step records the 1-based line of its
  algorithm's `code` string, so the Monaco panel highlights the right line and
  clicking a line maps back to the first step that runs it.
- **One clock, many panes** — comparison mode precomputes a steps array per
  algorithm and indexes them all with the same `currentStep`.
- **Safe AI ingestion** — the Groq proxy returns `{ name, code, steps }`; the
  client validates each step against the schema, replays the operations on the
  sample array to hydrate concrete snapshots, and only then feeds the shared
  engine. Malformed output produces a clear error instead of a crash.

### Project structure

```
api/groq.js                 Vercel serverless Groq proxy (key stays server-side)
src/
  algorithms/               one generator + source string per algorithm
    sorting/ searching/ graph/ tree/ dp/
    index.js                registry: id -> { generator, code, complexity, ... }
  visualizers/              Array / Graph / Tree / DP renderers (pure of a step)
  components/               Stage, Controls, CodePanel, StatsOverlay, InputPanel,
                            ComparisonMode, AIBuilder, AlgorithmPicker, Header
  store/useStore.js         Zustand store: inputs, steps, playback, modes
  hooks/                    usePlayback (step clock), useGroq (AI builder)
  lib/                      stepSchema (the contract), treeLayout
scripts/verify.mjs          algorithm correctness harness
```

## License

MIT — built as a portfolio piece.
