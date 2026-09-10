// src/hooks/on-stop.ts
import { copyFileSync, mkdirSync as mkdirSync4 } from "fs";
import { homedir } from "os";
import { dirname as dirname3, join as join2 } from "path";
import { fileURLToPath } from "url";

// src/config/constants.ts
var OUTPUT_JOULES_PER_TOKEN = 9.4;
var INPUT_ENERGY_RATIO = 0.06;
var CACHE_READ_ENERGY_RATIO = 0.1;
var ANTHROPIC_DC_WUE_L_PER_KWH = 0.15;
var FALLBACK_DC_WUE_L_PER_KWH = 1.9;
var GRID_WATER_L_PER_KWH = 3.142;
var TSP_PER_LITER = 202.9;
var TSP_PER_CUP = 48;
var CUP_THRESHOLD_LITERS = TSP_PER_CUP / TSP_PER_LITER;
var GAL_THRESHOLD_LITERS = 16 * TSP_PER_CUP / TSP_PER_LITER;
var LEDGER_RETENTION_DAYS = 30;
function isAnthropicModel(model) {
  return model.startsWith("claude-");
}

// src/services/estimate.ts
function estimateLiters(usage, model) {
  const outputJoules = usage.output_tokens * OUTPUT_JOULES_PER_TOKEN;
  const inputJoules = usage.input_tokens * OUTPUT_JOULES_PER_TOKEN * INPUT_ENERGY_RATIO;
  const cacheCreationJoules = usage.cache_creation_input_tokens * OUTPUT_JOULES_PER_TOKEN * INPUT_ENERGY_RATIO;
  const cacheReadJoules = usage.cache_read_input_tokens * OUTPUT_JOULES_PER_TOKEN * CACHE_READ_ENERGY_RATIO;
  const totalJoules = outputJoules + inputJoules + cacheCreationJoules + cacheReadJoules;
  const kWh = totalJoules / 36e5;
  const wuePerKwh = isAnthropicModel(model) ? ANTHROPIC_DC_WUE_L_PER_KWH : FALLBACK_DC_WUE_L_PER_KWH;
  return kWh * (wuePerKwh + GRID_WATER_L_PER_KWH);
}

// src/services/ledger.ts
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname } from "path";
function appendEntry(ledgerPath, entry) {
  mkdirSync(dirname(ledgerPath), { recursive: true });
  appendFileSync(ledgerPath, `${JSON.stringify(entry)}
`, "utf8");
}
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
function pruneOldEntries(ledgerPath, retentionDays, now = /* @__PURE__ */ new Date()) {
  if (!existsSync(ledgerPath)) {
    return;
  }
  const cutoffMs = now.getTime() - retentionDays * 24 * 60 * 60 * 1e3;
  const remaining = readAllEntries(ledgerPath).filter((entry) => new Date(entry.ts).getTime() >= cutoffMs);
  const body = remaining.map((entry) => JSON.stringify(entry)).join("\n");
  const tmpPath = `${ledgerPath}.tmp`;
  writeFileSync(tmpPath, remaining.length > 0 ? `${body}
` : "", "utf8");
  renameSync(tmpPath, ledgerPath);
}

// src/services/offsets.ts
import { existsSync as existsSync2, mkdirSync as mkdirSync2, readFileSync as readFileSync2, writeFileSync as writeFileSync2 } from "fs";
import { join } from "path";
function readOffset(offsetDir, sessionId) {
  const filePath = join(offsetDir, sessionId);
  if (!existsSync2(filePath)) {
    return 0;
  }
  const content = readFileSync2(filePath, "utf8").trim();
  if (content.length === 0) {
    return 0;
  }
  const parsed = Number(content);
  return Number.isNaN(parsed) ? 0 : parsed;
}
function writeOffset(offsetDir, sessionId, byteOffset) {
  mkdirSync2(offsetDir, { recursive: true });
  writeFileSync2(join(offsetDir, sessionId), String(byteOffset), "utf8");
}

