/**
 * Shared test helpers for pattern learning test suites.
 */

import type { ResolvedTraceEntry } from "../trace-logger";

interface TraceOverrides {
  sessionId?: string;
  agents?: string[];
  skills?: string[];
  status?: string;
  tokens?: number;
  filesChanged?: number;
  ts?: string;
}

export function makeTrace(overrides: TraceOverrides = {}): ResolvedTraceEntry {
  return {
    ts: overrides.ts ?? new Date().toISOString(),
    sessionId:
      overrides.sessionId ??
      `session-${Math.random().toString(36).slice(2, 8)}`,
    prompt: "test prompt",
    agents: overrides.agents ?? ["builder"],
    skills: overrides.skills ?? [],
    tokens: overrides.tokens ?? 1000,
    inputTokens: 400,
    outputTokens: 600,
    costUsd: 0.01,
    durationMs: 5000,
    model: "sonnet",
    status: overrides.status ?? "completed",
    toolCalls: 5,
    filesChanged: overrides.filesChanged ?? 1,
  };
}

export function makeTraces(
  count: number,
  overrides: TraceOverrides = {},
): ResolvedTraceEntry[] {
  const traces: ResolvedTraceEntry[] = [];
  for (let i = 0; i < count; i++) {
    traces.push(
      makeTrace({
        ...overrides,
        sessionId: overrides.sessionId ?? `session-${i}`,
        ts:
          overrides.ts ??
          new Date(Date.now() - (count - i) * 60000).toISOString(),
      }),
    );
  }
  return traces;
}
