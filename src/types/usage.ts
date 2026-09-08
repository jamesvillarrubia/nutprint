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
