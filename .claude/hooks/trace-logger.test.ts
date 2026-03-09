import { describe, test, expect } from "bun:test";
import type { TraceEntry, StopHookInput } from "./trace-logger";

describe("TraceEntry interface", () => {
  test("accepts fully populated entry with transcript data", () => {
    const entry: TraceEntry = {
      ts: "2026-03-09T10:00:00Z",
      sessionId: "sess-123",
      prompt: "implement feature X",
      agents: ["builder", "reviewer"],
      skills: ["api-design"],
      tokens: 5000,
      inputTokens: 2000,
      outputTokens: 3000,
      costUsd: 0.048,
      durationMs: 62500,
      model: "sonnet",
      status: "completed",
      toolCalls: 12,
      filesChanged: 3,
      rawInput: { session_id: "sess-123" },
    };

    expect(entry.ts).toBe("2026-03-09T10:00:00Z");
    expect(entry.sessionId).toBe("sess-123");
    expect(entry.prompt).toBe("implement feature X");
    expect(entry.agents).toEqual(["builder", "reviewer"]);
    expect(entry.tokens).toBe(5000);
    expect(entry.model).toBe("sonnet");
    expect(entry.status).toBe("completed");
    expect(entry.rawInput).toEqual({ session_id: "sess-123" });
  });

  test("accepts minimal entry with null fields (no transcript)", () => {
    const entry: TraceEntry = {
      ts: "2026-03-09T10:00:00Z",
      sessionId: "sess-456",
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
      rawInput: { session_id: "sess-456", stop_hook_event: "stop" },
    };

    expect(entry.prompt).toBeNull();
    expect(entry.agents).toBeNull();
    expect(entry.skills).toBeNull();
    expect(entry.tokens).toBeNull();
    expect(entry.model).toBeNull();
    expect(entry.costUsd).toBeNull();
    expect(entry.status).toBe("unknown");
    expect(entry.rawInput).toBeDefined();
  });

  test("rawInput is optional", () => {
    const entry: TraceEntry = {
      ts: "2026-03-09T10:00:00Z",
      sessionId: "sess-789",
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
    };

    expect(entry.rawInput).toBeUndefined();
  });
});

describe("StopHookInput interface", () => {
  test("accepts minimal input with only session_id", () => {
    const input: StopHookInput = {
      session_id: "sess-123",
    };

    expect(input.session_id).toBe("sess-123");
    expect(input.transcript).toBeUndefined();
    expect(input.stop_hook_event).toBeUndefined();
  });

  test("accepts input with stop_hook_event", () => {
    const input: StopHookInput = {
      session_id: "sess-123",
      stop_hook_event: "stop",
    };

    expect(input.stop_hook_event).toBe("stop");
  });

  test("preserves arbitrary extra fields via index signature", () => {
    const input: StopHookInput = {
      session_id: "sess-123",
      stop_hook_event: "stop",
      some_future_field: "value",
      numeric_field: 42,
    };

    expect(input["some_future_field"]).toBe("value");
    expect(input["numeric_field"]).toBe(42);
  });
});

describe("JSONL serialization", () => {
  test("minimal trace serializes to valid JSON with null fields", () => {
    const entry: TraceEntry = {
      ts: "2026-03-09T10:00:00Z",
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

    const json = JSON.stringify(entry);
    const parsed = JSON.parse(json) as TraceEntry;

    expect(parsed.prompt).toBeNull();
    expect(parsed.agents).toBeNull();
    expect(parsed.tokens).toBeNull();
    expect(parsed.model).toBeNull();
    expect(parsed.status).toBe("unknown");
    expect(parsed.rawInput).toEqual({
      session_id: "sess-min",
      stop_hook_event: "stop",
    });
  });

  test("full trace serializes and deserializes correctly", () => {
    const entry: TraceEntry = {
      ts: "2026-03-09T12:00:00Z",
      sessionId: "sess-full",
      prompt: "build the thing",
      agents: ["builder"],
      skills: ["typescript-patterns"],
      tokens: 8000,
      inputTokens: 3000,
      outputTokens: 5000,
      costUsd: 0.084,
      durationMs: 100000,
      model: "sonnet",
      status: "completed",
      toolCalls: 20,
      filesChanged: 5,
      rawInput: { session_id: "sess-full" },
    };

    const json = JSON.stringify(entry);
    const parsed = JSON.parse(json) as TraceEntry;

    expect(parsed.prompt).toBe("build the thing");
    expect(parsed.agents).toEqual(["builder"]);
    expect(parsed.tokens).toBe(8000);
    expect(parsed.model).toBe("sonnet");
  });
});
