import { describe, test, expect } from "bun:test";
import type { TraceEntry, StopHookInput } from "./trace-logger";
import { buildTraceFromPersisted } from "./trace-logger";

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

  test("accepts input with transcript_path", () => {
    const input: StopHookInput = {
      session_id: "sess-123",
      transcript_path: "/tmp/transcript.json",
    };
    expect(input.transcript_path).toBe("/tmp/transcript.json");
    expect(input.transcript).toBeUndefined();
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

describe("buildTraceFromPersisted", () => {
  const baseInput: StopHookInput = {
    session_id: "sess-test",
    last_assistant_message: "All done.",
  };

  const realShapedPayload: unknown[] = [
    {
      parentUuid: null,
      isSidechain: false,
      type: "user",
      message: {
        role: "user",
        content:
          "Refactor the auth module to extract common validation logic.",
      },
      uuid: "u1",
      timestamp: "2026-04-11T10:00:00.000Z",
    },
    {
      parentUuid: "u1",
      isSidechain: false,
      type: "assistant",
      message: {
        model: "claude-opus-4-6",
        id: "msg_1",
        role: "assistant",
        content: [
          { type: "text", text: "Delegating to builder." },
          {
            type: "tool_use",
            name: "Task",
            input: {
              subagent_type: "builder",
              prompt: "extract validation",
            },
          },
        ],
        usage: {
          input_tokens: 100,
          cache_creation_input_tokens: 500,
          cache_read_input_tokens: 2000,
          output_tokens: 50,
        },
      },
      uuid: "a1",
      timestamp: "2026-04-11T10:00:10.000Z",
    },
    {
      parentUuid: "a1",
      isSidechain: false,
      type: "user",
      message: {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "toolu_1",
            content: "builder done",
          },
        ],
      },
      uuid: "u2",
      timestamp: "2026-04-11T10:00:15.000Z",
    },
    {
      parentUuid: "u2",
      isSidechain: false,
      type: "assistant",
      message: {
        model: "claude-opus-4-6",
        id: "msg_2",
        role: "assistant",
        content: [{ type: "text", text: "Builder finished the refactor." }],
        usage: {
          input_tokens: 50,
          cache_creation_input_tokens: 100,
          cache_read_input_tokens: 3000,
          output_tokens: 80,
        },
      },
      uuid: "a2",
      timestamp: "2026-04-11T10:00:30.000Z",
    },
    {
      parentUuid: "a2",
      isSidechain: false,
      type: "assistant",
      message: {
        model: "claude-opus-4-6",
        id: "msg_3",
        role: "assistant",
        content: [{ type: "text", text: "Final summary." }],
        usage: {
          input_tokens: 20,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 3200,
          output_tokens: 40,
        },
      },
      uuid: "a3",
      timestamp: "2026-04-11T10:00:45.000Z",
    },
  ];

  test("real-shaped JSONL payload produces non-null authoritative fields", () => {
    const trace = buildTraceFromPersisted(baseInput, realShapedPayload);

    expect(trace.model).toBe("opus");
    expect(trace.inputTokens).toBeGreaterThan(0);
    expect(trace.outputTokens).toBeGreaterThan(0);
    expect(trace.tokens).toBeGreaterThan(0);
    expect(trace.costUsd).not.toBeNull();
    expect(trace.costUsd!).toBeGreaterThan(0);
    expect(trace.durationMs).not.toBeNull();
    expect(trace.durationMs!).toBeGreaterThan(0);
    expect(trace.agents).toContain("builder");
    expect(trace.status).toBe("completed");
    expect(trace.prompt).not.toBeNull();
    expect(trace.prompt!.length).toBeGreaterThan(0);
  });

  test("real-shaped input tokens sum all three cache fields", () => {
    const trace = buildTraceFromPersisted(baseInput, realShapedPayload);
    // Sum: (100+500+2000) + (50+100+3000) + (20+0+3200) = 2600 + 3150 + 3220 = 8970
    expect(trace.inputTokens).toBe(8970);
    // Output: 50 + 80 + 40 = 170
    expect(trace.outputTokens).toBe(170);
    expect(trace.tokens).toBe(8970 + 170);
  });

  test("empty rawEntries falls back to buildTraceMinimal", () => {
    const trace = buildTraceFromPersisted(baseInput, []);
    expect(trace.model).toBeNull();
    expect(trace.tokens).toBeNull();
    expect(trace.inputTokens).toBeNull();
    expect(trace.outputTokens).toBeNull();
    expect(trace.costUsd).toBeNull();
    expect(trace.durationMs).toBeNull();
    expect(trace.agents).toBeNull();
    expect(trace.skills).toBeNull();
    expect(trace.sessionId).toBe("sess-test");
  });

  test("envelope without usage falls back to character estimation", () => {
    const noUsagePayload: unknown[] = [
      {
        type: "user",
        message: { role: "user", content: "hello world" },
        timestamp: "2026-04-11T10:00:00.000Z",
      },
      {
        type: "assistant",
        message: {
          model: "claude-opus-4-6",
          role: "assistant",
          content: [
            { type: "text", text: "this is a response text content block" },
          ],
        },
        timestamp: "2026-04-11T10:00:20.000Z",
      },
    ];

    const trace = buildTraceFromPersisted(baseInput, noUsagePayload);
    expect(trace.model).toBe("opus");
    expect(trace.inputTokens).not.toBeNull();
    expect(trace.inputTokens!).toBeGreaterThan(0);
    expect(trace.outputTokens).not.toBeNull();
    expect(trace.outputTokens!).toBeGreaterThan(0);
    expect(trace.tokens).not.toBeNull();
  });
});
