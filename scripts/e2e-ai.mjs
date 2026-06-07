// End-to-end test: drives the real serverless handler (which calls the live
// Groq API) with a mock req/res, then verifies the returned trace is genuinely
// correct. Run: node scripts/e2e-ai.mjs
import fs from "node:fs";
import path from "node:path";
import handler, { isSorted } from "../api/groq.js";

// Load GROQ_API_KEY from .env without a dependency.
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(o) { this.body = o; return this; },
  };
}

async function run(description, sampleArray) {
  const req = { method: "POST", body: { description, sampleArray } };
  const res = mockRes();
  await handler(req, res);
  return res;
}

const SAMPLE = [42, 7, 91, 15, 63, 28];
const cases = [
  "Cocktail Shaker Sort",
  "Gnome sort",
  "Selection sort",
];

let fail = 0;
for (const desc of cases) {
  process.stdout.write(`\n• ${desc}\n`);
  let res;
  try {
    res = await run(desc, SAMPLE);
  } catch (e) {
    console.log(`  ✗ handler threw: ${e.message}`);
    fail++;
    continue;
  }
  if (res.statusCode !== 200) {
    console.log(`  ✗ HTTP ${res.statusCode}: ${JSON.stringify(res.body)}`);
    fail++;
    continue;
  }
  const { name, steps, timeComplexity, spaceComplexity } = res.body;
  const finalArr = steps[steps.length - 1].array;
  const sorted = isSorted(finalArr);
  console.log(`  name: ${name}  |  ${steps.length} steps  |  T:${timeComplexity} S:${spaceComplexity}`);
  console.log(`  final frame: ${JSON.stringify(finalArr)}`);
  if (sorted) console.log("  ✓ final array is genuinely sorted");
  else { console.log("  ✗ FINAL ARRAY NOT SORTED"); fail++; }
  if (steps[steps.length - 1].description === "") console.log("  ✓ final step has no clutter description");
}

console.log(`\n${fail === 0 ? "E2E PASSED ✓" : `E2E FAILED (${fail}) ✗`}`);
process.exit(fail === 0 ? 0 : 1);
