import { describe, test, expect } from "bun:test";
import {
  parseJsonLine,
  extractAgentType,
  normalizeAgentType,
  countContentBlocks,
  countToolCallsInTranscript,
  extractDurationMs,
  hasErrorContent,
  detectAgentStatus,
  buildResolvedEntry,
  isToolUseBlock,
  KNOWN_AGENTS,
  ERROR_KEYWORDS,
} from "../agent-scoring";
import type { TranscriptLine, SubagentStopInput } from "../agent-scoring";

function makeLine(overrides: Partial<TranscriptLine> = {}): TranscriptLine {
  return { role: "assistant", content: "some text", ...overrides };
}

describe("parseJsonLine", () => {
  test("parses valid JSON object", () => {
    const result = parseJsonLine('{"role":"assistant","content":"hello"}');
    expect(result).toEqual({ role: "assistant", content: "hello" });
  });

  test("returns null for invalid JSON", () => {
    expect(parseJsonLine("not json")).toBeNull();
    expect(parseJsonLine("")).toBeNull();
    expect(parseJsonLine("{broken")).toBeNull();
  });

  test("parses line with timestamp", () => {
    const line = '{"role":"user","timestamp":"2026-01-01T00:00:00Z"}';
    const result = parseJsonLine(line);
    expect(result?.timestamp).toBe("2026-01-01T00:00:00Z");
  });
});

describe("extractAgentType", () => {
  test("extracts builder from agent id", () => {
    expect(extractAgentType("builder-a3f8c2")).toBe("builder");
  });

  test("extracts reviewer from agent id", () => {
    expect(extractAgentType("reviewer-xyz")).toBe("reviewer");
  });

  test("extracts error-analyzer from agent id", () => {
    expect(extractAgentType("error-analyzer-001")).toBe("error-analyzer");
  });

  test("extracts scout from mixed-case id", () => {
    expect(extractAgentType("Scout-123")).toBe("scout");
  });

  test("returns null for unknown agent", () => {
    expect(extractAgentType("unknown-agent-999")).toBeNull();
    expect(extractAgentType("a201ef89281874bef")).toBeNull();
  });

  test("all KNOWN_AGENTS are extractable", () => {
    for (const agent of KNOWN_AGENTS) {
      expect(extractAgentType(`${agent}-abc`)).toBe(agent);
    }
  });

  test("extracts extension-architect from agent id", () => {
    expect(extractAgentType("extension-architect-abc")).toBe("extension-architect");
  });

  test("extracts general-purpose from agent id", () => {
    expect(extractAgentType("general-purpose-session")).toBe("general-purpose");
  });

  test("extracts Explore from agent id", () => {
    expect(extractAgentType("Explore-xyz")).toBe("Explore");
  });

  test("extracts Plan from agent id", () => {
    expect(extractAgentType("Plan-abc123")).toBe("Plan");
  });
});

describe("countContentBlocks", () => {
  test("counts array content by length", () => {
    const lines: TranscriptLine[] = [
      { content: [1, 2, 3] },
      { content: ["a", "b"] },
    ];
    expect(countContentBlocks(lines)).toBe(5);
  });

  test("counts non-array non-null content as 1", () => {
    const lines: TranscriptLine[] = [
      { content: "text" },
      { content: 42 },
    ];
    expect(countContentBlocks(lines)).toBe(2);
  });

  test("skips null and undefined content", () => {
    const lines: TranscriptLine[] = [
      { content: null },
      { content: undefined },
      {},
    ];
    expect(countContentBlocks(lines)).toBe(0);
  });

  test("handles empty lines array", () => {
    expect(countContentBlocks([])).toBe(0);
  });
});

describe("isToolUseBlock", () => {
  test("returns true for tool_use type objects", () => {
    expect(isToolUseBlock({ type: "tool_use", id: "x" })).toBe(true);
  });

  test("returns false for other types", () => {
    expect(isToolUseBlock({ type: "text" })).toBe(false);
    expect(isToolUseBlock({ type: "tool_result" })).toBe(false);
  });

  test("returns false for non-objects", () => {
    expect(isToolUseBlock(null)).toBe(false);
    expect(isToolUseBlock("tool_use")).toBe(false);
    expect(isToolUseBlock(42)).toBe(false);
  });
});

describe("countToolCallsInTranscript", () => {
  test("counts tool_use blocks across lines", () => {
    const lines: TranscriptLine[] = [
      { content: [{ type: "tool_use" }, { type: "text" }] },
      { content: [{ type: "tool_use" }, { type: "tool_use" }] },
    ];
    expect(countToolCallsInTranscript(lines)).toBe(3);
  });

  test("skips lines with non-array content", () => {
    const lines: TranscriptLine[] = [
      { content: "not an array" },
      { content: [{ type: "tool_use" }] },
    ];
    expect(countToolCallsInTranscript(lines)).toBe(1);
  });

  test("returns 0 for empty lines", () => {
    expect(countToolCallsInTranscript([])).toBe(0);
  });
});

describe("extractDurationMs", () => {
  test("calculates duration between min and max timestamps", () => {
    const lines: TranscriptLine[] = [
      { timestamp: "2026-01-01T00:00:00Z" },
      { timestamp: "2026-01-01T00:00:30Z" },
      { timestamp: "2026-01-01T00:01:00Z" },
    ];
    expect(extractDurationMs(lines)).toBe(60000);
  });

  test("returns 0 for single timestamp", () => {
    const lines: TranscriptLine[] = [{ timestamp: "2026-01-01T00:00:00Z" }];
    expect(extractDurationMs(lines)).toBe(0);
  });

  test("returns 0 for no timestamps", () => {
    const lines: TranscriptLine[] = [{ content: "no timestamp" }];
    expect(extractDurationMs(lines)).toBe(0);
  });

  test("ignores lines without timestamps", () => {
    const lines: TranscriptLine[] = [
      { timestamp: "2026-01-01T00:00:00Z" },
      { content: "no timestamp here" },
      { timestamp: "2026-01-01T00:00:10Z" },
    ];
    expect(extractDurationMs(lines)).toBe(10000);
  });
});

