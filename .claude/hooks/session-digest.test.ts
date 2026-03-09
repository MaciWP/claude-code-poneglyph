import { describe, test, expect } from "bun:test";
import type { TraceEntry } from "./trace-logger";
import type { ResolvedTraceEntry } from "./lib/agent-scorer-types";
import {
  findLatestTraceFile,
  readLastLine,
  parseTrace,
  countTraceFiles,
  formatError,
} from "./lib/session-digest-helpers";
import {
  hasErrorIndicators,
  extractErrorMessage,
  resolveTrace,
} from "./lib/session-digest-resolve";

function makeFullTrace(): TraceEntry {
  return {
    ts: "2026-03-09T10:00:00Z",
    sessionId: "sess-ok",
    prompt: "implement feature",
    agents: ["builder"],
    skills: ["typescript-patterns"],
    tokens: 5000,
    inputTokens: 2000,
    outputTokens: 3000,
    costUsd: 0.05,
    durationMs: 60000,
    model: "sonnet",
    status: "completed",
    toolCalls: 10,
    filesChanged: 3,
    rawInput: { session_id: "sess-ok" },
  };
}

function makeErrorTrace(): TraceEntry {
  return {
    ts: "2026-03-09T11:00:00Z",
    sessionId: "sess-err",
    prompt: "fix bug",
    agents: ["builder"],
    skills: [],
    tokens: 2000,
    inputTokens: 800,
    outputTokens: 1200,
    costUsd: 0.02,
    durationMs: 30000,
    model: "sonnet",
    status: "error",
    toolCalls: 5,
    filesChanged: 1,
    rawInput: {
      session_id: "sess-err",
      error_message: "TypeError: Cannot read property 'id' of undefined",
    },
  };
}

function makeMinimalTrace(): TraceEntry {
  return {
    ts: "2026-03-09T12:00:00Z",
    sessionId: "sess-min",
    prompt: null,
    agents: null,
    skills: null,
    tokens: null,
    inputTokens: null,
    outputTokens: null,
    costUsd: null,
    durationMs: null,
    model: null,
    status: "unknown",
    toolCalls: null,
    filesChanged: null,
    rawInput: { session_id: "sess-min", stop_hook_event: "stop" },
  };
}

describe("parseTrace", () => {
  test("parses valid JSON line into TraceEntry", () => {
    const trace = makeFullTrace();
    const line = JSON.stringify(trace);
    const result = parseTrace(line);
    expect(result).not.toBeNull();
    expect(result!.sessionId).toBe("sess-ok");
    expect(result!.status).toBe("completed");
  });

  test("returns null for invalid JSON", () => {
    expect(parseTrace("not json")).toBeNull();
    expect(parseTrace("")).toBeNull();
  });
});

describe("hasErrorIndicators", () => {
  test("detects error status", () => {
    const trace = makeErrorTrace();
    expect(hasErrorIndicators(trace)).toBe(true);
  });

  test("detects failed status", () => {
    const trace = makeFullTrace();
    trace.status = "failed";
    expect(hasErrorIndicators(trace)).toBe(true);
  });

  test("detects timeout status", () => {
    const trace = makeFullTrace();
    trace.status = "timeout";
    expect(hasErrorIndicators(trace)).toBe(true);
  });

  test("detects error in stop_hook_event", () => {
    const trace = makeFullTrace();
    trace.rawInput = { stop_hook_event: "error" };
    expect(hasErrorIndicators(trace)).toBe(true);
  });

  test("returns false for completed session", () => {
    expect(hasErrorIndicators(makeFullTrace())).toBe(false);
  });

  test("returns false for unknown status without error event", () => {
    expect(hasErrorIndicators(makeMinimalTrace())).toBe(false);
  });
});

