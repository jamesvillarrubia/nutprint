// src/cli/statusline.ts
import { homedir } from "os";
import { join } from "path";

// src/config/constants.ts
var LITERS_PER_ALMOND = 6.2;
var TSP_PER_LITER = 202.9;
var GAL_PER_LITER = 0.264172;
var TSP_PER_CUP = 48;
var CUP_THRESHOLD_LITERS = TSP_PER_CUP / TSP_PER_LITER;
var GAL_THRESHOLD_LITERS = 16 * TSP_PER_CUP / TSP_PER_LITER;

// src/services/ledger.ts
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname } from "path";
function readAllEntries(ledgerPath) {
  if (!existsSync(ledgerPath)) {
    return [];
  }
  const content = readFileSync(ledgerPath, "utf8");
  const entries = [];
  for (const line of content.split("\n")) {
    if (line.trim().length === 0) {
      continue;
    }
    try {
      entries.push(JSON.parse(line));
    } catch {
      continue;
    }
  }
  return entries;
}

// src/cli/statusline.ts
var DAY_MS = 24 * 60 * 60 * 1e3;
function computeTotals(entries, now) {
  const dayStartMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStartMs = now.getTime() - 7 * DAY_MS;
  let dayLiters = 0;
  let weekLiters = 0;
  for (const entry of entries) {
    const tsMs = new Date(entry.ts).getTime();
    if (tsMs >= weekStartMs) {
      weekLiters += entry.liters;
    }
    if (tsMs >= dayStartMs) {
      dayLiters += entry.liters;
    }
  }
  return { dayLiters, weekLiters };
}
function formatAlmonds(n) {
  if (n < 1) return n.toFixed(1);
  return n < 10 ? String(Math.round(n)) : n.toFixed(1);
}
function formatDay(dayLiters) {
  if (dayLiters < CUP_THRESHOLD_LITERS) {
    return `${(dayLiters * TSP_PER_LITER).toFixed(1)} tsp`;
  }
  if (dayLiters < GAL_THRESHOLD_LITERS) {
    return `${(dayLiters * TSP_PER_LITER / TSP_PER_CUP).toFixed(1)} cups`;
  }
  return `${(dayLiters * GAL_PER_LITER).toFixed(1)} gal`;
}
function formatStatusLine(dayLiters, weekLiters) {
  const dayDisplay = formatDay(dayLiters);
  const weekGal = (weekLiters * GAL_PER_LITER).toFixed(1);
  const dayAlmonds = formatAlmonds(dayLiters / LITERS_PER_ALMOND);
  const weekAlmonds = formatAlmonds(weekLiters / LITERS_PER_ALMOND);
  return `\u{1F95C} Day: ${dayDisplay} = ${dayAlmonds} almonds \xB7 Week: ${weekGal} gal = ${weekAlmonds} almonds`;
}
function formatStatusLineShort(dayLiters, weekLiters) {
  const dayAlmonds = formatAlmonds(dayLiters / LITERS_PER_ALMOND);
  const weekAlmonds = formatAlmonds(weekLiters / LITERS_PER_ALMOND);
  return `D ${dayAlmonds}\u{1F95C} | W ${weekAlmonds}\u{1F95C}`;
}
function renderStatusLine(argv, dayLiters, weekLiters) {
  return argv.includes("--long") ? formatStatusLine(dayLiters, weekLiters) : formatStatusLineShort(dayLiters, weekLiters);
}
function main() {
  try {
    const ledgerPath = join(homedir(), ".claude", "almonds", "ledger.jsonl");
    const entries = readAllEntries(ledgerPath);
    const { dayLiters, weekLiters } = computeTotals(entries, /* @__PURE__ */ new Date());
    process.stdout.write(renderStatusLine(process.argv, dayLiters, weekLiters));
  } catch {
    process.stdout.write("\u{1F95C} (unavailable)");
  }
}
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
export {
  computeTotals,
  formatAlmonds,
  formatStatusLine,
  formatStatusLineShort,
  renderStatusLine
};