describe("hasErrorContent", () => {
  test("detects error keyword", () => {
    expect(hasErrorContent("an error occurred")).toBe(true);
  });

  test("detects failed keyword", () => {
    expect(hasErrorContent("command failed")).toBe(true);
  });

  test("detects timeout keyword", () => {
    expect(hasErrorContent("operation timeout")).toBe(true);
  });

  test("returns false for clean content", () => {
    expect(hasErrorContent("task completed successfully")).toBe(false);
    expect(hasErrorContent("")).toBe(false);
  });

  test("all ERROR_KEYWORDS are detected", () => {
    for (const kw of ERROR_KEYWORDS) {
      expect(hasErrorContent(`some ${kw} happened`)).toBe(true);
    }
  });
});

describe("detectAgentStatus", () => {
  test("returns unknown for empty lines", () => {
    expect(detectAgentStatus([])).toBe("unknown");
  });

  test("returns error when last line contains error keyword", () => {
    const lines: TranscriptLine[] = [
      makeLine({ content: "task done" }),
      makeLine({ content: "an error occurred in the process" }),
    ];
    expect(detectAgentStatus(lines)).toBe("error");
  });

  test("returns success when last line is clean", () => {
    const lines: TranscriptLine[] = [
      makeLine({ content: "something failed earlier" }),
      makeLine({ content: "task completed successfully" }),
    ];
    expect(detectAgentStatus(lines)).toBe("success");
  });

  test("only checks last line, not earlier ones", () => {
    const lines: TranscriptLine[] = [
      makeLine({ content: "error in step 1" }),
      makeLine({ content: "recovered and completed" }),
    ];
    expect(detectAgentStatus(lines)).toBe("success");
  });

  test("returns success for non-error content objects", () => {
    const lines: TranscriptLine[] = [{ content: { type: "text", text: "done" } }];
    expect(detectAgentStatus(lines)).toBe("success");
  });
});

describe("buildResolvedEntry", () => {
  const baseInput: SubagentStopInput = {
    session_id: "sess-123",
    agent_id: "builder-abc",
  };

  test("sets sessionId from input", () => {
    const entry = buildResolvedEntry(baseInput, [], "builder");
    expect(entry.sessionId).toBe("sess-123");
  });

  test("defaults sessionId to unknown when absent", () => {
    const entry = buildResolvedEntry({}, [], "builder");
    expect(entry.sessionId).toBe("unknown");
  });

  test("sets agents array with agentType", () => {
    const entry = buildResolvedEntry(baseInput, [], "reviewer");
    expect(entry.agents).toEqual(["reviewer"]);
  });

  test("calculates token counts from content blocks", () => {
    const lines: TranscriptLine[] = [
      { content: ["a", "b", "c"] },
      { content: "text" },
    ];
    const entry = buildResolvedEntry(baseInput, lines, "builder");
    expect(entry.tokens).toBe(4);
    expect(entry.inputTokens).toBe(2);
    expect(entry.outputTokens).toBe(1);
  });

  test("calculates duration from timestamps", () => {
    const lines: TranscriptLine[] = [
      { timestamp: "2026-01-01T00:00:00Z", content: "start" },
      { timestamp: "2026-01-01T00:00:05Z", content: "end" },
    ];
    const entry = buildResolvedEntry(baseInput, lines, "builder");
    expect(entry.durationMs).toBe(5000);
  });

  test("detects error status from last line", () => {
    const lines: TranscriptLine[] = [makeLine({ content: "task failed" })];
    const entry = buildResolvedEntry(baseInput, lines, "builder");
    expect(entry.status).toBe("error");
  });

  test("detects success status from clean last line", () => {
    const lines: TranscriptLine[] = [makeLine({ content: "all done" })];
    const entry = buildResolvedEntry(baseInput, lines, "builder");
    expect(entry.status).toBe("success");
  });

  test("counts tool calls", () => {
    const lines: TranscriptLine[] = [
      { content: [{ type: "tool_use" }, { type: "tool_use" }, { type: "text" }] },
    ];
    const entry = buildResolvedEntry(baseInput, lines, "builder");
    expect(entry.toolCalls).toBe(2);
  });

  test("sets costUsd to 0 and filesChanged to 0", () => {
    const entry = buildResolvedEntry(baseInput, [], "builder");
    expect(entry.costUsd).toBe(0);
    expect(entry.filesChanged).toBe(0);
  });
});

describe("normalizeAgentType", () => {
  test("rejects raw hex hash from rawAgentType", () => {
    expect(normalizeAgentType("a895c5c088ff732db", "")).toBe(null);
  });

  test("accepts canonical name from rawAgentType", () => {
    expect(normalizeAgentType("builder", "any-id")).toBe("builder");
  });

  test("extracts from prefixed agentId fallback when rawAgentType empty", () => {
    expect(normalizeAgentType("", "builder-a3f8c2")).toBe("builder");
  });

  test("returns null when both inputs are pure hash", () => {
    expect(normalizeAgentType("af5c7e7a3d8c6fb07", "a895c5c088ff732db")).toBe(null);
  });

  test("extracts canonical from prefixed rawAgentType", () => {
    expect(normalizeAgentType("Explore-xyz123", "")).toBe("Explore");
  });
});
