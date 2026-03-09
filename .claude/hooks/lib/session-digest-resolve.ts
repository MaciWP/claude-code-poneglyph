import type { TraceEntry } from "../trace-logger";
import type { ResolvedTraceEntry } from "./agent-scorer-types";

const ERROR_STATUSES = new Set(["error", "failed", "timeout", "interrupted"]);

const DEFAULTS: ResolvedTraceEntry = {
  ts: "",
  sessionId: "unknown",
  prompt: "unknown",
  agents: [],
  skills: [],
  tokens: 0,
  inputTokens: 0,
  outputTokens: 0,
  costUsd: 0,
  durationMs: 0,
  model: "unknown",
  status: "unknown",
  toolCalls: 0,
  filesChanged: 0,
};

function coalesce<T>(value: T | null | undefined, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  return value;
}

export function resolveTrace(trace: TraceEntry): ResolvedTraceEntry {
  return {
    ts: trace.ts,
    sessionId: coalesce(trace.sessionId, DEFAULTS.sessionId),
    prompt: coalesce(trace.prompt, DEFAULTS.prompt),
    agents: coalesce(trace.agents, DEFAULTS.agents),
    skills: coalesce(trace.skills, DEFAULTS.skills),
    tokens: coalesce(trace.tokens, DEFAULTS.tokens),
    inputTokens: coalesce(trace.inputTokens, DEFAULTS.inputTokens),
    outputTokens: coalesce(trace.outputTokens, DEFAULTS.outputTokens),
    costUsd: coalesce(trace.costUsd, DEFAULTS.costUsd),
    durationMs: coalesce(trace.durationMs, DEFAULTS.durationMs),
    model: coalesce(trace.model, DEFAULTS.model),
    status: trace.status,
    toolCalls: coalesce(trace.toolCalls, DEFAULTS.toolCalls),
    filesChanged: coalesce(trace.filesChanged, DEFAULTS.filesChanged),
  };
}

export function hasErrorIndicators(trace: TraceEntry): boolean {
  if (ERROR_STATUSES.has(trace.status)) return true;

  const event = trace.rawInput?.["stop_hook_event"];
  if (typeof event === "string") return ERROR_STATUSES.has(event);

  return false;
}

function fallbackMessage(trace: TraceEntry): string {
  return `Session ${trace.status}: ${coalesce(trace.sessionId, "unknown")}`;
}

export function extractErrorMessage(trace: TraceEntry): string {
  const raw = trace.rawInput;
  if (!raw) return fallbackMessage(trace);

  const msg = raw["error_message"];
  if (typeof msg === "string" && msg.length > 0) return msg;

  const lastMsg = raw["last_assistant_message"];
  if (typeof lastMsg === "string" && lastMsg.includes("error")) {
    return lastMsg.slice(0, 200);
  }

  return fallbackMessage(trace);
}
