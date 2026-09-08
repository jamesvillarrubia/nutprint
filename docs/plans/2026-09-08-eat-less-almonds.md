# eat-less-almonds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Claude Code plugin that estimates water usage from token usage and shows it in the status bar as almonds, e.g. `🥜 Day: 3.5 tsp = 1 almonds · Week: 2.4 gal = 150 almonds`.

**Architecture:** A `Stop` hook incrementally reads new bytes of each session's transcript, converts new `usage` blocks to liters via a sourced constants table, and appends one entry per turn to a local JSONL ledger at `~/.claude/almonds/ledger.jsonl`. A `statusLine` CLI reads that ledger and sums liters into two time windows (since local midnight, trailing 7 days), cross-session and cross-account, then renders the display string.

**Tech Stack:** TypeScript strict, Node 22, pnpm, tsup (bundles `src/` to `dist/`), Vitest. Zero runtime dependencies: Node built-ins only (`node:fs`, `node:path`, `node:os`).

**Spec:** `/Users/james/Sites/system/eat-less-almonds/reqts/eat-less-almonds-design.md`

## Global Constraints

- TypeScript strict, Node 22, pnpm (never npm/yarn), tsup, per this repo's own stack default and the global `~/.claude/CLAUDE.md` language-choice hard gate.
- Zero runtime dependencies. `typescript`, `tsup`, `vitest`, `@types/node` are devDependencies only.
- Ledger: `~/.claude/almonds/ledger.jsonl`, one JSON object per line: `{ts, session_id, model, liters}`. Offsets: `~/.claude/almonds/offsets/<session_id>`, plain text byte count.
- Ledger retention: 30 days, pruned on every write.
- Formula constants (all in `src/config/constants.ts`): `OUTPUT_JOULES_PER_TOKEN = 1.8`, `INPUT_ENERGY_RATIO = 0.3`, `CACHE_READ_ENERGY_RATIO = 0.1`, `ANTHROPIC_DC_WUE_L_PER_KWH = 0.15`, `FALLBACK_DC_WUE_L_PER_KWH = 1.9`, `GRID_WATER_L_PER_KWH = 1.8`, `LITERS_PER_ALMOND = 6.2`, `TSP_PER_LITER = 202.9`, `GAL_PER_LITER = 0.264172`, `LEDGER_RETENTION_DAYS = 30`.
- Display format: `` 🥜 Day: <tsp> tsp = <almonds> almonds · Week: <gal> gal = <almonds> almonds `` — tsp/gal to one decimal; almonds as a whole number below 10, one decimal at or above 10.
- "Day" and "Week" are both cross-session, cross-account sums (every `session_id` in the ledger within the window). Neither is scoped to the invoking session.
- Conventional commit prefixes (`feat`, `fix`, `docs`, `chore`, `test`, `build`). Every commit message ends with:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01A5wJySZYFDfDj9zP6Ppizi
  ```

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `.gitignore`
- Create: `src/types/usage.ts`
- Test: `tests/sanity.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `TokenUsage` interface (`input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`, `output_tokens`, all `number`), `LedgerEntry` interface (`ts: string`, `session_id: string`, `model: string`, `liters: number`), both from `src/types/usage.ts`. Every later task imports these two types from `../types/usage.js`.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/sanity.test.ts
import { describe, it, expect } from 'vitest';
import type { TokenUsage } from '../src/types/usage.js';

