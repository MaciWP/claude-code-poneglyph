#!/usr/bin/env bun
import { describe, expect, test } from "bun:test";
import { detectAlerts, THRESHOLDS } from "./anomaly-detector";

interface DayInput {
  date: string;
  sessions: number;
  totals: { costUsd: number; filesChanged: number };
  byStatus: { completed: number; failed: number; timeout: number; other: number };
  byAgent: Record<string, number>;
  bySkill: Record<string, number>;
  byModel: Record<string, { primarySessions?: number; sessions?: number; costUsd: number }>;
}

interface AggInput {
  dataRange: { earliest: string; latest: string; staleDays: number };
  health: {
    agentSuccessRate: Record<string, number>;
    agentSessionCounts: Record<string, number>;
    agentSuccessRatePrevWindow?: Record<string, number>;
  };
  roi: { costTrend: string; totalCostUsd: number; totalFilesChanged: number };
  config: {
    skills?: { total?: number };
    skillsUsedLast30d: string[];
    skillsUnusedLast30d: string[];
    hooks?: { registered?: number };
  };
  budget: { limitUsdPerDay: number; daysOverBudget: number };
  topToolsByDuration?: Array<{
    tool: string;
    totalCalls: number;
    avgMs: number;
    p95Ms: number;
    failureCount: number;
    failureRate: number;
  }>;
}

function day(partial: Partial<DayInput>): DayInput {
  return {
    date: "2026-05-15",
    sessions: 1,
    totals: { costUsd: 1, filesChanged: 1 },
    byStatus: { completed: 1, failed: 0, timeout: 0, other: 0 },
    byAgent: {},
    bySkill: {},
    byModel: {},
    ...partial,
  };
}

function agg(partial: Partial<AggInput>): AggInput {
  return {
    dataRange: { earliest: "2026-05-01", latest: "2026-05-15", staleDays: 0 },
    health: { agentSuccessRate: {}, agentSessionCounts: {}, agentSuccessRatePrevWindow: {} },
    roi: { costTrend: "stable", totalCostUsd: 100, totalFilesChanged: 10 },
    config: { skills: { total: 10 }, skillsUsedLast30d: [], skillsUnusedLast30d: [] },
    budget: { limitUsdPerDay: 50, daysOverBudget: 0 },
    topToolsByDuration: [],
    ...partial,
  };
}

describe("anomaly-detector — clean data baseline", () => {
  test("no anomalies on clean data", () => {
    const daily = [day({ totals: { costUsd: 5, filesChanged: 2 } })];
    const a = agg({
      health: {
        agentSuccessRate: { builder: 0.95 },
        agentSessionCounts: { builder: 20 },
        agentSuccessRatePrevWindow: { builder: 0.94 },
      },
      config: {
        skills: { total: 10 },
        skillsUsedLast30d: ["a", "b", "c", "d", "e", "f", "g"],
        skillsUnusedLast30d: ["h", "i", "j"],
      },
    });
    const alerts = detectAlerts(daily, a);
    expect(alerts.filter((al) => al.severity === "critical")).toHaveLength(0);
  });
});

