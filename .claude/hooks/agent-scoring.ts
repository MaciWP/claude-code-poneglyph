#!/usr/bin/env bun

/**
 * SubagentStop hook: records agent performance scores in real-time.
 * Fires when a subagent completes. Best-effort — always exits 0.
 *
 * SubagentStop hooks receive JSON via stdin with:
 *   - session_id: string
 *   - agent_id: string
 *   - agent_transcript_path: string  (path to JSONL transcript file)
 *   - tool_use_id: string
 */

import { readFileSync } from "node:fs";
import { updateScores } from "./lib/agent-scorer";
import type { ResolvedTraceEntry } from "./lib/agent-scorer-types";
import { extractMemoryInsights, persistMemory } from "./lib/memory-writer";
import type { TranscriptMessage } from "./lib/memory-writer";
import { readHookStdin } from "./lib/hook-stdin";

const TAG = "[agent-scoring]";

export const KNOWN_AGENTS = [
  "builder",
  "reviewer",
  "planner",
  "scout",
  "error-analyzer",
  "extension-architect",
  "architect",
  "command-loader",
  "general-purpose",
  "Explore",
  "Plan",
];

export const ERROR_KEYWORDS = [
  "error",
  "failed",
  "exception",
  "traceback",
  "panic",
  "abort",
  "timeout",
];

export interface SubagentStopInput {
  session_id?: string;
  agent_id?: string;
  agent_type?: string;
  agent_transcript_path?: string;
  tool_use_id?: string;
  last_assistant_message?: string;
  stop_hook_active?: boolean;
  [key: string]: unknown;
}

export interface TranscriptLine {
  role?: string;
  content?: unknown;
  timestamp?: string;
  [key: string]: unknown;
}

function log(message: string): void {
  process.stderr.write(`${TAG} ${message}\n`);
}

function fmtErr(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function parseJsonLine(line: string): TranscriptLine | null {
  try {
    return JSON.parse(line) as TranscriptLine;
  } catch {
    return null;
  }
}

export function parseTranscript(transcriptPath: string): TranscriptLine[] {
  const content = readFileSync(transcriptPath, "utf-8");
  const parsed = content.split("\n").map(parseJsonLine);
  return parsed.filter((l): l is TranscriptLine => l !== null);
}

export function extractAgentType(agentId: string): string | null {
  const lower = agentId.toLowerCase();
  // Sort by length descending so "extension-architect" wins over "architect"
  const sorted = [...KNOWN_AGENTS].sort((a, b) => b.length - a.length);
  const match = sorted.find((name) => lower.includes(name.toLowerCase()));
  return match !== undefined ? match : null;
}

export function normalizeAgentType(rawAgentType: string, agentId: string): string | null {
  if (rawAgentType.trim() !== "" && KNOWN_AGENTS.includes(rawAgentType.trim())) {
    return rawAgentType.trim();
  }
  if (rawAgentType.trim() !== "") {
    const fromRaw = extractAgentType(rawAgentType);
    if (fromRaw) return fromRaw;
  }
  return extractAgentType(agentId);
}

function contentBlockCount(line: TranscriptLine): number {
  if (Array.isArray(line.content)) return line.content.length;
  if (line.content != null) return 1;
  return 0;
}

export function countContentBlocks(lines: TranscriptLine[]): number {
  let count = 0;
  for (const line of lines) {
    count += contentBlockCount(line);
  }
  return count;
}

export function isToolUseBlock(block: unknown): boolean {
  return typeof block === "object" && block !== null && (block as { type?: string }).type === "tool_use";
}

export function countToolCallsInTranscript(lines: TranscriptLine[]): number {
  let count = 0;
  for (const line of lines) {
    if (!Array.isArray(line.content)) continue;
    count += (line.content as unknown[]).filter(isToolUseBlock).length;
  }
  return count;
}

export function parseTimestamp(line: TranscriptLine): number {
  if (typeof line.timestamp !== "string") return NaN;
  return Date.parse(line.timestamp);
}

export function extractDurationMs(lines: TranscriptLine[]): number {
  const timestamps = lines.map(parseTimestamp).filter((t) => !Number.isNaN(t));
  if (timestamps.length < 2) return 0;
  return Math.max(...timestamps) - Math.min(...timestamps);
}

export function hasErrorContent(contentStr: string): boolean {
  return ERROR_KEYWORDS.some((kw) => contentStr.includes(kw));
}

export function detectAgentStatus(lines: TranscriptLine[]): string {
  if (lines.length === 0) return "unknown";
  const last = lines[lines.length - 1];
  const contentStr = JSON.stringify(last.content != null ? last.content : "").toLowerCase();
  return hasErrorContent(contentStr) ? "error" : "success";
}

export function buildResolvedEntry(
  input: SubagentStopInput,
  lines: TranscriptLine[],
  agentType: string,
): ResolvedTraceEntry {
  const { session_id: sessionId = "unknown" } = input;
  const tokenCount = countContentBlocks(lines);
  return {
    ts: new Date().toISOString(),
    sessionId,
    prompt: "unknown",
    agents: [agentType],
    skills: [],
    tokens: tokenCount,
    inputTokens: Math.floor(tokenCount * 0.6),
    outputTokens: Math.floor(tokenCount * 0.4),
    costUsd: 0,
    durationMs: extractDurationMs(lines),
    model: "unknown",
    status: detectAgentStatus(lines),
    toolCalls: countToolCallsInTranscript(lines),
    filesChanged: 0,
  };
}

function extractRunInputs(input: SubagentStopInput): { agentId: string; transcriptPath: string; agentType: string } {
  const { agent_id: agentId = "", agent_transcript_path: transcriptPath = "", agent_type: agentType = "" } = input;
  return { agentId, transcriptPath, agentType };
}

async function run(): Promise<void> {
  const raw = await readHookStdin();
  if (!raw.trim()) return;

  const input: SubagentStopInput = JSON.parse(raw);
  if (input.stop_hook_active === true) return;

  const { agentId, transcriptPath, agentType: rawAgentType } = extractRunInputs(input);

  if (!transcriptPath) {
    log(`No agent_transcript_path for agent ${agentId}, skipping`);
    return;
  }

  const lines = parseTranscript(transcriptPath);
  const agentType = normalizeAgentType(rawAgentType, agentId);
  if (!agentType) {
    log(`[agent-scoring] skipped unknown agentType: rawAgentType=${rawAgentType} agentId=${agentId}`);
    return;
  }
  const entry = buildResolvedEntry(input, lines, agentType);

  updateScores([entry]);
  log(`Scored ${agentType}: status=${entry.status}, tools=${entry.toolCalls}, tokens=${entry.tokens}`);

  try {
    let insights = extractMemoryInsights(lines as TranscriptMessage[]);

    if (!insights && typeof input.last_assistant_message === "string") {
      insights = extractMemoryInsights([{ role: "assistant", content: input.last_assistant_message }]);
    }

    if (insights) {
      const { session_id: sessionId = "unknown" } = input;
      persistMemory(agentType, sessionId, insights);
      log(`Persisted memory for ${agentType}`);
    }
  } catch (err) {
    log(`Memory extraction failed: ${fmtErr(err)}`);
  }
}

if (import.meta.main) {
  run().catch((err) => log(`Failed: ${fmtErr(err)}`)).finally(() => process.exit(0));
}
