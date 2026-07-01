#!/usr/bin/env node
/**
 * render.mjs — sums every stats/data/*.json (one file per machine) and injects
 * the aggregated badges into README.md between the AI-STATS markers.
 *
 * Run this after each machine has pushed its collect.mjs output, or in a
 * GitHub Action triggered on push to stats/data/**.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "data");
const readme = join(__dirname, "..", "README.md");

const files = readdirSync(dataDir).filter((f) => f.endsWith(".json"));

let totalTokens = 0;
let outputTokens = 0;
let activeDays = 0;
const models = new Set();
const machines = [];
let firstDay = null;
let lastDay = null;

for (const f of files) {
  const d = JSON.parse(readFileSync(join(dataDir, f), "utf8"));
  totalTokens += d.totalTokens || 0;
  outputTokens += d.outputTokens || 0;
  activeDays += d.activeDays || 0;
  for (const m of d.models || []) models.add(m);
  machines.push(d.machine);
  if (d.firstDay && (!firstDay || d.firstDay < firstDay)) firstDay = d.firstDay;
  if (d.lastDay && (!lastDay || d.lastDay > lastDay)) lastDay = d.lastDay;
}

// Compact human-readable token count: 1.3B, 950M, 12k...
const humanTokens = (n) => {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(0) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "k";
  return String(n);
};

const badge = (label, message, color) =>
  `![${label}](https://img.shields.io/badge/${encodeURIComponent(
    label
  )}-${encodeURIComponent(message)}-${color}?style=flat-square&logo=anthropic&logoColor=white)`;

const badges = [
  badge("Claude Code tokens", humanTokens(totalTokens), "D97757"),
  badge("output tokens", humanTokens(outputTokens), "8A63D2"),
  badge("active days", String(activeDays), "1e3140"),
  badge("machines", String(machines.length), "555"),
].join("\n");

const block = [
  "<!-- AI-STATS:START -->",
  "#### 🤖 Built in public with Claude Code",
  "",
  badges,
  "",
  `<sub>Aggregated across ${machines.length} machine(s) · ${
    firstDay || "?"
  } → ${lastDay || "?"} · auto-updated by \`stats/\`. Safe metrics only — no prompts, code, or cost. Models: ${
    [...models].join(", ") || "n/a"
  }.</sub>`,
  "<!-- AI-STATS:END -->",
].join("\n");

let md = readFileSync(readme, "utf8");
const re = /<!-- AI-STATS:START -->[\s\S]*?<!-- AI-STATS:END -->/;
if (re.test(md)) {
  md = md.replace(re, block);
} else {
  md += "\n\n" + block + "\n";
}
writeFileSync(readme, md);
console.log("README updated. Totals:", {
  totalTokens: humanTokens(totalTokens),
  outputTokens: humanTokens(outputTokens),
  activeDays,
  machines,
});
