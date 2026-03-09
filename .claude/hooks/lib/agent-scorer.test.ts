import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, unlinkSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import {
  classifyTaskType,
  extractMetrics,
  calculateCompositeScore,
  detectTrend,
  loadScores,
  saveScores,
  updateScores,
  getRoutingSuggestion,
} from "./agent-scorer";
import type { AgentScore, AgentMetrics } from "./agent-scorer";
import type { ResolvedTraceEntry } from "../trace-logger";

function mockTrace(overrides: Partial<ResolvedTraceEntry> = {}): ResolvedTraceEntry {
  return {
    ts: "2026-03-08T10:00:00Z",
    sessionId: "test-session",
    prompt: "test prompt",
    agents: ["builder"],
    skills: [],
    tokens: 4000,
    inputTokens: 1000,
    outputTokens: 3000,
    costUsd: 0.048,
    durationMs: 50000,
    model: "sonnet",
    status: "completed",
    toolCalls: 10,
    filesChanged: 3,
    ...overrides,
  };
}

describe("classifyTaskType", () => {
  test("maps builder to implementation", () => {
    expect(classifyTaskType("builder")).toBe("implementation");
  });

  test("maps reviewer to review", () => {
    expect(classifyTaskType("reviewer")).toBe("review");
  });

  test("maps scout to exploration", () => {
    expect(classifyTaskType("scout")).toBe("exploration");
  });

  test("maps error-analyzer to debugging", () => {
    expect(classifyTaskType("error-analyzer")).toBe("debugging");
  });

  test("defaults to implementation for unknown agent", () => {
    expect(classifyTaskType("unknown-agent")).toBe("implementation");
  });
});

describe("extractMetrics", () => {
  test("extracts metrics from traces", () => {
    const traces = [
      mockTrace({
        status: "completed",
        tokens: 4000,
        costUsd: 0.05,
        durationMs: 50000,
      }),
      mockTrace({
        status: "completed",
        tokens: 6000,
        costUsd: 0.08,
        durationMs: 70000,
      }),
      mockTrace({
        status: "error",
        tokens: 2000,
        costUsd: 0.02,
        durationMs: 30000,
      }),
    ];

    const metrics = extractMetrics(traces, "builder");
    expect(metrics.sessionCount).toBe(3);
    expect(metrics.successRate).toBeCloseTo(0.667, 2);
    expect(metrics.avgTokens).toBeCloseTo(4000, 0);
  });

  test("returns zero metrics for absent agent", () => {
    const traces = [mockTrace({ agents: ["reviewer"] })];
    const metrics = extractMetrics(traces, "builder");
    expect(metrics.sessionCount).toBe(0);
    expect(metrics.successRate).toBe(0);
  });

  test("handles empty traces array", () => {
    const metrics = extractMetrics([], "builder");
    expect(metrics.sessionCount).toBe(0);
  });
});

describe("calculateCompositeScore", () => {
  test("perfect metrics yields high score", () => {
    const metrics: AgentMetrics = {
      successRate: 1.0,
      avgRetries: 0,
      avgTokens: 1000,
      avgDuration: 10000,
      avgCost: 0.01,
      sessionCount: 10,
    };
    const score = calculateCompositeScore(metrics);
    expect(score).toBeGreaterThan(80);
  });

  test("poor metrics yields low score", () => {
    const metrics: AgentMetrics = {
      successRate: 0.2,
      avgRetries: 3,
      avgTokens: 50000,
      avgDuration: 300000,
      avgCost: 1.0,
      sessionCount: 10,
    };
    const score = calculateCompositeScore(metrics);
    expect(score).toBeLessThan(30);
  });

  test("zero metrics yields 60 from efficiency defaults", () => {
    const metrics: AgentMetrics = {
      successRate: 0,
      avgRetries: 0,
      avgTokens: 0,
      avgDuration: 0,
      avgCost: 0,
      sessionCount: 0,
    };
    const score = calculateCompositeScore(metrics);
    expect(score).toBe(60);
  });
});

describe("detectTrend", () => {
  test("detects improving trend", () => {
    expect(detectTrend([50, 55, 60, 70])).toBe("improving");
  });

  test("detects declining trend", () => {
    expect(detectTrend([70, 65, 60, 50])).toBe("declining");
  });

  test("detects stable trend", () => {
    expect(detectTrend([60, 61, 59, 60])).toBe("stable");
  });

  test("returns insufficient_data for <3 scores", () => {
    expect(detectTrend([60, 65])).toBe("insufficient_data");
    expect(detectTrend([])).toBe("insufficient_data");
  });
});