describe('toolchain sanity', () => {
  it('type-checks and runs a trivial assertion', () => {
    const usage: TokenUsage = {
      input_tokens: 1,
      cache_creation_input_tokens: 2,
      cache_read_input_tokens: 3,
      output_tokens: 4,
    };
    expect(usage.input_tokens + usage.output_tokens).toBe(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: fails to run (no `package.json`/`vitest` yet, or module not found for `../src/types/usage.js`).

- [ ] **Step 3: Write minimal implementation**

```json
// package.json
{
  "name": "eat-less-almonds",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/node": "^22.7.0",
    "tsup": "^8.3.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'hooks/on-stop': 'src/hooks/on-stop.ts',
    'cli/statusline': 'src/cli/statusline.ts',
  },
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  dts: false,
  sourcemap: false,
  splitting: false,
});
```

```
# .gitignore
node_modules/
dist/
```

```typescript
// src/types/usage.ts
export interface TokenUsage {
  input_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  output_tokens: number;
}

export interface LedgerEntry {
  ts: string;
  session_id: string;
  model: string;
  liters: number;
}
```

Then install dependencies:

Run: `pnpm install`

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS, 1 test.

Also run: `pnpm typecheck`
Expected: exits 0, no errors (note: `tsup.config.ts` references `src/hooks/on-stop.ts` and `src/cli/statusline.ts`, which do not exist until Tasks 7 and 8; `tsc --noEmit` only checks files matched by `tsconfig.json`'s `include`, so this passes now. `pnpm build` will fail until those files exist — do not run `pnpm build` yet.)

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json tsup.config.ts .gitignore src/types/usage.ts tests/sanity.test.ts pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
chore: project scaffolding, TypeScript/Vitest/tsup toolchain

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01A5wJySZYFDfDj9zP6Ppizi
EOF
)"
```

---

### Task 2: Constants

**Files:**
- Create: `src/config/constants.ts`
- Test: `tests/constants.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: every constant named in Global Constraints above, plus `isAnthropicModel(model: string): boolean`, all from `src/config/constants.ts`.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/constants.test.ts
import { describe, it, expect } from 'vitest';
import {
  OUTPUT_JOULES_PER_TOKEN,
  INPUT_ENERGY_RATIO,
  CACHE_READ_ENERGY_RATIO,
  ANTHROPIC_DC_WUE_L_PER_KWH,
  FALLBACK_DC_WUE_L_PER_KWH,
  GRID_WATER_L_PER_KWH,
  LITERS_PER_ALMOND,
  TSP_PER_LITER,
  GAL_PER_LITER,
  LEDGER_RETENTION_DAYS,
  isAnthropicModel,
} from '../src/config/constants.js';

describe('constants', () => {
  it('match the sourced values in reqts/eat-less-almonds-design.md', () => {
    expect(OUTPUT_JOULES_PER_TOKEN).toBe(1.8);
    expect(INPUT_ENERGY_RATIO).toBe(0.3);
    expect(CACHE_READ_ENERGY_RATIO).toBe(0.1);
    expect(ANTHROPIC_DC_WUE_L_PER_KWH).toBe(0.15);
    expect(FALLBACK_DC_WUE_L_PER_KWH).toBe(1.9);
    expect(GRID_WATER_L_PER_KWH).toBe(1.8);
    expect(LITERS_PER_ALMOND).toBe(6.2);
    expect(TSP_PER_LITER).toBe(202.9);
    expect(GAL_PER_LITER).toBe(0.264172);
    expect(LEDGER_RETENTION_DAYS).toBe(30);
  });

  it('recognizes Anthropic models by the claude- prefix', () => {
    expect(isAnthropicModel('claude-sonnet-5')).toBe(true);
    expect(isAnthropicModel('claude-opus-5')).toBe(true);
    expect(isAnthropicModel('gpt-4o')).toBe(false);
    expect(isAnthropicModel('llama-3')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/constants.test.ts`
Expected: FAIL with "Cannot find module '../src/config/constants.js'".

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/config/constants.ts
//
// Every constant here is either a cited measurement or a documented
// assumption. See SOURCES.md for the full citation list and the worked
// example these numbers feed.

// Energy per output token. Cited: mid-range empirical LLM-inference
// energy-per-token measurements (~1.8 J/token).
export const OUTPUT_JOULES_PER_TOKEN = 1.8;

// Assumption, not a citation: prefill/encoding is cheaper per token than
// autoregressive decode. Applied to input and cache_creation tokens.
export const INPUT_ENERGY_RATIO = 0.3;

// Assumption, not a citation: a KV-cache hit is a memory lookup, not a
// full forward pass.
export const CACHE_READ_ENERGY_RATIO = 0.1;

// Cited: AWS's reported water-usage-effectiveness at the Project Rainier
// campus (New Carlisle, Indiana), where Anthropic trains and serves
// Claude on its Trainium2 fleet.
export const ANTHROPIC_DC_WUE_L_PER_KWH = 0.15;

// Cited: industry-average data center WUE. Used for any model that is
// not Anthropic's, since there is no equivalent named facility to cite.
export const FALLBACK_DC_WUE_L_PER_KWH = 1.9;

// Cited: EIA/USGS average US thermoelectric consumptive water use, the
// water cost of generating the electricity itself, on top of
// data-center cooling.
export const GRID_WATER_L_PER_KWH = 1.8;

// Cited: blue-water-only share of a California almond's water footprint.
// 12 L/almond total footprint * 51.6% blue water (Fulton et al.,
// "Water-indexed benefits and impacts of California almonds").
export const LITERS_PER_ALMOND = 6.2;

export const TSP_PER_LITER = 202.9;
export const GAL_PER_LITER = 0.264172;

export const LEDGER_RETENTION_DAYS = 30;

export function isAnthropicModel(model: string): boolean {
  return model.startsWith('claude-');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/constants.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/config/constants.ts tests/constants.test.ts
git commit -m "$(cat <<'EOF'
feat: sourced constants table for the water/almond formula

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01A5wJySZYFDfDj9zP6Ppizi
EOF
)"
```

---

### Task 3: estimate.ts

**Files:**
- Create: `src/services/estimate.ts`
- Test: `tests/estimate.test.ts`

**Interfaces:**
- Consumes: `TokenUsage` (from `../types/usage.js`, Task 1), every constant and `isAnthropicModel` (from `../config/constants.js`, Task 2).
- Produces: `estimateLiters(usage: TokenUsage, model: string): number`, from `src/services/estimate.ts`. Task 7 (`on-stop.ts`) calls this directly.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/estimate.test.ts
import { describe, it, expect } from 'vitest';
import { estimateLiters } from '../src/services/estimate.js';
import type { TokenUsage } from '../src/types/usage.js';

describe('estimateLiters', () => {
  it('matches the worked example in reqts/eat-less-almonds-design.md for an Anthropic model', () => {
    const usage: TokenUsage = {
      input_tokens: 2,
      cache_creation_input_tokens: 2367,
      cache_read_input_tokens: 106518,
      output_tokens: 6240,
    };

    const liters = estimateLiters(usage, 'claude-sonnet-5');

    // output: 6240 * 1.8 = 11232 J
    // input: 2 * 1.8 * 0.3 = 1.08 J
    // cache_creation: 2367 * 1.8 * 0.3 = 1278.18 J
    // cache_read: 106518 * 1.8 * 0.1 = 19173.24 J
    // total: 31684.5 J = 0.00880125 kWh
    // liters: 0.00880125 * (0.15 + 1.8) = 0.0171624375
    expect(liters).toBeCloseTo(0.0171624375, 8);
  });

  it('uses the fallback WUE for a non-Anthropic model', () => {
    const usage: TokenUsage = {
      input_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      output_tokens: 1000,
    };

    const liters = estimateLiters(usage, 'gpt-4o');

    // output: 1000 * 1.8 = 1800 J = 0.0005 kWh
    // liters: 0.0005 * (1.9 + 1.8) = 0.00185
    expect(liters).toBeCloseTo(0.00185, 8);
  });

  it('returns 0 for all-zero usage', () => {
    const usage: TokenUsage = {
      input_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      output_tokens: 0,
    };

    expect(estimateLiters(usage, 'claude-sonnet-5')).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/estimate.test.ts`
Expected: FAIL with "Cannot find module '../src/services/estimate.js'".

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/services/estimate.ts
import {
  ANTHROPIC_DC_WUE_L_PER_KWH,
  CACHE_READ_ENERGY_RATIO,
  FALLBACK_DC_WUE_L_PER_KWH,
  GRID_WATER_L_PER_KWH,
  INPUT_ENERGY_RATIO,
  OUTPUT_JOULES_PER_TOKEN,
  isAnthropicModel,
} from '../config/constants.js';
import type { TokenUsage } from '../types/usage.js';

export function estimateLiters(usage: TokenUsage, model: string): number {
  const outputJoules = usage.output_tokens * OUTPUT_JOULES_PER_TOKEN;
  const inputJoules = usage.input_tokens * OUTPUT_JOULES_PER_TOKEN * INPUT_ENERGY_RATIO;
  const cacheCreationJoules =
    usage.cache_creation_input_tokens * OUTPUT_JOULES_PER_TOKEN * INPUT_ENERGY_RATIO;
  const cacheReadJoules =
    usage.cache_read_input_tokens * OUTPUT_JOULES_PER_TOKEN * CACHE_READ_ENERGY_RATIO;

  const totalJoules = outputJoules + inputJoules + cacheCreationJoules + cacheReadJoules;
  const kWh = totalJoules / 3_600_000;

  const wuePerKwh = isAnthropicModel(model) ? ANTHROPIC_DC_WUE_L_PER_KWH : FALLBACK_DC_WUE_L_PER_KWH;
  return kWh * (wuePerKwh + GRID_WATER_L_PER_KWH);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/estimate.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/estimate.ts tests/estimate.test.ts
git commit -m "$(cat <<'EOF'
feat: token usage to liters formula

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01A5wJySZYFDfDj9zP6Ppizi
EOF
)"
```

---

### Task 4: ledger.ts

**Files:**
- Create: `src/services/ledger.ts`
- Test: `tests/ledger.test.ts`

**Interfaces:**
- Consumes: `LedgerEntry` (from `../types/usage.js`, Task 1).
- Produces: `appendEntry(ledgerPath: string, entry: LedgerEntry): void`, `readAllEntries(ledgerPath: string): LedgerEntry[]`, `pruneOldEntries(ledgerPath: string, retentionDays: number, now?: Date): void`, all from `src/services/ledger.ts`. Task 7 calls `appendEntry` and `pruneOldEntries`; Task 8 calls `readAllEntries`.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/ledger.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appendEntry, pruneOldEntries, readAllEntries } from '../src/services/ledger.js';
import type { LedgerEntry } from '../src/types/usage.js';

let dir: string;
let ledgerPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'almonds-ledger-'));
  ledgerPath = join(dir, 'nested', 'ledger.jsonl');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('ledger', () => {
  it('returns an empty array when the ledger file does not exist yet', () => {
    expect(readAllEntries(ledgerPath)).toEqual([]);
  });

  it('appends entries and creates parent directories as needed', () => {
    const entry: LedgerEntry = { ts: '2026-09-08T00:00:00.000Z', session_id: 's1', model: 'claude-sonnet-5', liters: 0.01 };
    appendEntry(ledgerPath, entry);
    appendEntry(ledgerPath, { ...entry, session_id: 's2', liters: 0.02 });

    const entries = readAllEntries(ledgerPath);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual(entry);
    expect(entries[1].session_id).toBe('s2');
  });

  it('prunes entries older than retentionDays, keeping newer ones', () => {
    const now = new Date('2026-09-08T00:00:00.000Z');
    const old: LedgerEntry = { ts: '2026-08-01T00:00:00.000Z', session_id: 's1', model: 'claude-sonnet-5', liters: 0.01 };
    const recent: LedgerEntry = { ts: '2026-09-07T00:00:00.000Z', session_id: 's1', model: 'claude-sonnet-5', liters: 0.02 };
    appendEntry(ledgerPath, old);
    appendEntry(ledgerPath, recent);

    pruneOldEntries(ledgerPath, 30, now);

    const entries = readAllEntries(ledgerPath);
    expect(entries).toEqual([recent]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/ledger.test.ts`
Expected: FAIL with "Cannot find module '../src/services/ledger.js'".

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/services/ledger.ts
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { LedgerEntry } from '../types/usage.js';

export function appendEntry(ledgerPath: string, entry: LedgerEntry): void {
  mkdirSync(dirname(ledgerPath), { recursive: true });
  appendFileSync(ledgerPath, `${JSON.stringify(entry)}\n`, 'utf8');
}

export function readAllEntries(ledgerPath: string): LedgerEntry[] {
  if (!existsSync(ledgerPath)) {
    return [];
  }
  const content = readFileSync(ledgerPath, 'utf8');
  return content
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as LedgerEntry);
}

export function pruneOldEntries(ledgerPath: string, retentionDays: number, now: Date = new Date()): void {
  if (!existsSync(ledgerPath)) {
    return;
  }
  const cutoffMs = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  const remaining = readAllEntries(ledgerPath).filter((entry) => new Date(entry.ts).getTime() >= cutoffMs);
  const body = remaining.map((entry) => JSON.stringify(entry)).join('\n');
  writeFileSync(ledgerPath, remaining.length > 0 ? `${body}\n` : '', 'utf8');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/ledger.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/ledger.ts tests/ledger.test.ts
git commit -m "$(cat <<'EOF'
feat: append-only ledger with 30-day pruning

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01A5wJySZYFDfDj9zP6Ppizi
EOF
)"
```

---

### Task 5: offsets.ts

**Files:**
- Create: `src/services/offsets.ts`
- Test: `tests/offsets.test.ts`

**Interfaces:**
- Consumes: nothing beyond Node built-ins.
- Produces: `readOffset(offsetDir: string, sessionId: string): number`, `writeOffset(offsetDir: string, sessionId: string, byteOffset: number): void`, from `src/services/offsets.ts`. Task 7 calls both.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/offsets.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readOffset, writeOffset } from '../src/services/offsets.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'almonds-offsets-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('offsets', () => {
  it('returns 0 for a session with no saved offset', () => {
    expect(readOffset(dir, 'session-a')).toBe(0);
  });

  it('round-trips a written offset, and creates the directory if needed', () => {
    const offsetDir = join(dir, 'nested');
    writeOffset(offsetDir, 'session-a', 12345);
    expect(readOffset(offsetDir, 'session-a')).toBe(12345);
  });

  it('keeps offsets for different sessions independent', () => {
    writeOffset(dir, 'session-a', 100);
    writeOffset(dir, 'session-b', 200);
    expect(readOffset(dir, 'session-a')).toBe(100);
    expect(readOffset(dir, 'session-b')).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/offsets.test.ts`
Expected: FAIL with "Cannot find module '../src/services/offsets.js'".

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/services/offsets.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function readOffset(offsetDir: string, sessionId: string): number {
  const filePath = join(offsetDir, sessionId);
  if (!existsSync(filePath)) {
    return 0;
  }
  const content = readFileSync(filePath, 'utf8').trim();
  return content.length > 0 ? Number(content) : 0;
}

export function writeOffset(offsetDir: string, sessionId: string, byteOffset: number): void {
  mkdirSync(offsetDir, { recursive: true });
  writeFileSync(join(offsetDir, sessionId), String(byteOffset), 'utf8');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/offsets.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/offsets.ts tests/offsets.test.ts
git commit -m "$(cat <<'EOF'
feat: per-session transcript byte offsets

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01A5wJySZYFDfDj9zP6Ppizi
EOF
)"
```

---

### Task 6: transcript.ts

**Files:**
- Create: `src/services/transcript.ts`
- Test: `tests/transcript.test.ts`

**Interfaces:**
- Consumes: `TokenUsage` (from `../types/usage.js`, Task 1).
- Produces: `UsageRecord` interface (`model: string`, `usage: TokenUsage`), `readNewUsageRecords(transcriptPath: string, fromByte: number): { records: UsageRecord[]; newOffset: number }`, from `src/services/transcript.ts`. Task 7 calls `readNewUsageRecords`.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/transcript.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, appendFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readNewUsageRecords } from '../src/services/transcript.js';

let dir: string;
let transcriptPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'almonds-transcript-'));
  transcriptPath = join(dir, 'session.jsonl');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const usageLine = (model: string, outputTokens: number) =>
  JSON.stringify({
    type: 'assistant',
    message: {
      model,
      usage: {
        input_tokens: 1,
        cache_creation_input_tokens: 2,
        cache_read_input_tokens: 3,
        output_tokens: outputTokens,
      },
    },
  });

describe('readNewUsageRecords', () => {
  it('reads every usage-bearing line from byte 0', () => {
    writeFileSync(transcriptPath, `${usageLine('claude-sonnet-5', 10)}\n${usageLine('claude-sonnet-5', 20)}\n`, 'utf8');

    const { records, newOffset } = readNewUsageRecords(transcriptPath, 0);

    expect(records).toHaveLength(2);
    expect(records[0].model).toBe('claude-sonnet-5');
    expect(records[0].usage.output_tokens).toBe(10);
    expect(records[1].usage.output_tokens).toBe(20);
    expect(newOffset).toBe(statSync(transcriptPath).size);
  });

  it('skips lines with no usage, such as a stop_hook_summary system line', () => {
    const noUsageLine = JSON.stringify({ type: 'system', subtype: 'stop_hook_summary' });
    writeFileSync(transcriptPath, `${noUsageLine}\n${usageLine('claude-sonnet-5', 5)}\n`, 'utf8');

    const { records } = readNewUsageRecords(transcriptPath, 0);

    expect(records).toHaveLength(1);
    expect(records[0].usage.output_tokens).toBe(5);
  });

  it('only reads bytes after fromByte, so a second call after new lines only sees the new ones', () => {
    writeFileSync(transcriptPath, `${usageLine('claude-sonnet-5', 10)}\n`, 'utf8');
    const first = readNewUsageRecords(transcriptPath, 0);
    expect(first.records).toHaveLength(1);

    appendFileSync(transcriptPath, `${usageLine('claude-sonnet-5', 20)}\n`, 'utf8');
    const second = readNewUsageRecords(transcriptPath, first.newOffset);

    expect(second.records).toHaveLength(1);
    expect(second.records[0].usage.output_tokens).toBe(20);
  });

  it('does not advance past a trailing partial (non-newline-terminated) line', () => {
    const completeLine = usageLine('claude-sonnet-5', 10);
    const partialLine = '{"type":"assistant","message":{"model":"claude-sonnet-5"';
    writeFileSync(transcriptPath, `${completeLine}\n${partialLine}`, 'utf8');

    const { records, newOffset } = readNewUsageRecords(transcriptPath, 0);

    expect(records).toHaveLength(1);
    expect(newOffset).toBe(Buffer.byteLength(`${completeLine}\n`, 'utf8'));
  });

  it('returns no records and the same offset when there are no new bytes', () => {
    writeFileSync(transcriptPath, `${usageLine('claude-sonnet-5', 10)}\n`, 'utf8');
    const size = statSync(transcriptPath).size;

    const { records, newOffset } = readNewUsageRecords(transcriptPath, size);

    expect(records).toHaveLength(0);
    expect(newOffset).toBe(size);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/transcript.test.ts`
Expected: FAIL with "Cannot find module '../src/services/transcript.js'".

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/services/transcript.ts
import { closeSync, openSync, readSync, statSync } from 'node:fs';
import type { TokenUsage } from '../types/usage.js';

export interface UsageRecord {
  model: string;
  usage: TokenUsage;
}

export interface ReadResult {
  records: UsageRecord[];
  newOffset: number;
}

interface RawTranscriptLine {
  message?: {
    model?: string;
    usage?: Partial<TokenUsage>;
  };
}

export function readNewUsageRecords(transcriptPath: string, fromByte: number): ReadResult {
  const size = statSync(transcriptPath).size;
  if (fromByte >= size) {
    return { records: [], newOffset: fromByte };
  }

  const length = size - fromByte;
  const buffer = Buffer.alloc(length);
  const fd = openSync(transcriptPath, 'r');
  readSync(fd, buffer, 0, length, fromByte);
  closeSync(fd);

  const chunk = buffer.toString('utf8');
  const lastNewline = chunk.lastIndexOf('\n');
  if (lastNewline === -1) {
    return { records: [], newOffset: fromByte };
  }

  const completeText = chunk.slice(0, lastNewline);
  const newOffset = fromByte + Buffer.byteLength(chunk.slice(0, lastNewline + 1), 'utf8');

  const records: UsageRecord[] = [];
  for (const line of completeText.split('\n')) {
    if (line.trim().length === 0) {
      continue;
    }
    let parsed: RawTranscriptLine;
    try {
      parsed = JSON.parse(line) as RawTranscriptLine;
    } catch {
      continue;
    }
    const usage = parsed.message?.usage;
    const model = parsed.message?.model;
    if (usage && typeof model === 'string') {
      records.push({
        model,
        usage: {
          input_tokens: usage.input_tokens ?? 0,
          cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
          cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
          output_tokens: usage.output_tokens ?? 0,
        },
      });
    }
  }

  return { records, newOffset };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/transcript.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/transcript.ts tests/transcript.test.ts
git commit -m "$(cat <<'EOF'
feat: incremental transcript reader for new usage records

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01A5wJySZYFDfDj9zP6Ppizi
EOF
)"
```

---

### Task 7: on-stop.ts (Stop hook)

**Files:**
- Create: `src/hooks/on-stop.ts`
- Test: `tests/on-stop.test.ts`

**Interfaces:**
- Consumes: `readNewUsageRecords` (Task 6), `estimateLiters` (Task 3), `appendEntry` and `pruneOldEntries` (Task 4), `readOffset` and `writeOffset` (Task 5), `LEDGER_RETENTION_DAYS` (Task 2), `LedgerEntry` (Task 1).
- Produces: `StopHookInput` interface (`session_id: string`, `transcript_path: string`), `StopHookPaths` interface (`ledgerPath: string`, `offsetDir: string`), `defaultPaths(): StopHookPaths`, `processStopEvent(input: StopHookInput, paths: StopHookPaths, now?: Date): void`. Task 9 wires this file's build output into `plugin.json`.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/on-stop.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { processStopEvent } from '../src/hooks/on-stop.js';
import { readAllEntries } from '../src/services/ledger.js';
import { readOffset } from '../src/services/offsets.js';

let dir: string;
let transcriptPath: string;
let ledgerPath: string;
let offsetDir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'almonds-on-stop-'));
  transcriptPath = join(dir, 'session.jsonl');
  ledgerPath = join(dir, 'state', 'ledger.jsonl');
  offsetDir = join(dir, 'state', 'offsets');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const usageLine = (outputTokens: number) =>
  JSON.stringify({
    message: {
      model: 'claude-sonnet-5',
      usage: { input_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: outputTokens },
    },
  });

describe('processStopEvent', () => {
  it('appends one ledger entry per usage-bearing line and advances the offset', () => {
    writeFileSync(transcriptPath, `${usageLine(1000)}\n${usageLine(2000)}\n`, 'utf8');
    const now = new Date('2026-09-08T12:00:00.000Z');

    processStopEvent({ session_id: 'session-a', transcript_path: transcriptPath }, { ledgerPath, offsetDir }, now);

    const entries = readAllEntries(ledgerPath);
    expect(entries).toHaveLength(2);
    expect(entries[0].session_id).toBe('session-a');
    expect(entries[0].model).toBe('claude-sonnet-5');
    expect(entries[0].ts).toBe(now.toISOString());
    expect(entries[0].liters).toBeGreaterThan(0);
    expect(readOffset(offsetDir, 'session-a')).toBeGreaterThan(0);
  });

  it('does not double-count on a second call with no new transcript bytes', () => {
    writeFileSync(transcriptPath, `${usageLine(1000)}\n`, 'utf8');
    const now = new Date('2026-09-08T12:00:00.000Z');
    const paths = { ledgerPath, offsetDir };

    processStopEvent({ session_id: 'session-a', transcript_path: transcriptPath }, paths, now);
    processStopEvent({ session_id: 'session-a', transcript_path: transcriptPath }, paths, now);

    expect(readAllEntries(ledgerPath)).toHaveLength(1);
  });

  it('keeps offsets independent across sessions sharing one ledger', () => {
    const transcriptB = join(dir, 'session-b.jsonl');
    writeFileSync(transcriptPath, `${usageLine(1000)}\n`, 'utf8');
    writeFileSync(transcriptB, `${usageLine(500)}\n`, 'utf8');
    const now = new Date('2026-09-08T12:00:00.000Z');
    const paths = { ledgerPath, offsetDir };

    processStopEvent({ session_id: 'session-a', transcript_path: transcriptPath }, paths, now);
    processStopEvent({ session_id: 'session-b', transcript_path: transcriptB }, paths, now);

    const entries = readAllEntries(ledgerPath);
    expect(entries.map((e) => e.session_id).sort()).toEqual(['session-a', 'session-b']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/on-stop.test.ts`
Expected: FAIL with "Cannot find module '../src/hooks/on-stop.js'".

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/hooks/on-stop.ts
import { homedir } from 'node:os';
import { join } from 'node:path';
import { LEDGER_RETENTION_DAYS } from '../config/constants.js';
import { estimateLiters } from '../services/estimate.js';
import { appendEntry, pruneOldEntries } from '../services/ledger.js';
import { readOffset, writeOffset } from '../services/offsets.js';
import { readNewUsageRecords } from '../services/transcript.js';
import type { LedgerEntry } from '../types/usage.js';

export interface StopHookInput {
  session_id: string;
  transcript_path: string;
}

export interface StopHookPaths {
  ledgerPath: string;
  offsetDir: string;
}

export function defaultPaths(): StopHookPaths {
  const base = join(homedir(), '.claude', 'almonds');
  return {
    ledgerPath: join(base, 'ledger.jsonl'),
    offsetDir: join(base, 'offsets'),
  };
}

export function processStopEvent(input: StopHookInput, paths: StopHookPaths, now: Date = new Date()): void {
  const fromByte = readOffset(paths.offsetDir, input.session_id);
  const { records, newOffset } = readNewUsageRecords(input.transcript_path, fromByte);

  for (const record of records) {
    const entry: LedgerEntry = {
      ts: now.toISOString(),
      session_id: input.session_id,
      model: record.model,
      liters: estimateLiters(record.usage, record.model),
    };
    appendEntry(paths.ledgerPath, entry);
  }

  writeOffset(paths.offsetDir, input.session_id, newOffset);
  pruneOldEntries(paths.ledgerPath, LEDGER_RETENTION_DAYS, now);
}

function main(): void {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    raw += chunk;
  });
  process.stdin.on('end', () => {
    const input = JSON.parse(raw) as StopHookInput;
    processStopEvent(input, defaultPaths());
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/on-stop.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/on-stop.ts tests/on-stop.test.ts
git commit -m "$(cat <<'EOF'
feat: Stop hook writes incremental usage to the ledger

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01A5wJySZYFDfDj9zP6Ppizi
EOF
)"
```

---

### Task 8: statusline.ts

**Files:**
- Create: `src/cli/statusline.ts`
- Test: `tests/statusline.test.ts`

**Interfaces:**
- Consumes: `readAllEntries` (Task 4), `TSP_PER_LITER`/`GAL_PER_LITER`/`LITERS_PER_ALMOND` (Task 2), `LedgerEntry` (Task 1).
- Produces: `computeTotals(entries: LedgerEntry[], now: Date): { dayLiters: number; weekLiters: number }`, `formatAlmonds(n: number): string`, `formatStatusLine(dayLiters: number, weekLiters: number): string`. Task 9 wires this file's build output into the README's `statusLine.command` instructions.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/statusline.test.ts
import { describe, it, expect } from 'vitest';
import { computeTotals, formatAlmonds, formatStatusLine } from '../src/cli/statusline.js';
import type { LedgerEntry } from '../src/types/usage.js';

// computeTotals's "Day" boundary is local midnight; pin the test process to
// UTC so the UTC-labeled timestamps below land on the same calendar day the
// assertions expect, regardless of the machine running the test.
process.env.TZ = 'UTC';

describe('computeTotals', () => {
  it('sums entries within each window across every session_id', () => {
    const now = new Date('2026-09-08T18:00:00.000Z');
    const entries: LedgerEntry[] = [
      { ts: '2026-09-08T01:00:00.000Z', session_id: 's1', model: 'claude-sonnet-5', liters: 1 },
      { ts: '2026-09-08T10:00:00.000Z', session_id: 's2', model: 'claude-sonnet-5', liters: 2 },
      { ts: '2026-09-06T10:00:00.000Z', session_id: 's3', model: 'claude-sonnet-5', liters: 4 },
      { ts: '2026-08-01T10:00:00.000Z', session_id: 's4', model: 'claude-sonnet-5', liters: 100 },
    ];

    const { dayLiters, weekLiters } = computeTotals(entries, now);

    expect(dayLiters).toBeCloseTo(3, 10);
    expect(weekLiters).toBeCloseTo(7, 10);
  });

  it('returns zero for both windows with no entries', () => {
    expect(computeTotals([], new Date('2026-09-08T18:00:00.000Z'))).toEqual({ dayLiters: 0, weekLiters: 0 });
  });
});

describe('formatAlmonds', () => {
  it('rounds to a whole number below 10', () => {
    expect(formatAlmonds(0.0028)).toBe('0');
    expect(formatAlmonds(9.6)).toBe('10');
  });

  it('keeps one decimal at or above 10', () => {
    expect(formatAlmonds(10)).toBe('10.0');
    expect(formatAlmonds(150.37)).toBe('150.4');
  });
});

describe('formatStatusLine', () => {
  it('renders the exact display format', () => {
    // dayLiters -> tsp: 0.01 * 202.9 = 2.029 -> "2.0"; almonds: 0.01 / 6.2 = 0.0016 -> "0"
    // weekLiters -> gal: 5 * 0.264172 = 1.32086 -> "1.3"; almonds: 5 / 6.2 = 0.8065 -> "1"
    const line = formatStatusLine(0.01, 5);
    expect(line).toBe('🥜 Day: 2.0 tsp = 0 almonds · Week: 1.3 gal = 1 almonds');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/statusline.test.ts`
Expected: FAIL with "Cannot find module '../src/cli/statusline.js'".

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/cli/statusline.ts
import { homedir } from 'node:os';
import { join } from 'node:path';
import { GAL_PER_LITER, LITERS_PER_ALMOND, TSP_PER_LITER } from '../config/constants.js';
import { readAllEntries } from '../services/ledger.js';
import type { LedgerEntry } from '../types/usage.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function computeTotals(entries: LedgerEntry[], now: Date): { dayLiters: number; weekLiters: number } {
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

export function formatAlmonds(n: number): string {
  return n < 10 ? String(Math.round(n)) : n.toFixed(1);
}

export function formatStatusLine(dayLiters: number, weekLiters: number): string {
  const dayTsp = (dayLiters * TSP_PER_LITER).toFixed(1);
  const weekGal = (weekLiters * GAL_PER_LITER).toFixed(1);
  const dayAlmonds = formatAlmonds(dayLiters / LITERS_PER_ALMOND);
  const weekAlmonds = formatAlmonds(weekLiters / LITERS_PER_ALMOND);
  return `🥜 Day: ${dayTsp} tsp = ${dayAlmonds} almonds · Week: ${weekGal} gal = ${weekAlmonds} almonds`;
}

function main(): void {
  const ledgerPath = join(homedir(), '.claude', 'almonds', 'ledger.jsonl');
  const entries = readAllEntries(ledgerPath);
  const { dayLiters, weekLiters } = computeTotals(entries, new Date());
  process.stdout.write(formatStatusLine(dayLiters, weekLiters));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/statusline.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/cli/statusline.ts tests/statusline.test.ts
git commit -m "$(cat <<'EOF'
feat: statusline renders cross-session Day/Week almond totals

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01A5wJySZYFDfDj9zP6Ppizi
EOF
)"
```

---

### Task 9: Plugin wiring, SOURCES.md, README.md

**Files:**
- Create: `plugin.json`
- Create: `SOURCES.md`
- Create: `README.md`
- Test: manual (`pnpm build` + a real Stop-hook/statusline dry run), no new `tests/*.test.ts` file — this task wires already-tested code, it does not add new logic.

**Interfaces:**
- Consumes: the built output of Task 7 (`dist/hooks/on-stop.js`) and Task 8 (`dist/cli/statusline.js`).
- Produces: nothing new for later tasks (this is the last task).

- [ ] **Step 1: Write `plugin.json`**

```json
{
  "name": "eat-less-almonds",
  "displayName": "Eat Less Almonds",
  "version": "0.1.0",
  "description": "Shows AI water usage in your status bar, converted to almonds.",
  "author": "James Villarrubia",
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/dist/hooks/on-stop.js\""
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 2: Write `SOURCES.md`**

```markdown
# Sources

Every constant lives in `src/config/constants.ts`. This file explains where
each one comes from and works the example the tests check against.

## Energy per token

- `OUTPUT_JOULES_PER_TOKEN = 1.8`: mid-range of empirical LLM-inference
  energy-per-token measurements (roughly 0.0001-0.002 Wh/token across
  published benchmarks; 1.8 J/token is the midpoint, ~5e-4 Wh/token).
- `INPUT_ENERGY_RATIO = 0.3` and `CACHE_READ_ENERGY_RATIO = 0.1`: **not
  citations, documented assumptions.** Prefill/encoding is cheaper per
  token than autoregressive decode, and a KV-cache hit is a memory lookup
  rather than a full forward pass. No public per-bucket breakdown exists
  to cite directly; these ratios are this project's own estimate.

## Data-center and grid water

- `ANTHROPIC_DC_WUE_L_PER_KWH = 0.15`: AWS's reported water-usage-
  effectiveness at the Project Rainier campus in New Carlisle, Indiana,
  the facility where Anthropic trains and serves Claude on over a million
  Trainium2 chips.
- `FALLBACK_DC_WUE_L_PER_KWH = 1.9`: industry-average data center WUE,
  used for any non-Anthropic model, since there is no equivalent named
  facility to cite for an arbitrary provider.
- `GRID_WATER_L_PER_KWH = 1.8`: EIA/USGS average US thermoelectric
  consumptive water use (water evaporated per kWh of electricity
  generated), on top of data-center cooling water.

## Almonds

- `LITERS_PER_ALMOND = 6.2`: the blue-water-only share of a California
  almond's water footprint. A study commissioned by the Almond Board of
  California (Fulton et al., "Water-indexed benefits and impacts of
  California almonds") splits the almond water footprint into blue
  (irrigation) 635 gal/lb, green (rain) 68 gal/lb, and grey (pollutant
  dilution) 526 gal/lb, of 1,229 gal/lb total: blue water is 51.6% of the
  total. A data center's cooling and grid-generation water draw is
  physically withdrawn blue water, not a pollutant-dilution figure and
  not rainfall, so this project compares like to like: the almond's
  blue-water share alone, `12 L/almond total * 0.516 = 6.2 L/almond`. The
  popular "1 gallon" or "12 liter" total-footprint figures most sources
  quote are the un-adjusted number; this project's figure is
  deliberately lower, for the reason above, not by mistake.

  California grows roughly 80% of the world's almonds, in a Central
  Valley basin where about 75% of the state's rainfall falls north of
  Sacramento. The almond's low green-water share (5.5% of its total
  footprint) is the same underlying fact as the region's water stress:
  there is little rain to grow it on.

## Regional spread (context, not used in the computed number)

This project's formula uses one fixed constant per side. The spread below
exists to make one point: neither AI infrastructure nor almond farming is
uniformly water-heavy. Where and how it is built decides that.

- **AI side.** Measured worst case: data centers in Arizona have recorded
  peak monthly WUE above 9 L/kWh (hot climate, evaporative cooling). Best
  case: Microsoft's and Oracle's newer closed-loop, non-evaporative,
  direct-to-chip designs report WUE near 0 (the loop fills once, then
  recirculates with no ongoing evaporation). This project's own figure,
  0.15 L/kWh, sits well toward the good end but is not the best possible.
- **Almond side.** California's intensively irrigated orchards require
  roughly 12,000-13,000 m³/ha. Spain's traditional Mediterranean rainfed
  (dry-farmed) orchards require roughly 8,500 m³/ha and draw far more of
  that from green water, though Spain's newer high-density orchards are
  shifting toward irrigation too.

## Worked example

Given `{ input_tokens: 2, cache_creation_input_tokens: 2367,
cache_read_input_tokens: 106518, output_tokens: 6240 }` on
`claude-sonnet-5`:

```
output:         6240 * 1.8               = 11232 J
input:             2 * 1.8 * 0.3          =  1.08 J
cache_creation: 2367 * 1.8 * 0.3          = 1278.18 J
cache_read:   106518 * 1.8 * 0.1          = 19173.24 J
total:                                      31684.5 J = 0.00880125 kWh
liters:  0.00880125 * (0.15 + 1.8)        = 0.0171624375 L
almonds: 0.0171624375 / 6.2               = 0.00277 almonds
```

`tests/estimate.test.ts` asserts this exact value.
```

- [ ] **Step 3: Write `README.md`**

```markdown
# eat-less-almonds

Shows AI water usage in your Claude Code status bar, converted to
almonds: `🥜 Day: 3.5 tsp = 1 almonds · Week: 2.4 gal = 150 almonds`.

"Day" and "Week" cover every Claude Code session on this machine, across
every project and every account, not just the one the status bar happens
to be running in.

Every constant behind the number is cited or flagged as an assumption in
[`SOURCES.md`](./SOURCES.md). This is a playful estimate, not a
measurement Anthropic or AWS publishes; it exists to make a point about
where AI's water use is worst and best, not to be exact.

## Install

```bash
git clone <this repo>
cd eat-less-almonds
pnpm install
pnpm build
```

Then add the plugin to Claude Code (`claude plugin add ./eat-less-almonds`
or your usual local-plugin flow) so its `Stop` hook starts recording
usage.

## Point your status bar at it

Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /absolute/path/to/eat-less-almonds/dist/cli/statusline.js"
  }
}
```

Already have a `statusLine.command`? Chain them in a small wrapper
script instead of replacing it:

```bash
#!/usr/bin/env bash
your-existing-statusline-command
printf ' · '
node /absolute/path/to/eat-less-almonds/dist/cli/statusline.js
```

Point `statusLine.command` at that wrapper script instead.

## Why the numbers are what they are

Short version: a data center's water draw is blue water (physically
withdrawn), so this project compares it to the blue-water share of a
California almond's footprint (6.2 L), not the popular blended
green+blue+grey figure (~12 L) that most "gallons per almond" claims
quote. Full reasoning and every citation: [`SOURCES.md`](./SOURCES.md).
```

- [ ] **Step 4: Build and smoke-test**

Run: `pnpm build`
Expected: exits 0; `dist/hooks/on-stop.js` and `dist/cli/statusline.js` both exist.

Run: `pnpm test`
Expected: all tests still PASS (this task added no test files, so the count should match Task 8's final count).

Manual smoke test (real end-to-end run against a scratch ledger, not `~/.claude/almonds`):

```bash
mkdir -p /tmp/almonds-smoke
cat > /tmp/almonds-smoke/session.jsonl <<'EOF'
{"message":{"model":"claude-sonnet-5","usage":{"input_tokens":2,"cache_creation_input_tokens":2367,"cache_read_input_tokens":106518,"output_tokens":6240}}}
EOF
echo '{"session_id":"smoke-1","transcript_path":"/tmp/almonds-smoke/session.jsonl"}' \
  | HOME=/tmp/almonds-smoke node dist/hooks/on-stop.js
cat /tmp/almonds-smoke/.claude/almonds/ledger.jsonl
HOME=/tmp/almonds-smoke node dist/cli/statusline.js
rm -rf /tmp/almonds-smoke
```

Expected: the ledger file has one line with `"session_id":"smoke-1"` and a
`liters` value near `0.0171624375`; the statusline command prints a line
starting with `🥜 Day:` whose numbers are consistent with that single
entry (Week will show the same total, since it is the only entry and
falls within both windows).

- [ ] **Step 5: Commit**

```bash
git add plugin.json SOURCES.md README.md
git commit -m "$(cat <<'EOF'
docs: plugin manifest, sources, and install instructions

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01A5wJySZYFDfDj9zP6Ppizi
EOF
)"
```

---

## Post-plan (not a task)

`reqts/eat-less-almonds-design.md`'s "Open questions" (public plugin name,
whether to auto-chain an existing `statusLine.command`) and "Future
extensions" (the visual HTML report bracketing usage between best/worst
regional examples) stay open. Neither blocks this plan; both are follow-up
work once this ships and is used for a few days.
