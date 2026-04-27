/**
 * Per-session tool execution timing accumulator.
 * Writes timing entries to ~/.claude/tool-timings/{sessionId}.jsonl
 * and provides summary statistics for trace analysis.
 *
 * Uses duration_ms from Claude Code v2.1.119+ PostToolUse/PostToolUseFailure hooks.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface ToolTimingEntry {
  ts: string;
  tool: string;
  durationMs: number;
  failed?: boolean;
}

export interface ToolTimingSummary {
  count: number;
  totalMs: number;
  avgMs: number;
  p95Ms: number;
  slowestTool: string | null;
  failureCount: number;
  byTool: Record<string, { count: number; avgMs: number; failures: number }>;
}

export function getTimingsPath(sessionId: string): string {
  const dir = join(homedir(), ".claude", "tool-timings");
  mkdirSync(dir, { recursive: true });
  const safe = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  return join(dir, `${safe}.jsonl`);
}

export function appendToolTiming(
  sessionId: string,
  tool: string,
  durationMs: number,
  failed = false,
): void {
  const entry: ToolTimingEntry = {
    ts: new Date().toISOString(),
    tool,
    durationMs,
    ...(failed ? { failed: true } : {}),
  };
  appendFileSync(getTimingsPath(sessionId), JSON.stringify(entry) + "\n", "utf8");
}

export function readToolTimings(sessionId: string): ToolTimingEntry[] {
  try {
    const path = getTimingsPath(sessionId);
    if (!existsSync(path)) return [];
    return readFileSync(path, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as ToolTimingEntry);
  } catch {
    return [];
  }
}

export function summarizeTimings(entries: ToolTimingEntry[]): ToolTimingSummary | null {
  if (entries.length === 0) return null;

  const sorted = [...entries].sort((a, b) => a.durationMs - b.durationMs);
  const totalMs = sorted.reduce((s, e) => s + e.durationMs, 0);
  const p95Index = Math.min(Math.floor(sorted.length * 0.95), sorted.length - 1);
  const p95Ms = sorted[p95Index]?.durationMs ?? 0;

  let slowestMs = -1;
  let slowestTool: string | null = null;
  const byToolRaw: Record<string, { count: number; total: number; failures: number }> = {};

  for (const e of entries) {
    if (e.durationMs > slowestMs) {
      slowestMs = e.durationMs;
      slowestTool = e.tool;
    }
    if (!byToolRaw[e.tool]) byToolRaw[e.tool] = { count: 0, total: 0, failures: 0 };
    byToolRaw[e.tool].count++;
    byToolRaw[e.tool].total += e.durationMs;
    if (e.failed) byToolRaw[e.tool].failures++;
  }

  const byTool: Record<string, { count: number; avgMs: number; failures: number }> = {};
  for (const [tool, { count, total, failures }] of Object.entries(byToolRaw)) {
    byTool[tool] = { count, avgMs: Math.round(total / count), failures };
  }

  return {
    count: entries.length,
    totalMs,
    avgMs: Math.round(totalMs / entries.length),
    p95Ms,
    slowestTool,
    failureCount: entries.filter((e) => e.failed).length,
    byTool,
  };
}
