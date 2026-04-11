/**
 * Reader + normalizer for persisted Claude Code transcript JSONL files
 * at transcript_path. Bridges the envelope format {type, message, timestamp}
 * to the flat TranscriptMessage shape used by trace-extract extractors, and
 * harvests authoritative metadata (real model, usage, timestamps) that would
 * otherwise have to be estimated.
 */

import type { ContentBlock, TranscriptMessage } from "./trace-extract";

export type { AuthoritativeMetadata } from "./trace-persisted-meta";
export {
  extractAuthoritativeMetadata,
  normalizeModelName,
} from "./trace-persisted-meta";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asContent(value: unknown): string | ContentBlock[] | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value as ContentBlock[];
  return null;
}

function safeJsonParse(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return undefined;
  }
}

function parseJsonlLines(content: string): unknown[] {
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  const entries: unknown[] = [];
  for (const line of lines) {
    const parsed = safeJsonParse(line);
    if (parsed !== undefined) entries.push(parsed);
  }
  return entries;
}

/**
 * Reads a persisted transcript JSONL file. Returns the raw parsed entries
 * (envelope shape, not normalized). Silently skips malformed lines.
 * Returns [] if the file does not exist or cannot be read.
 */
export async function readRawTranscriptFromPath(
  transcriptPath: string,
): Promise<unknown[]> {
  try {
    const file = Bun.file(transcriptPath);
    if (!(await file.exists())) return [];
    const content = await file.text();
    return parseJsonlLines(content);
  } catch {
    return [];
  }
}

function normalizeFlatEntry(
  raw: Record<string, unknown>,
): TranscriptMessage | null {
  if (typeof raw.role !== "string") return null;
  if (raw.content === undefined) return null;
  const content = asContent(raw.content);
  if (content === null) return null;
  return { role: raw.role, content };
}

function normalizeEnvelopeEntry(
  raw: Record<string, unknown>,
): TranscriptMessage | null {
  const type = raw.type;
  if (type !== "user" && type !== "assistant") return null;
  if (!isObject(raw.message)) return null;
  const message = raw.message;
  const role = typeof message.role === "string" ? message.role : type;
  const content = asContent(message.content);
  if (content === null) return null;
  return { role, content };
}

/**
 * Converts a raw transcript entry into the flat TranscriptMessage shape.
 * Handles BOTH:
 *   - Envelope format: {type: "user"|"assistant", message: {role, content, ...}, ...}
 *   - Legacy flat format: {role, content}
 * Returns null for meta entries (permission-mode, file-history-snapshot, progress, etc.)
 * or anything that cannot be normalized.
 */
export function normalizeTranscriptEntry(
  raw: unknown,
): TranscriptMessage | null {
  if (!isObject(raw)) return null;
  const flat = normalizeFlatEntry(raw);
  if (flat !== null) return flat;
  return normalizeEnvelopeEntry(raw);
}