describe("extractErrorMessage", () => {
  test("extracts error_message from rawInput", () => {
    const trace = makeErrorTrace();
    const msg = extractErrorMessage(trace);
    expect(msg).toBe("TypeError: Cannot read property 'id' of undefined");
  });

  test("extracts from last_assistant_message if contains error", () => {
    const trace = makeFullTrace();
    trace.rawInput = {
      last_assistant_message: "I encountered an error while processing",
    };
    const msg = extractErrorMessage(trace);
    expect(msg).toContain("error");
  });

  test("returns fallback when no rawInput", () => {
    const trace = makeFullTrace();
    trace.rawInput = undefined;
    const msg = extractErrorMessage(trace);
    expect(msg).toContain("completed");
    expect(msg).toContain("sess-ok");
  });

  test("returns fallback when rawInput has no error fields", () => {
    const trace = makeFullTrace();
    trace.rawInput = { session_id: "sess-ok" };
    const msg = extractErrorMessage(trace);
    expect(msg).toContain("Session completed");
  });

  test("truncates long last_assistant_message to 200 chars", () => {
    const trace = makeFullTrace();
    const longMsg = "error " + "x".repeat(300);
    trace.rawInput = { last_assistant_message: longMsg };
    const msg = extractErrorMessage(trace);
    expect(msg.length).toBe(200);
  });
});

describe("resolveTrace", () => {
  test("resolves full trace keeping all values", () => {
    const trace = makeFullTrace();
    const resolved = resolveTrace(trace);

    expect(resolved.ts).toBe("2026-03-09T10:00:00Z");
    expect(resolved.sessionId).toBe("sess-ok");
    expect(resolved.prompt).toBe("implement feature");
    expect(resolved.agents).toEqual(["builder"]);
    expect(resolved.skills).toEqual(["typescript-patterns"]);
    expect(resolved.tokens).toBe(5000);
    expect(resolved.costUsd).toBe(0.05);
    expect(resolved.model).toBe("sonnet");
    expect(resolved.status).toBe("completed");
  });

  test("resolves minimal trace with defaults for null fields", () => {
    const trace = makeMinimalTrace();
    const resolved = resolveTrace(trace);

    expect(resolved.sessionId).toBe("sess-min");
    expect(resolved.prompt).toBe("unknown");
    expect(resolved.agents).toEqual([]);
    expect(resolved.skills).toEqual([]);
    expect(resolved.tokens).toBe(0);
    expect(resolved.costUsd).toBe(0);
    expect(resolved.model).toBe("unknown");
    expect(resolved.status).toBe("unknown");
    expect(resolved.toolCalls).toBe(0);
    expect(resolved.filesChanged).toBe(0);
  });

  test("resolved trace satisfies ResolvedTraceEntry interface", () => {
    const resolved: ResolvedTraceEntry = resolveTrace(makeMinimalTrace());
    expect(typeof resolved.ts).toBe("string");
    expect(typeof resolved.tokens).toBe("number");
    expect(Array.isArray(resolved.agents)).toBe(true);
  });
});

describe("formatError", () => {
  test("extracts message from Error instances", () => {
    expect(formatError(new Error("test fail"))).toBe("test fail");
  });

  test("returns unknown for non-Error values", () => {
    expect(formatError("string error")).toBe("unknown");
    expect(formatError(42)).toBe("unknown");
    expect(formatError(null)).toBe("unknown");
  });
});

describe("readLastLine", () => {
  test("returns null for non-existent file", () => {
    expect(readLastLine("/nonexistent/path/file.jsonl")).toBeNull();
  });
});

describe("countTraceFiles", () => {
  test("returns a number (may be 0 if no traces)", () => {
    const count = countTraceFiles();
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

describe("integration: error trace through full pipeline", () => {
  test("error trace is detected, message extracted, and resolved", () => {
    const trace = makeErrorTrace();

    expect(hasErrorIndicators(trace)).toBe(true);

    const errorMsg = extractErrorMessage(trace);
    expect(errorMsg).toContain("TypeError");

    const resolved = resolveTrace(trace);
    expect(resolved.status).toBe("error");
    expect(resolved.agents).toEqual(["builder"]);
    expect(resolved.tokens).toBe(2000);
  });

  test("successful trace skips error recording path", () => {
    const trace = makeFullTrace();

    expect(hasErrorIndicators(trace)).toBe(false);

    const resolved = resolveTrace(trace);
    expect(resolved.status).toBe("completed");
    expect(resolved.sessionId).toBe("sess-ok");
  });
});