describe("storage", () => {
  const scoresPath = join(homedir(), ".claude", "agent-scores.jsonl");
  let originalContent: string | null = null;

  beforeEach(() => {
    try {
      if (existsSync(scoresPath)) {
        originalContent = readFileSync(scoresPath, "utf-8");
      }
    } catch {
      originalContent = null;
    }
  });

  afterEach(() => {
    try {
      if (originalContent !== null) {
        writeFileSync(scoresPath, originalContent);
      } else if (existsSync(scoresPath)) {
        unlinkSync(scoresPath);
      }
    } catch {
      // cleanup best effort
    }
  });

  test("saveScores and loadScores round-trip", () => {
    const scores: AgentScore[] = [
      {
        agent: "builder",
        taskType: "implementation",
        compositeScore: 85,
        successRate: 0.9,
        retryEfficiency: 0.8,
        costEfficiency: 0.7,
        speedEfficiency: 0.75,
        sampleSize: 15,
        trend: "stable",
        lastUpdated: "2026-03-08T10:00:00Z",
        recentScores: [82, 84, 85],
      },
    ];

    saveScores(scores);
    const loaded = loadScores();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].agent).toBe("builder");
    expect(loaded[0].compositeScore).toBe(85);
  });
});

describe("getRoutingSuggestion", () => {
  test("returns no_data for insufficient samples", () => {
    const scores: AgentScore[] = [
      {
        agent: "builder",
        taskType: "implementation",
        compositeScore: 90,
        successRate: 1.0,
        retryEfficiency: 1.0,
        costEfficiency: 1.0,
        speedEfficiency: 1.0,
        sampleSize: 3,
        trend: "stable",
        lastUpdated: "2026-03-08T10:00:00Z",
        recentScores: [90],
      },
    ];

    const suggestion = getRoutingSuggestion("builder", scores);
    expect(suggestion.suggestion).toBe("no_data");
  });

  test("returns confident for high score", () => {
    const scores: AgentScore[] = [
      {
        agent: "builder",
        taskType: "implementation",
        compositeScore: 85,
        successRate: 0.9,
        retryEfficiency: 0.9,
        costEfficiency: 0.8,
        speedEfficiency: 0.8,
        sampleSize: 20,
        trend: "stable",
        lastUpdated: "2026-03-08T10:00:00Z",
        recentScores: [82, 84, 85],
      },
    ];

    const suggestion = getRoutingSuggestion("builder", scores);
    expect(suggestion.suggestion).toBe("confident");
  });

  test("returns warning for low score", () => {
    const scores: AgentScore[] = [
      {
        agent: "builder",
        taskType: "implementation",
        compositeScore: 35,
        successRate: 0.3,
        retryEfficiency: 0.4,
        costEfficiency: 0.3,
        speedEfficiency: 0.3,
        sampleSize: 10,
        trend: "declining",
        lastUpdated: "2026-03-08T10:00:00Z",
        recentScores: [45, 40, 35],
      },
    ];

    const suggestion = getRoutingSuggestion("builder", scores);
    expect(suggestion.suggestion).toBe("warning");
  });

  test("returns no_data for unknown agent", () => {
    const suggestion = getRoutingSuggestion("unknown-agent", []);
    expect(suggestion.suggestion).toBe("no_data");
  });
});

describe("updateScores", () => {
  const scoresPath = join(homedir(), ".claude", "agent-scores.jsonl");
  let originalContent: string | null = null;

  beforeEach(() => {
    try {
      if (existsSync(scoresPath)) {
        originalContent = readFileSync(scoresPath, "utf-8");
      }
    } catch {
      originalContent = null;
    }
    try {
      unlinkSync(scoresPath);
    } catch {
      // may not exist
    }
  });

  afterEach(() => {
    try {
      if (originalContent !== null) {
        writeFileSync(scoresPath, originalContent);
      } else if (existsSync(scoresPath)) {
        unlinkSync(scoresPath);
      }
    } catch {
      // cleanup best effort
    }
  });

  test("creates scores for agents in traces", () => {
    const traces = [
      mockTrace({ agents: ["builder"], status: "completed" }),
      mockTrace({ agents: ["builder", "reviewer"], status: "completed" }),
      mockTrace({ agents: ["builder"], status: "error" }),
    ];

    const scores = updateScores(traces);
    const builderScore = scores.find((s) => s.agent === "builder");
    expect(builderScore).toBeDefined();
    expect(builderScore!.sampleSize).toBe(3);
    expect(builderScore!.compositeScore).toBeGreaterThan(0);
  });
});
