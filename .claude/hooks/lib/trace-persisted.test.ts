import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  readRawTranscriptFromPath,
  normalizeTranscriptEntry,
  extractAuthoritativeMetadata,
  normalizeModelName,
} from "./trace-persisted";

const FIXTURE_DIR = tmpdir();
const VALID_FIXTURE = join(FIXTURE_DIR, "trace-persisted-valid.jsonl");
const MIXED_FIXTURE = join(FIXTURE_DIR, "trace-persisted-mixed.jsonl");

const envelopeAssistant = {
  parentUuid: "u1",
  isSidechain: false,
  type: "assistant",
  message: {
    model: "claude-opus-4-6",
    id: "msg_1",
    role: "assistant",
    content: [{ type: "text", text: "hi" }],
    usage: {
      input_tokens: 100,
      cache_creation_input_tokens: 500,
      cache_read_input_tokens: 2000,
      output_tokens: 50,
    },
  },
  uuid: "a1",
  timestamp: "2026-04-11T10:00:10.000Z",
};

const envelopeUser = {
  parentUuid: null,
  isSidechain: false,
  type: "user",
  message: { role: "user", content: "refactor auth module" },
  uuid: "u1",
  timestamp: "2026-04-11T10:00:00.000Z",
};

const metaEntry = {
  type: "permission-mode",
  uuid: "meta-1",
  timestamp: "2026-04-11T10:00:05.000Z",
};

beforeAll(() => {
  const validLines = [
    JSON.stringify(envelopeUser),
    JSON.stringify(envelopeAssistant),
    JSON.stringify(metaEntry),
  ].join("\n");
  writeFileSync(VALID_FIXTURE, validLines, "utf8");

  const mixedLines = [
    JSON.stringify(envelopeUser),
    "{not valid json",
    JSON.stringify(envelopeAssistant),
    "",
    "   ",
  ].join("\n");
  writeFileSync(MIXED_FIXTURE, mixedLines, "utf8");
});

afterAll(() => {
  try {
    unlinkSync(VALID_FIXTURE);
  } catch {
    // best effort
  }
  try {
    unlinkSync(MIXED_FIXTURE);
  } catch {
    // best effort
  }
});

describe("readRawTranscriptFromPath", () => {
  test("missing file returns empty array", async () => {
    const result = await readRawTranscriptFromPath(
      join(FIXTURE_DIR, "does-not-exist-xyz-123.jsonl"),
    );
    expect(result).toEqual([]);
  });

  test("valid JSONL file returns all entries", async () => {
    const result = await readRawTranscriptFromPath(VALID_FIXTURE);
    expect(result).toHaveLength(3);
    const first = result[0] as Record<string, unknown>;
    expect(first.type).toBe("user");
  });

  test("mixed valid and malformed lines skips malformed", async () => {
    const result = await readRawTranscriptFromPath(MIXED_FIXTURE);
    expect(result).toHaveLength(2);
    const types = result.map((e) => (e as Record<string, unknown>).type);
    expect(types).toEqual(["user", "assistant"]);
  });
});

describe("normalizeTranscriptEntry", () => {
  test("envelope assistant returns flat role+content", () => {
    const result = normalizeTranscriptEntry(envelopeAssistant);
    expect(result).not.toBeNull();
    expect(result!.role).toBe("assistant");
    expect(Array.isArray(result!.content)).toBe(true);
  });

  test("envelope user with string content returns flat shape", () => {
    const result = normalizeTranscriptEntry(envelopeUser);
    expect(result).not.toBeNull();
    expect(result!.role).toBe("user");
    expect(result!.content).toBe("refactor auth module");
  });

  test("legacy flat role+content passthrough", () => {
    const flat = { role: "user", content: "hello" };
    const result = normalizeTranscriptEntry(flat);
    expect(result).toEqual({ role: "user", content: "hello" });
  });

  test("legacy flat with content blocks passthrough", () => {
    const flat = {
      role: "assistant",
      content: [{ type: "text", text: "hi" }],
    };
    const result = normalizeTranscriptEntry(flat);
    expect(result!.role).toBe("assistant");
    expect(Array.isArray(result!.content)).toBe(true);
  });

  test("meta entry returns null", () => {
    expect(normalizeTranscriptEntry(metaEntry)).toBeNull();
  });

  test("null input returns null", () => {
    expect(normalizeTranscriptEntry(null)).toBeNull();
  });

  test("non-object input returns null", () => {
    expect(normalizeTranscriptEntry("string")).toBeNull();
    expect(normalizeTranscriptEntry(42)).toBeNull();
    expect(normalizeTranscriptEntry([])).toBeNull();
  });
});

describe("extractAuthoritativeMetadata", () => {
  test("sums input_tokens + cache_creation + cache_read", () => {
    const result = extractAuthoritativeMetadata([envelopeAssistant]);
    expect(result.model).toBe("opus");
    expect(result.inputTokens).toBe(100 + 500 + 2000);
    expect(result.outputTokens).toBe(50);
  });

  test("no assistant entries returns all nulls for usage", () => {
    const result = extractAuthoritativeMetadata([envelopeUser]);
    expect(result.model).toBeNull();
    expect(result.inputTokens).toBeNull();
    expect(result.outputTokens).toBeNull();
  });

  test("durationMs equals lastTs - firstTs", () => {
    const result = extractAuthoritativeMetadata([
      envelopeUser,
      envelopeAssistant,
    ]);
    expect(result.durationMs).toBe(10_000);
  });

  test("missing usage falls back to null tokens", () => {
    const noUsage = {
      type: "assistant",
      message: {
        model: "claude-sonnet-4-5",
        role: "assistant",
        content: [{ type: "text", text: "hi" }],
      },
      timestamp: "2026-04-11T10:00:00.000Z",
    };
    const result = extractAuthoritativeMetadata([noUsage]);
    expect(result.model).toBe("sonnet");
    expect(result.inputTokens).toBeNull();
    expect(result.outputTokens).toBeNull();
  });

  test("single timestamp yields null duration", () => {
    const result = extractAuthoritativeMetadata([envelopeUser]);
    expect(result.durationMs).toBeNull();
  });
});

describe("normalizeModelName", () => {
  test("claude-opus-4-6 maps to opus", () => {
    expect(normalizeModelName("claude-opus-4-6")).toBe("opus");
  });

  test("claude-sonnet-4-5 maps to sonnet", () => {
    expect(normalizeModelName("claude-sonnet-4-5")).toBe("sonnet");
  });

  test("claude-haiku-4-5-20251001 maps to haiku", () => {
    expect(normalizeModelName("claude-haiku-4-5-20251001")).toBe("haiku");
  });

  test("unknown model falls back to sonnet", () => {
    expect(normalizeModelName("mystery-model")).toBe("sonnet");
  });
});
