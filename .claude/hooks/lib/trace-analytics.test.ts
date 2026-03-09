import { describe, test, expect } from "bun:test";

import {
  estimateTokens,
  detectModel,
  calculateCost,
  calculateDuration,
  detectStatus,
  countToolCalls,
  countFilesChanged,
  MODEL_PRICING,
} from "./trace-metrics";
import { getContentLength } from "./trace-extract";
import type { TranscriptMessage, ContentBlock } from "./trace-extract";
import { aggregateTraces } from "./trace-aggregation";

describe("getContentLength", () => {
  test("returns length for string content", () => {
    expect(getContentLength("hello world")).toBe(11);
  });

  test("returns 0 for empty string", () => {
    expect(getContentLength("")).toBe(0);
  });

  test("handles ContentBlock array with text", () => {
    const blocks: ContentBlock[] = [
      { type: "text", text: "hello" },
      { type: "text", text: "world" },
    ];
    expect(getContentLength(blocks)).toBe(10);
  });

  test("handles ContentBlock array with input", () => {
    const blocks: ContentBlock[] = [
      { type: "tool_use", name: "Read", input: { file_path: "/test.ts" } },
    ];
    const result = getContentLength(blocks);
    expect(result).toBeGreaterThan(0);
  });

  test("returns 0 for non-array non-string", () => {
    expect(getContentLength(null as unknown as string)).toBe(0);
  });
});

describe("estimateTokens", () => {
  test("estimates tokens from user and assistant messages", () => {
    const transcript: TranscriptMessage[] = [
      { role: "user", content: "a".repeat(400) },
      { role: "assistant", content: "b".repeat(1200) },
    ];
    const result = estimateTokens(transcript);
    expect(result.inputTokens).toBe(100);
    expect(result.outputTokens).toBe(300);
  });

  test("handles tool_result role as input", () => {
    const transcript: TranscriptMessage[] = [
      { role: "tool_result", content: "x".repeat(800) },
    ];
    const result = estimateTokens(transcript);
    expect(result.inputTokens).toBe(200);
    expect(result.outputTokens).toBe(0);
  });

  test("handles empty transcript", () => {
    const result = estimateTokens([]);
    expect(result.inputTokens).toBe(0);
    expect(result.outputTokens).toBe(0);
  });

  test("handles ContentBlock arrays", () => {
    const transcript: TranscriptMessage[] = [
      {
        role: "assistant",
        content: [{ type: "text", text: "a".repeat(80) }],
      },
    ];
    const result = estimateTokens(transcript);
    expect(result.outputTokens).toBe(20);
  });
});

describe("detectModel", () => {
  test("detects opus from transcript", () => {
    const transcript: TranscriptMessage[] = [
      { role: "assistant", content: "You are powered by claude-opus-4-6" },
    ];
    expect(detectModel(transcript)).toBe("opus");
  });

  test("detects haiku from transcript", () => {
    const transcript: TranscriptMessage[] = [
      { role: "user", content: "Using haiku model" },
    ];
    expect(detectModel(transcript)).toBe("haiku");
  });

  test("defaults to sonnet when no model mentioned", () => {
    const transcript: TranscriptMessage[] = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there" },
    ];
    expect(detectModel(transcript)).toBe("sonnet");
  });

  test("defaults to sonnet for empty transcript", () => {
    expect(detectModel([])).toBe("sonnet");
  });
});

describe("calculateCost", () => {
  test("calculates cost for sonnet model", () => {
    const cost = calculateCost(1000, 3000, "sonnet");
    expect(cost).toBeCloseTo(0.048, 4);
  });

  test("calculates cost for opus model", () => {
    const cost = calculateCost(2000, 5000, "opus");
    expect(cost).toBeCloseTo(0.405, 4);
  });

  test("calculates cost for haiku model", () => {
    const cost = calculateCost(1000, 1000, "haiku");
    expect(cost).toBeCloseTo(0.0015, 4);
  });

  test("falls back to sonnet pricing for unknown model", () => {
    const cost = calculateCost(1000, 1000, "unknown");
    const sonnetCost = calculateCost(1000, 1000, "sonnet");
    expect(cost).toBe(sonnetCost);
  });

  test("returns 0 for zero tokens", () => {
    expect(calculateCost(0, 0, "sonnet")).toBe(0);
  });
});

