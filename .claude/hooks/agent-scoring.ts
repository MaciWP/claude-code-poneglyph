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

const TAG = "[agent-scoring]";

const KNOWN_AGENTS = [
  "builder",
  "reviewer",
  "planner",
  "scout",
  "error-analyzer",
  "architect",
  // command-loader is included for scoring but won't produce Memory Insights
  // (no Memory Persistence section in its agent definition — intentionally excluded as mechanical agent)
  "command-loader",
];

const ERROR_KEYWORDS = [
  "error",
  "failed",
  "exception",
  "traceback",
  "panic",
  "abort",
  "timeout",
];

interface SubagentStopInput {
  session_id?: string;
  agent_id?: string;
  agent_type?: string;
  agent_transcript_path?: string;
  tool_use_id?: string;
  last_assistant_message?: string;
  stop_hook_active?: boolean;
  [key: string]: unknown;
}

interface TranscriptLine {
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

async function consumeStdin(): Promise<string> {
  return new Promise((resolve) => {
    const chunks: string[] = [];
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk: string) => { chunks.push(chunk); });
    process.stdin.on("end", () => resolve(chunks.join("")));
    process.stdin.on("error", () => resolve(""));
    process.stdin.resume();
  });
}

function parseJsonLine(line: string): TranscriptLine | null {
  try {
    return JSON.parse(line) as TranscriptLine;
  } catch {
    return null;
  }
}

function parseTranscript(transcriptPath: string): TranscriptLine[] {
  const content = readFileSync(transcriptPath, "utf-8");
  const parsed = content.split("\n").map(parseJsonLine);
  return parsed.filter((l): l is TranscriptLine => l !== null);
}

function extractAgentType(agentId: string): string {
  const lower = agentId.toLowerCase();
  const match = KNOWN_AGENTS.find((name) => lower.includes(name));
  return match !== undefined ? match : agentId;
}

function countContentBlocks(lines: TranscriptLine[]): number {
  let count = 0;
  for (const line of lines) {
    count += Array.isArray(line.content) ? line.content.length : (line.content != null ? 1 : 0);
  }
  return count;
}

function isToolUseBlock(block: unknown): boolean {
  return typeof block === "object" && block !== null && (block as { type?: string }).type === "tool_use";
}

function countToolCallsInTranscript(lines: TranscriptLine[]): number {
  let count = 0;
  for (const line of lines) {
    if (!Array.isArray(line.content)) continue;
    count += (line.content as unknown[]).filter(isToolUseBlock).length;
  }
  return count;
}

function parseTimestamp(line: TranscriptLine): number {
  if (typeof line.timestamp !== "string") return NaN;
  return Date.parse(line.timestamp);
}

function extractDurationMs(lines: TranscriptLine[]): number {
  const timestamps = lines.map(parseTimestamp).filter((t) => !Number.isNaN(t));
  if (timestamps.length < 2) return 0;
  return Math.max(...timestamps) - Math.min(...timestamps);
}

function hasErrorContent(contentStr: string): boolean {
  return ERROR_KEYWORDS.some((kw) => contentStr.includes(kw));
}

function detectAgentStatus(lines: TranscriptLine[]): string {
  if (lines.length === 0) return "unknown";
  const last = lines[lines.length - 1];
  const contentStr = JSON.stringify(last.content || "").toLowerCase();
  return hasErrorContent(contentStr) ? "error" : "success";
}

function buildResolvedEntry(
  input: SubagentStopInput,
  lines: TranscriptLine[],
  agentType: string,
): ResolvedTraceEntry {
  const tokenCount = countContentBlocks(lines);
  return {
    ts: new Date().toISOString(),
    sessionId: input.session_id || "unknown",
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

async function run(): Promise<void> {
  const raw = await consumeStdin();
  if (!raw.trim()) return;

  const input: SubagentStopInput = JSON.parse(raw);
  if (input.stop_hook_active === true) {
    return;
  }

  const agentId = input.agent_id || "";
  const transcriptPath = input.agent_transcript_path || "";

  if (!transcriptPath) {
    log(`No agent_transcript_path for agent ${agentId}, skipping`);
    return;
  }

  const lines = parseTranscript(transcriptPath);
  const agentType = input.agent_type || extractAgentType(agentId);
  const entry = buildResolvedEntry(input, lines, agentType);

  updateScores([entry]);
  log(`Scored ${agentType}: status=${entry.status}, tools=${entry.toolCalls}, tokens=${entry.tokens}`);

  try {
    let insights = extractMemoryInsights(lines as TranscriptMessage[]);

    if (!insights && typeof input.last_assistant_message === "string") {
      insights = extractMemoryInsights([
        { role: "assistant", content: input.last_assistant_message },
      ]);
    }

    if (insights) {
      persistMemory(agentType, input.session_id || "unknown", insights);
      log(`Persisted memory for ${agentType}`);
    }
  } catch (err) {
    log(`Memory extraction failed: ${fmtErr(err)}`);
  }
}

run().catch((err) => log(`Failed: ${fmtErr(err)}`)).finally(() => process.exit(0));
