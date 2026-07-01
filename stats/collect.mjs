#!/usr/bin/env node
/**
 * collect.mjs — runs on EACH machine (Amazon workstation + personal PC).
 *
 * Reads local Claude Code usage via `ccusage` and writes ONLY safe,
 * aggregated metrics to stats/data/<machine>.json. It NEVER records prompts,
 * file contents, code, project names, or dollar cost — only token counts and
 * active-day counts. That file is committed and pushed; render.mjs later sums
 * every machine's file into the badges shown in the README.
 *
 * Usage:
 *   MACHINE=amazon node stats/collect.mjs
 *   MACHINE=personal node stats/collect.mjs
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const machine = (process.env.MACHINE || "unknown").replace(/[^a-z0-9_-]/gi, "");

// Pull per-day usage from ccusage as JSON.
let raw;
try {
  raw = execFileSync("npx", ["-y", "ccusage@latest", "daily", "--json"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
} catch (err) {
  console.error("Failed to run ccusage:", err.message);
  process.exit(1);
}

const parsed = JSON.parse(raw);
const days = Array.isArray(parsed.daily) ? parsed.daily : [];

// Aggregate ONLY safe fields. No cost, no content, no project identifiers.
let totalTokens = 0;
let outputTokens = 0;
const activeDays = new Set();
const models = new Set();

for (const d of days) {
  totalTokens += d.totalTokens || 0;
  outputTokens += d.outputTokens || 0;
  if (d.period) activeDays.add(d.period);
  for (const m of d.modelsUsed || []) models.add(m);
}

const out = {
  machine,
  // "safe" metrics only — deliberately excludes totalCost / dollar figures.
  totalTokens,
  outputTokens,
  activeDays: activeDays.size,
  sessions: days.length,
  models: [...models].sort(),
  firstDay: activeDays.size ? [...activeDays].sort()[0] : null,
  lastDay: activeDays.size ? [...activeDays].sort().at(-1) : null,
};

const dataDir = join(__dirname, "data");
mkdirSync(dataDir, { recursive: true });
const target = join(dataDir, `${machine}.json`);
writeFileSync(target, JSON.stringify(out, null, 2) + "\n");
console.log(`Wrote ${target}:`, out);
