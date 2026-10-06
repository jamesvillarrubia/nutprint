// Node-free on purpose: the Claude Code hooks module (src/mod/register.ts) imports this.

interface RollupLine {
  date: string;
  liters: number;
}

export function localDateKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function parseRollup(content: string): Map<string, number> {
  const rollup = new Map<string, number>();
  for (const line of content.split('\n')) {
    if (line.trim().length === 0) {
      continue;
    }
    try {
      const parsed = JSON.parse(line) as RollupLine;
      rollup.set(parsed.date, parsed.liters);
    } catch {
      continue;
    }
  }
  return rollup;
}

// Week is today plus the six local dates before it: rollup buckets are whole days, so this
// differs from statusline.ts's rolling 168 hours over the ledger by up to one partial day.
export function rollupTotals(rollup: Map<string, number>, now: Date): { dayLiters: number; weekLiters: number } {
  const dayLiters = rollup.get(localDateKey(now)) ?? 0;
  let weekLiters = 0;
  for (let daysBack = 0; daysBack < 7; daysBack++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack);
    weekLiters += rollup.get(localDateKey(day)) ?? 0;
  }
  return { dayLiters, weekLiters };
}
