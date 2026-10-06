// src/config/constants.ts
var LITERS_PER_ALMOND = 6.2;
var TSP_PER_LITER = 202.9;
var TSP_PER_CUP = 48;
var CUP_THRESHOLD_LITERS = TSP_PER_CUP / TSP_PER_LITER;
var GAL_THRESHOLD_LITERS = 16 * TSP_PER_CUP / TSP_PER_LITER;

// src/services/format.ts
function formatAlmonds(n) {
  if (n < 1) return n.toFixed(1);
  return n < 10 ? String(Math.round(n)) : n.toFixed(1);
}
function formatStatusLineShort(dayLiters, weekLiters) {
  const dayAlmonds = formatAlmonds(dayLiters / LITERS_PER_ALMOND);
  const weekAlmonds = formatAlmonds(weekLiters / LITERS_PER_ALMOND);
  return `D ${dayAlmonds}\u{1F95C} | W ${weekAlmonds}\u{1F95C}`;
}

// src/services/rollup-totals.ts
function localDateKey(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function parseRollup(content) {
  const rollup = /* @__PURE__ */ new Map();
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
function rollupTotals(rollup, now) {
  const dayLiters = rollup.get(localDateKey(now)) ?? 0;
  let weekLiters = 0;
  for (let daysBack = 0; daysBack < 7; daysBack++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack);
    weekLiters += rollup.get(localDateKey(day)) ?? 0;
  }
  return { dayLiters, weekLiters };
}

// src/mod/register.ts
var ALMONDS_DIR = "/.claude/almonds/";
async function showStatus($) {
  const settings = await $.settings.read();
  if (settings.statusLine?.command?.includes(ALMONDS_DIR)) {
    return;
  }
  const home = await $.env.get("HOME");
  if (home === void 0) {
    return;
  }
  const text = await $.fs.read(`${home}/.claude/almonds/rollup.jsonl`).catch(() => "");
  const { dayLiters, weekLiters } = rollupTotals(parseRollup(text), /* @__PURE__ */ new Date());
  $.ui.status(formatStatusLineShort(dayLiters, weekLiters));
}
function register(on) {
  on("session.start", async ($, e, next) => {
    await showStatus($);
    return next(e);
  });
  on("classic.Stop", async ($, e, next) => {
    const result = await next(e);
    await showStatus($);
    return result;
  });
}
export {
  register
};