describe("calculateDuration", () => {
  test("returns positive duration for non-zero tokens", () => {
    const duration = calculateDuration(4000);
    expect(duration).toBe(50000);
  });

  test("returns 0 for zero tokens", () => {
    expect(calculateDuration(0)).toBe(0);
  });

  test("returns 0 for negative tokens", () => {
    expect(calculateDuration(-100)).toBe(0);
  });
});

describe("detectStatus", () => {
  test("detects error status", () => {
    expect(detectStatus([], "Error: Cannot find module")).toBe("error");
  });

  test("detects timeout status", () => {
    expect(detectStatus([], "Operation timed out")).toBe("timeout");
  });

  test("returns completed for normal session", () => {
    const transcript: TranscriptMessage[] = [
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
    ];
    expect(detectStatus(transcript, "Done!")).toBe("completed");
  });

  test("returns unknown for empty transcript", () => {
    expect(detectStatus([], "")).toBe("unknown");
  });

  test("timeout takes priority over error", () => {
    expect(detectStatus([], "Error: timed out")).toBe("timeout");
  });
});

describe("countToolCalls", () => {
  test("counts tool_use blocks in assistant messages", () => {
    const transcript: TranscriptMessage[] = [
      {
        role: "assistant",
        content: [
          { type: "tool_use", name: "Read", input: {} },
          { type: "text", text: "reading file" },
          { type: "tool_use", name: "Edit", input: {} },
        ],
      },
      { role: "user", content: "ok" },
      {
        role: "assistant",
        content: [{ type: "tool_use", name: "Write", input: {} }],
      },
    ];
    expect(countToolCalls(transcript)).toBe(3);
  });

  test("returns 0 for empty transcript", () => {
    expect(countToolCalls([])).toBe(0);
  });

  test("ignores non-assistant messages", () => {
    const transcript: TranscriptMessage[] = [
      {
        role: "user",
        content: [{ type: "tool_use", name: "Read", input: {} }],
      },
    ];
    expect(countToolCalls(transcript)).toBe(0);
  });
});

describe("countFilesChanged", () => {
  test("counts unique files from Edit and Write tools", () => {
    const transcript: TranscriptMessage[] = [
      {
        role: "assistant",
        content: [
          { type: "tool_use", name: "Edit", input: { file_path: "/a.ts" } },
          { type: "tool_use", name: "Edit", input: { file_path: "/a.ts" } },
          { type: "tool_use", name: "Write", input: { file_path: "/b.ts" } },
        ],
      },
    ];
    expect(countFilesChanged(transcript)).toBe(2);
  });

  test("ignores non-Edit/Write tools", () => {
    const transcript: TranscriptMessage[] = [
      {
        role: "assistant",
        content: [
          { type: "tool_use", name: "Read", input: { file_path: "/a.ts" } },
        ],
      },
    ];
    expect(countFilesChanged(transcript)).toBe(0);
  });

  test("returns 0 for empty transcript", () => {
    expect(countFilesChanged([])).toBe(0);
  });
});