describe("anomaly-detector — individual rules fire", () => {
  test("budget_breach: day over limit", () => {
    const daily = [day({ totals: { costUsd: 100, filesChanged: 1 } })];
    const alerts = detectAlerts(daily, agg({ budget: { limitUsdPerDay: 50, daysOverBudget: 1 } }));
    expect(alerts.find((a) => a.category === "budget_breach")).toBeDefined();
  });

  test("agent_health: successRate < 0.7 with ≥10 sessions", () => {
    const alerts = detectAlerts(
      [day({})],
      agg({
        health: {
          agentSuccessRate: { scout: 0.5 },
          agentSessionCounts: { scout: 15 },
          agentSuccessRatePrevWindow: {},
        },
      })
    );
    expect(alerts.find((a) => a.category === "agent_health")).toBeDefined();
  });

  test("agent_health: NO fire when sessions < 10", () => {
    const alerts = detectAlerts(
      [day({})],
      agg({
        health: {
          agentSuccessRate: { scout: 0.3 },
          agentSessionCounts: { scout: 5 },
          agentSuccessRatePrevWindow: {},
        },
      })
    );
    expect(alerts.find((a) => a.category === "agent_health")).toBeUndefined();
  });

  test("agent_regression: drop > 0.15 fires", () => {
    const alerts = detectAlerts(
      [day({})],
      agg({
        health: {
          agentSuccessRate: { builder: 0.6 },
          agentSessionCounts: { builder: 20 },
          agentSuccessRatePrevWindow: { builder: 0.9 },
        },
      })
    );
    expect(alerts.find((a) => a.category === "agent_regression")).toBeDefined();
  });

  test("agent_regression: small drop does NOT fire", () => {
    const alerts = detectAlerts(
      [day({})],
      agg({
        health: {
          agentSuccessRate: { builder: 0.85 },
          agentSessionCounts: { builder: 20 },
          agentSuccessRatePrevWindow: { builder: 0.9 },
        },
      })
    );
    expect(alerts.find((a) => a.category === "agent_regression")).toBeUndefined();
  });

  test("skill_waste: > 50% unused fires", () => {
    const alerts = detectAlerts(
      [day({})],
      agg({
        config: {
          skills: { total: 10 },
          skillsUsedLast30d: ["a", "b"],
          skillsUnusedLast30d: ["c", "d", "e", "f", "g", "h", "i", "j"],
        },
      })
    );
    expect(alerts.find((a) => a.category === "skill_waste")).toBeDefined();
  });

  test("status_mix: failRate > 15% fires", () => {
    const daily = [
      day({ byStatus: { completed: 5, failed: 3, timeout: 2, other: 0 } }),
    ];
    const alerts = detectAlerts(daily, agg({}));
    expect(alerts.find((a) => a.category === "status_mix")).toBeDefined();
  });

  test("tool_timing_outlier: p95 > 3× global fires (Bloque D)", () => {
    const alerts = detectAlerts(
      [day({})],
      agg({
        topToolsByDuration: [
          { tool: "Read", totalCalls: 100, avgMs: 5, p95Ms: 10, failureCount: 0, failureRate: 0 },
          { tool: "Bash", totalCalls: 100, avgMs: 2000, p95Ms: 5000, failureCount: 5, failureRate: 0.05 },
          { tool: "Grep", totalCalls: 50, avgMs: 100, p95Ms: 200, failureCount: 0, failureRate: 0 },
        ],
      })
    );
    expect(alerts.find((a) => a.category === "tool_timing_outlier" && (a.data as any).tool === "Bash")).toBeDefined();
  });

  test("tool_timing_outlier: tool with <20 calls does NOT fire", () => {
    const alerts = detectAlerts(
      [day({})],
      agg({
        topToolsByDuration: [
          { tool: "Slow", totalCalls: 5, avgMs: 9999, p95Ms: 99999, failureCount: 0, failureRate: 0 },
          { tool: "Fast", totalCalls: 100, avgMs: 10, p95Ms: 20, failureCount: 0, failureRate: 0 },
        ],
      })
    );
    expect(alerts.find((a) => a.category === "tool_timing_outlier")).toBeUndefined();
  });

  test("data_stale: staleDays > 14 fires (renamed from hook_silent — Bug 12)", () => {
    const alerts = detectAlerts(
      [day({})],
      agg({ dataRange: { earliest: "2026-04-01", latest: "2026-04-01", staleDays: 30 } })
    );
    expect(alerts.find((a) => a.category === "data_stale")).toBeDefined();
    // Old name should NOT appear
    expect(alerts.find((a) => (a.category as string) === "hook_silent")).toBeUndefined();
  });

  test("model_misuse: Opus > $50/day fires as info", () => {
    const alerts = detectAlerts(
      [day({ byModel: { opus: { primarySessions: 1, costUsd: 80 } } })],
      agg({})
    );
    const found = alerts.find((a) => a.category === "model_misuse");
    expect(found).toBeDefined();
    expect(found?.severity).toBe("info");
  });

  test("cost_trend: gated by stale_data → no fire", () => {
    const alerts = detectAlerts(
      [day({})],
      agg({ roi: { costTrend: "stale_data", totalCostUsd: 100, totalFilesChanged: 5 } })
    );
    expect(alerts.find((a) => a.category === "cost_trend")).toBeUndefined();
  });

  test("cost_trend: fires when +30% and not stale", () => {
    const alerts = detectAlerts(
      [day({})],
      agg({ roi: { costTrend: "+45%", totalCostUsd: 100, totalFilesChanged: 5 } })
    );
    expect(alerts.find((a) => a.category === "cost_trend")).toBeDefined();
  });
});

describe("anomaly-detector — threshold sanity", () => {
  test("THRESHOLDS exported and reasonable", () => {
    expect(THRESHOLDS.agentSuccessRateMin).toBeGreaterThan(0.5);
    expect(THRESHOLDS.agentSuccessRateMin).toBeLessThan(1);
    expect(THRESHOLDS.toolTimingOutlierMultiplier).toBeGreaterThanOrEqual(2);
    expect(THRESHOLDS.skillWasteRatio).toBeGreaterThan(0);
    expect(THRESHOLDS.skillWasteRatio).toBeLessThan(1);
  });
});
