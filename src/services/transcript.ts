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
