import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function readOffset(offsetDir: string, sessionId: string): number {
  const filePath = join(offsetDir, sessionId);
  if (!existsSync(filePath)) {
    return 0;
  }
  const content = readFileSync(filePath, 'utf8').trim();
  if (content.length === 0) {
    return 0;
  }
  const parsed = Number(content);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function writeOffset(offsetDir: string, sessionId: string, byteOffset: number): void {
  mkdirSync(offsetDir, { recursive: true });
  writeFileSync(join(offsetDir, sessionId), String(byteOffset), 'utf8');
}
