import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type { WorkflowPattern } from "./pattern-learning-types";
import {
  generateSuggestions,
  saveSuggestions,
  loadSuggestions,
  formatSuggestionsForContext,
  setSuggestionsPath,
  resetSuggestionsPath,
} from "./routing-suggestions";

function makePattern(
  overrides: Partial<WorkflowPattern>,
): WorkflowPattern {
  return {
    id: "test-1",
    type: "sequence",
    pattern: { agents: ["planner", "builder"] },
    outcome: {
      successRate: 0.9,
      avgTokens: 5000,
      avgDuration: 30000,
      avgCost: 0.05,
      avgRetries: 0.1,
    },
    confidence: 0.85,
    effectSize: 0.3,
    sampleSize: 12,
    firstSeen: "2026-01-01T00:00:00Z",
    lastSeen: "2026-03-15T00:00:00Z",
    ...overrides,
  };
}

const TMP_DIR = join(tmpdir(), "routing-suggestions-test");
const TMP_FILE = join(TMP_DIR, "test-suggestions.json");

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
  setSuggestionsPath(TMP_FILE);
});

afterEach(() => {
  resetSuggestionsPath();
  try {
    rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {
    // best effort
  }
});

describe("generateSuggestions", () => {
  test("generates agent_sequence from high-confidence sequence pattern", () => {
    const patterns = [
      makePattern({
        type: "sequence",
        confidence: 0.85,
        pattern: { agents: ["planner", "builder"] },
      }),
    ];

    const suggestions = generateSuggestions(patterns);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].type).toBe("agent_sequence");
    expect(suggestions[0].confidence).toBe(0.85);
    expect(suggestions[0].pattern.agents).toEqual(["planner", "builder"]);
  });

  test("filters out patterns with low confidence", () => {
    const patterns = [
      makePattern({ type: "sequence", confidence: 0.5 }),
      makePattern({
        type: "skill_combo",
        confidence: 0.4,
        pattern: { skills: ["api-design", "security-review"] },
      }),
    ];

    const suggestions = generateSuggestions(patterns);
    expect(suggestions).toHaveLength(0);
  });

  test("returns empty array for empty patterns", () => {
    expect(generateSuggestions([])).toEqual([]);
  });

  test("caps results at 10", () => {
    const patterns = Array.from({ length: 15 }, (_, i) =>
      makePattern({
        id: `p-${i}`,
        type: "sequence",
        confidence: 0.8 + i * 0.001,
        pattern: { agents: ["planner", "builder"] },
      }),
    );

    const suggestions = generateSuggestions(patterns);
    expect(suggestions.length).toBeLessThanOrEqual(10);
  });

  test("generates skill_combo suggestions", () => {
    const patterns = [
      makePattern({
        type: "skill_combo",
        confidence: 0.75,
        pattern: { skills: ["api-design", "security-review"] },
      }),
    ];

    const suggestions = generateSuggestions(patterns);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].type).toBe("skill_combo");
  });

  test("generates complexity_routing suggestions", () => {
    const patterns = [
      makePattern({
        type: "decomposition",
        confidence: 0.8,
        pattern: { complexityRange: [30, 60], taskType: "refactoring" },
      }),
    ];

    const suggestions = generateSuggestions(patterns);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].type).toBe("complexity_routing");
    expect(suggestions[0].description).toContain("refactoring");
  });

  test("sorts by confidence descending", () => {
    const patterns = [
      makePattern({
        id: "low",
        type: "sequence",
        confidence: 0.81,
        pattern: { agents: ["a", "b"] },
      }),
      makePattern({
        id: "high",
        type: "sequence",
        confidence: 0.95,
        pattern: { agents: ["c", "d"] },
      }),
    ];

    const suggestions = generateSuggestions(patterns);
    expect(suggestions[0].confidence).toBeGreaterThan(
      suggestions[1].confidence,
    );
  });
});

describe("saveSuggestions + loadSuggestions", () => {
  test("roundtrip works correctly", () => {
    const original = [
      {
        type: "agent_sequence" as const,
        description: "test",
        confidence: 0.9,
        sampleSize: 10,
        pattern: { agents: ["planner", "builder"] },
        outcome: { successRate: 0.9, avgCost: 0.05 },
      },
    ];

    saveSuggestions(original);
    const loaded = loadSuggestions();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].type).toBe("agent_sequence");
    expect(loaded[0].confidence).toBe(0.9);
  });
});

describe("loadSuggestions", () => {
  test("returns empty array for non-existent file", () => {
    setSuggestionsPath(join(TMP_DIR, "does-not-exist.json"));
    expect(loadSuggestions()).toEqual([]);
  });
});

describe("formatSuggestionsForContext", () => {
  test("produces readable markdown", () => {
    const suggestions = [
      {
        type: "agent_sequence" as const,
        description: "Secuencia planner -> builder tiene 90% success rate",
        confidence: 0.9,
        sampleSize: 10,
        pattern: { agents: ["planner", "builder"] },
        outcome: { successRate: 0.9, avgCost: 0.05 },
      },
    ];

    const output = formatSuggestionsForContext(suggestions);
    expect(output).toContain("## Routing Suggestions");
    expect(output).toContain("agent_sequence");
    expect(output).toContain("90%");
    expect(output).toContain("n=10");
  });

  test("returns empty string for empty suggestions", () => {
    expect(formatSuggestionsForContext([])).toBe("");
  });
});
