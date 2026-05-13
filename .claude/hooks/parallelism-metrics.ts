#!/usr/bin/env bun
/**
 * parallelism-metrics.ts — Stop hook for parallelism observability.
 *
 * Reads the session transcript (JSONL), counts Agent/Task tool_use blocks per
 * assistant turn, and appends a per-turn metric record to
 * `~/.claude/parallelism-metrics.jsonl`.
 *
 * batched = total when total >= 2 (a single assistant message with >=2 Agent
 * calls is considered batched/parallelized); else 0.
 * ratio   = batched / total
 *
 * Target ratio is 0.6 (see plan `me-estoy-dando-cuenta-quiet-toucan`).
 * Always exits 0 (best-effort observability — never blocks Claude Code).
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

interface ContentBlock {
  type: string;
  name?: string;
  input?: { subagent_type?: string; [k: string]: unknown };
  [k: string]: unknown;
}

interface TranscriptEntry {
  type?: string;
  role?: string;
  message?: { role?: string; content?: string | ContentBlock[] };
  content?: string | ContentBlock[];
  sessionId?: string;
  session_id?: string;
}

interface StopHookInput {
  stop_hook_active?: boolean;
  session_id?: string;
  transcript_path?: string;
}

interface MetricRecord {
  timestamp: string;
  session_id: string;
  turn_index: number;
  agent_calls_total: number;
  batched_calls: number;
  ratio: number;
}

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    const chunks: string[] = [];
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c: string) => chunks.push(c));
    process.stdin.on("end", () => resolve(chunks.join("")));
    process.stdin.on("error", () => resolve(""));
    process.stdin.resume();
  });
}

function getContent(entry: TranscriptEntry): string | ContentBlock[] | undefined {
  return entry.message?.content ?? entry.content;
}

function isAssistant(entry: TranscriptEntry): boolean {
  return (
    entry.type === "assistant" ||
    entry.role === "assistant" ||
    entry.message?.role === "assistant"
  );
}

function countAgentCalls(content: string | ContentBlock[] | undefined): number {
  if (!content || typeof content === "string") return 0;
  return content.filter(
    (b) => b.type === "tool_use" && (b.name === "Agent" || b.name === "Task"),
  ).length;
}

function buildMetrics(transcriptPath: string, sessionId: string): MetricRecord[] {
  if (!existsSync(transcriptPath)) return [];
  const raw = readFileSync(transcriptPath, "utf-8");
  const lines = raw.split("\n");
  const records: MetricRecord[] = [];
  let turnIndex = 0;
  const ts = new Date().toISOString();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let entry: TranscriptEntry;
    try {
      entry = JSON.parse(trimmed) as TranscriptEntry;
    } catch {
      continue;
    }
    if (!isAssistant(entry)) continue;
    const total = countAgentCalls(getContent(entry));
    if (total === 0) continue;
    const batched = total >= 2 ? total : 0;
    records.push({
      timestamp: ts,
      session_id: sessionId,
      turn_index: turnIndex++,
      agent_calls_total: total,
      batched_calls: batched,
      ratio: total > 0 ? batched / total : 0,
    });
  }
  return records;
}

function appendMetrics(records: MetricRecord[]): void {
  if (records.length === 0) return;
  const outPath = join(homedir(), ".claude", "parallelism-metrics.jsonl");
  mkdirSync(dirname(outPath), { recursive: true });
  const lines = records.map((r) => JSON.stringify(r)).join("\n") + "\n";
  appendFileSync(outPath, lines);
}

async function main(): Promise<void> {
  try {
    const raw = await readStdin();
    if (!raw.trim()) {
      process.exit(0);
    }
    const input = JSON.parse(raw) as StopHookInput;
    if (input.stop_hook_active) {
      process.exit(0);
    }
    if (!input.transcript_path) {
      process.exit(0);
    }
    const records = buildMetrics(input.transcript_path, input.session_id ?? "");
    appendMetrics(records);
  } catch {
    /* best-effort — never block */
  }
  process.exit(0);
}

if (import.meta.main) {
  main().catch(() => process.exit(0));
}
