/**
 * Trace metric calculation functions.
 * Computes tokens, cost, duration, status, and tool usage from transcripts.
 */

import type { TranscriptMessage, ContentBlock } from "./trace-extract";
import {
  getContentLength,
  getAssistantBlocks,
  getMessageText,
} from "./trace-extract";

export const MODEL_PRICING: Record<string, { input: number; output: number }> =
  {
    opus: { input: 15.0 / 1_000_000, output: 75.0 / 1_000_000 },
    sonnet: { input: 3.0 / 1_000_000, output: 15.0 / 1_000_000 },
    haiku: { input: 0.25 / 1_000_000, output: 1.25 / 1_000_000 },
  };

const ERROR_PATTERN =
  /error:|exception:|failed to|ENOENT|EACCES|TypeError|ReferenceError|SyntaxError|cannot find module|compilation failed/i;
const TIMEOUT_PATTERN = /timeout|timed out|deadline exceeded/i;
const INPUT_ROLES: Record<string, boolean> = { user: true, tool_result: true };
const CHARS_PER_TOKEN = 4;
const TOKENS_PER_SECOND = 80;
const FILE_CHANGE_TOOLS: Record<string, boolean> = { Edit: true, Write: true };

export function estimateTokens(transcript: TranscriptMessage[]): {
  inputTokens: number;
  outputTokens: number;
} {
  let inputChars = 0;
  let outputChars = 0;

  for (const msg of transcript) {
    const len = getContentLength(msg.content);
    if (INPUT_ROLES[msg.role]) {
      inputChars += len;
    } else if (msg.role === "assistant") {
      outputChars += len;
    }
  }

  return {
    inputTokens: Math.ceil(inputChars / CHARS_PER_TOKEN),
    outputTokens: Math.ceil(outputChars / CHARS_PER_TOKEN),
  };
}

export function detectModel(transcript: TranscriptMessage[]): string {
  for (const msg of transcript) {
    const text = getMessageText(msg.content);
    if (/opus/i.test(text)) return "opus";
    if (/haiku/i.test(text)) return "haiku";
  }
  return "sonnet";
}

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: string,
): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING.sonnet;
  return inputTokens * pricing.input + outputTokens * pricing.output;
}

export function calculateDuration(tokens: number): number {
  if (tokens <= 0) return 0;
  return Math.round((tokens / TOKENS_PER_SECOND) * 1000);
}

export function detectStatus(
  transcript: TranscriptMessage[],
  lastAssistantMessage: string,
): string {
  const text = lastAssistantMessage || "";
  if (TIMEOUT_PATTERN.test(text)) return "timeout";
  if (ERROR_PATTERN.test(text)) return "error";
  if (!transcript.length) return "unknown";
  return "completed";
}

export function countToolCalls(transcript: TranscriptMessage[]): number {
  const blocks = getAssistantBlocks(transcript);
  let count = 0;
  for (const block of blocks) {
    if (block.type === "tool_use") count++;
  }
  return count;
}

export function countFilesChanged(transcript: TranscriptMessage[]): number {
  const blocks = getAssistantBlocks(transcript);
  const files = new Set<string>();
  for (const block of blocks) {
    if (block.type !== "tool_use") continue;
    if (!FILE_CHANGE_TOOLS[block.name || ""]) continue;
    const fp = block.input ? block.input.file_path : undefined;
    if (typeof fp === "string") files.add(fp);
  }
  return files.size;
}
