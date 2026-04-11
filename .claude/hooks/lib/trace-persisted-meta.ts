/**
 * Authoritative metadata extraction helpers for persisted transcripts.
 * Split from trace-persisted.ts to keep cyclomatic complexity per file low.
 */

export interface AuthoritativeMetadata {
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  durationMs: number | null;
}

interface UsageSum {
  inputTokens: number;
  outputTokens: number;
  hasUsage: boolean;
}

interface TsRange {
  firstTs: number | null;
  lastTs: number | null;
}

interface ExtractState {
  model: string | null;
  usage: UsageSum;
  range: TsRange;
}

const MODEL_PATTERNS: Array<[RegExp, string]> = [
  [/opus/i, "opus"],
  [/haiku/i, "haiku"],
  [/sonnet/i, "sonnet"],
];

const INPUT_TOKEN_FIELDS = [
  "input_tokens",
  "cache_creation_input_tokens",
  "cache_read_input_tokens",
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

export function normalizeModelName(raw: string): string {
  for (const [pattern, name] of MODEL_PATTERNS) {
    if (pattern.test(raw)) return name;
  }
  return "sonnet";
}

function parseEntryTimestamp(entry: Record<string, unknown>): number | null {
  const raw = entry.timestamp;
  if (typeof raw !== "string") return null;
  const ts = Date.parse(raw);
  return Number.isNaN(ts) ? null : ts;
}

function minOrSelf(current: number | null, ts: number): number {
  return current === null ? ts : Math.min(current, ts);
}

function maxOrSelf(current: number | null, ts: number): number {
  return current === null ? ts : Math.max(current, ts);
}

function updateTsRange(range: TsRange, ts: number): void {
  range.firstTs = minOrSelf(range.firstTs, ts);
  range.lastTs = maxOrSelf(range.lastTs, ts);
}

function sumInputTokens(usage: Record<string, unknown>): number {
  let total = 0;
  for (const field of INPUT_TOKEN_FIELDS) {
    total += numberOr(usage[field], 0);
  }
  return total;
}

function usageHasAnyNumber(usage: Record<string, unknown>): boolean {
  for (const field of INPUT_TOKEN_FIELDS) {
    if (typeof usage[field] === "number") return true;
  }
  return typeof usage.output_tokens === "number";
}

function sumUsageInto(usage: Record<string, unknown>, acc: UsageSum): void {
  if (usageHasAnyNumber(usage)) acc.hasUsage = true;
  acc.inputTokens += sumInputTokens(usage);
  acc.outputTokens += numberOr(usage.output_tokens, 0);
}

function extractModelFromMessage(
  message: Record<string, unknown>,
): string | null {
  const raw = message.model;
  return typeof raw === "string" ? normalizeModelName(raw) : null;
}

function processAssistantEntry(
  entry: Record<string, unknown>,
  usage: UsageSum,
): string | null {
  const message = entry.message;
  if (!isObject(message)) return null;
  const model = extractModelFromMessage(message);
  if (isObject(message.usage)) sumUsageInto(message.usage, usage);
  return model;
}

function finalizeDuration(range: TsRange): number | null {
  const { firstTs, lastTs } = range;
  if (firstTs === null || lastTs === null) return null;
  return lastTs > firstTs ? lastTs - firstTs : null;
}

function applyTimestamp(entry: Record<string, unknown>, range: TsRange): void {
  const ts = parseEntryTimestamp(entry);
  if (ts !== null) updateTsRange(range, ts);
}

function processEntry(entry: unknown, state: ExtractState): void {
  if (!isObject(entry)) return;
  applyTimestamp(entry, state.range);
  if (entry.type !== "assistant") return;
  const maybeModel = processAssistantEntry(entry, state.usage);
  if (maybeModel !== null) state.model = maybeModel;
}

function createState(): ExtractState {
  return {
    model: null,
    usage: { inputTokens: 0, outputTokens: 0, hasUsage: false },
    range: { firstTs: null, lastTs: null },
  };
}

/**
 * Extracts real metadata from raw entries. Prefers authoritative values:
 *   - message.model (normalized to opus/sonnet/haiku)
 *   - message.usage.{input_tokens, cache_creation_input_tokens, cache_read_input_tokens, output_tokens}
 *   - entry.timestamp (first / last delta)
 * Returns nulls for fields without data so callers can fall back to estimates.
 */
export function extractAuthoritativeMetadata(
  rawEntries: unknown[],
): AuthoritativeMetadata {
  const state = createState();
  for (const entry of rawEntries) processEntry(entry, state);

  return {
    model: state.model,
    inputTokens: state.usage.hasUsage ? state.usage.inputTokens : null,
    outputTokens: state.usage.hasUsage ? state.usage.outputTokens : null,
    durationMs: finalizeDuration(state.range),
  };
}