describe("aggregateTraces", () => {
  test("aggregates multiple entries", () => {
    const entries = [
      {
        ts: "2026-03-08T10:00:00Z",
        sessionId: "s1",
        prompt: "test",
        agents: ["builder"],
        skills: ["api-design"],
        tokens: 4000,
        inputTokens: 1000,
        outputTokens: 3000,
        costUsd: 0.048,
        durationMs: 50000,
        model: "sonnet",
        status: "completed",
        toolCalls: 10,
        filesChanged: 3,
      },
      {
        ts: "2026-03-08T14:00:00Z",
        sessionId: "s2",
        prompt: "test2",
        agents: ["builder", "reviewer"],
        skills: ["security-review"],
        tokens: 8000,
        inputTokens: 2000,
        outputTokens: 6000,
        costUsd: 0.096,
        durationMs: 100000,
        model: "sonnet",
        status: "completed",
        toolCalls: 20,
        filesChanged: 5,
      },
    ];

    const agg = aggregateTraces(entries);

    expect(agg.totalSessions).toBe(2);
    expect(agg.totalTokens).toBe(12000);
    expect(agg.totalInputTokens).toBe(3000);
    expect(agg.totalOutputTokens).toBe(9000);
    expect(agg.totalCost).toBeCloseTo(0.144, 4);
    expect(agg.avgTokensPerSession).toBe(6000);
    expect(agg.byAgent.builder.count).toBe(2);
    expect(agg.byAgent.reviewer.count).toBe(1);
    expect(agg.bySkill["api-design"].count).toBe(1);
    expect(agg.byModel.sonnet.count).toBe(2);
    expect(agg.byStatus.completed).toBe(2);
    expect(agg.byDay["2026-03-08"].sessions).toBe(2);
  });

  test("handles empty entries array", () => {
    const agg = aggregateTraces([]);
    expect(agg.totalSessions).toBe(0);
    expect(agg.totalTokens).toBe(0);
    expect(agg.totalCost).toBe(0);
    expect(agg.avgDuration).toBe(0);
    expect(agg.avgTokensPerSession).toBe(0);
  });

  test("aggregates by model correctly", () => {
    const entries = [
      {
        ts: "2026-03-07T10:00:00Z",
        sessionId: "s1",
        prompt: "t",
        agents: [],
        skills: [],
        tokens: 1000,
        inputTokens: 500,
        outputTokens: 500,
        costUsd: 0.01,
        durationMs: 1000,
        model: "opus",
        status: "completed",
        toolCalls: 5,
        filesChanged: 1,
      },
      {
        ts: "2026-03-08T10:00:00Z",
        sessionId: "s2",
        prompt: "t",
        agents: [],
        skills: [],
        tokens: 1000,
        inputTokens: 500,
        outputTokens: 500,
        costUsd: 0.001,
        durationMs: 1000,
        model: "sonnet",
        status: "completed",
        toolCalls: 3,
        filesChanged: 0,
      },
    ];

    const agg = aggregateTraces(entries);
    expect(agg.byModel.opus.count).toBe(1);
    expect(agg.byModel.sonnet.count).toBe(1);
    expect(agg.byDay["2026-03-07"].sessions).toBe(1);
    expect(agg.byDay["2026-03-08"].sessions).toBe(1);
  });
});

describe("normalizeEntry via aggregateTraces", () => {
  test("handles v1 entries missing new fields", () => {
    const v1Entry = {
      ts: "2026-03-08T10:00:00Z",
      sessionId: "s1",
      prompt: "test",
      agents: ["builder"],
      skills: [],
      tokens: 0,
      costUsd: 0,
      durationMs: 0,
      status: "completed",
    };

    const normalized = {
      ts: v1Entry.ts,
      sessionId: v1Entry.sessionId,
      prompt: v1Entry.prompt,
      agents: v1Entry.agents,
      skills: v1Entry.skills,
      tokens: v1Entry.tokens,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: v1Entry.costUsd,
      durationMs: v1Entry.durationMs,
      model: "unknown",
      status: v1Entry.status,
      toolCalls: 0,
      filesChanged: 0,
    };

    const agg = aggregateTraces([normalized]);
    expect(agg.totalSessions).toBe(1);
    expect(agg.byModel.unknown.count).toBe(1);
  });
});