// src/services/rollup.ts
import { existsSync as existsSync3, mkdirSync as mkdirSync3, readFileSync as readFileSync3, renameSync as renameSync2, writeFileSync as writeFileSync3 } from "fs";
import { dirname as dirname2 } from "path";
function localDateKey(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function readRollup(rollupPath) {
  const rollup = /* @__PURE__ */ new Map();
  if (!existsSync3(rollupPath)) {
    return rollup;
  }
  const content = readFileSync3(rollupPath, "utf8");
  for (const line of content.split("\n")) {
    if (line.trim().length === 0) {
      continue;
    }
    try {
      const parsed = JSON.parse(line);
      rollup.set(parsed.date, parsed.liters);
    } catch {
      continue;
    }
  }
  return rollup;
}
function writeRollup(rollupPath, rollup) {
  mkdirSync3(dirname2(rollupPath), { recursive: true });
  const lines = [];
  for (const [date, liters] of rollup) {
    lines.push(JSON.stringify({ date, liters }));
  }
  const body = lines.join("\n");
  const tmpPath = `${rollupPath}.tmp`;
  writeFileSync3(tmpPath, lines.length > 0 ? `${body}
` : "", "utf8");
  renameSync2(tmpPath, rollupPath);
}
function addToRollup(rollupPath, dateKey, liters) {
  if (!Number.isFinite(liters)) {
    process.stderr.write(`nutprint: skipped non-finite liters value (${liters}) for rollup date ${dateKey}
`);
    return;
  }
  const rollup = readRollup(rollupPath);
  rollup.set(dateKey, (rollup.get(dateKey) ?? 0) + liters);
  writeRollup(rollupPath, rollup);
}
function backfillRollupIfMissing(rollupPath, ledgerPath) {
  if (existsSync3(rollupPath)) {
    return;
  }
  const entries = readAllEntries(ledgerPath);
  if (entries.length === 0) {
    return;
  }
  const rollup = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    const dateKey = localDateKey(new Date(entry.ts));
    rollup.set(dateKey, (rollup.get(dateKey) ?? 0) + entry.liters);
  }
  writeRollup(rollupPath, rollup);
}

// src/services/transcript.ts
import { closeSync, openSync, readSync, statSync } from "fs";
function readNewUsageRecords(transcriptPath, fromByte) {
  const size = statSync(transcriptPath).size;
  if (fromByte >= size) {
    return { records: [], newOffset: fromByte };
  }
  const length = size - fromByte;
  const buffer = Buffer.alloc(length);
  const fd = openSync(transcriptPath, "r");
  readSync(fd, buffer, 0, length, fromByte);
  closeSync(fd);
  const chunk = buffer.toString("utf8");
  const lastNewline = chunk.lastIndexOf("\n");
  if (lastNewline === -1) {
    return { records: [], newOffset: fromByte };
  }
  const completeText = chunk.slice(0, lastNewline);
  const newOffset = fromByte + Buffer.byteLength(chunk.slice(0, lastNewline + 1), "utf8");
  const records = [];
  for (const line of completeText.split("\n")) {
    if (line.trim().length === 0) {
      continue;
    }
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    const usage = parsed.message?.usage;
    const model = parsed.message?.model;
    if (usage && typeof model === "string") {
      records.push({
        model,
        usage: {
          input_tokens: usage.input_tokens ?? 0,
          cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
          cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
          output_tokens: usage.output_tokens ?? 0
        }
      });
    }
  }
  return { records, newOffset };
}

// src/hooks/on-stop.ts
function defaultPaths() {
  const base = join2(homedir(), ".claude", "almonds");
  return {
    ledgerPath: join2(base, "ledger.jsonl"),
    offsetDir: join2(base, "offsets"),
    rollupPath: join2(base, "rollup.jsonl")
  };
}
function processStopEvent(input, paths, now = /* @__PURE__ */ new Date()) {
  backfillRollupIfMissing(paths.rollupPath, paths.ledgerPath);
  const fromByte = readOffset(paths.offsetDir, input.session_id);
  const { records, newOffset } = readNewUsageRecords(input.transcript_path, fromByte);
  let newLiters = 0;
  for (const record of records) {
    const liters = estimateLiters(record.usage, record.model);
    const entry = {
      ts: now.toISOString(),
      session_id: input.session_id,
      model: record.model,
      liters
    };
    appendEntry(paths.ledgerPath, entry);
    newLiters += liters;
  }
  writeOffset(paths.offsetDir, input.session_id, newOffset);
  if (records.length > 0) {
    addToRollup(paths.rollupPath, localDateKey(now), newLiters);
  }
  pruneOldEntries(paths.ledgerPath, LEDGER_RETENTION_DAYS, now);
}
function resolveStatuslineSource(hookModuleUrl) {
  return join2(dirname3(fileURLToPath(hookModuleUrl)), "..", "cli", "statusline.js");
}
function defaultStatuslineTargetPath() {
  return join2(homedir(), ".claude", "almonds", "statusline.js");
}
function syncStatusline(sourcePath, targetPath) {
  mkdirSync4(dirname3(targetPath), { recursive: true });
  copyFileSync(sourcePath, targetPath);
}
function main() {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    raw += chunk;
  });
  process.stdin.on("end", () => {
    try {
      const input = JSON.parse(raw);
      processStopEvent(input, defaultPaths());
    } catch (err) {
      process.stderr.write(`nutprint: on-stop hook failed: ${err.message}
`);
    }
    try {
      syncStatusline(resolveStatuslineSource(import.meta.url), defaultStatuslineTargetPath());
    } catch (err) {
      process.stderr.write(`nutprint: statusline sync failed: ${err.message}
`);
    }
  });
}
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
export {
  defaultPaths,
  defaultStatuslineTargetPath,
  processStopEvent,
  resolveStatuslineSource,
  syncStatusline
};
