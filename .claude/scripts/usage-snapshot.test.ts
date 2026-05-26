#!/usr/bin/env bun
import { describe, expect, test } from "bun:test";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import path from "path";
import { tmpdir } from "os";
import {
  aggregateDaily,
  computeAggregates,
  countHooks,
  readJsonlFile,
  type TraceEvent,
} from "./usage-snapshot";

function ev(partial: Partial<TraceEvent>): TraceEvent {
  return {
    ts: "2026-05-01T10:00:00.000Z",
    sessionId: "s1",
    tokens: 1000,
    inputTokens: 800,
    outputTokens: 200,
    costUsd: 0.5,
    durationMs: 5000,
    model: "sonnet",
    status: "completed",
    toolCalls: 10,
    filesChanged: 1,
    ...partial,
  };
}

function tracesMap(entries: Array<[string, TraceEvent[]]>): Map<string, TraceEvent[]> {
  return new Map(entries);
}

describe("aggregateDaily — basic semantics", () => {
  test("uses last event's costUsd directly (Bug 1 fix)", () => {
    const events = [
      ev({ ts: "2026-05-01T10:00:00Z", inputTokens: 100, outputTokens: 50, costUsd: 1 }),
      ev({ ts: "2026-05-01T11:00:00Z", inputTokens: 500, outputTokens: 100, costUsd: 7.5 }),
    ];
    const rows = aggregateDaily(tracesMap([["2026-05-01|s1", events]]));
    expect(rows).toHaveLength(1);
    expect(rows[0].totals.costUsd).toBe(7.5); // last event, no recompute
    expect(rows[0].totals.inputTokens).toBe(500); // last event cumulative
    expect(rows[0].totals.outputTokens).toBe(100);
  });

  test("cross-day session contributes to each day separately", () => {
    const day1 = [ev({ ts: "2026-05-01T23:30:00Z", inputTokens: 100, costUsd: 1 })];
    const day2 = [ev({ ts: "2026-05-02T00:30:00Z", inputTokens: 300, costUsd: 3 })];
    const rows = aggregateDaily(
      tracesMap([
        ["2026-05-01|s1", day1],
        ["2026-05-02|s1", day2],
      ])
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].totals.costUsd).toBe(1);
    expect(rows[1].totals.costUsd).toBe(3);
  });

  test("byModel primarySessions counts each session once (Bug 6 fix)", () => {
    const events = [
      ev({ ts: "2026-05-01T10:00:00Z", model: "opus", costUsd: 2 }),
      ev({ ts: "2026-05-01T11:00:00Z", model: "sonnet", costUsd: 1 }),
    ];
    const rows = aggregateDaily(tracesMap([["2026-05-01|s1", events]]));
    const m = rows[0].byModel;
    expect(m.sonnet.primarySessions).toBe(1); // last event model = "primary"
    expect(m.opus.primarySessions).toBe(0);
    expect(m.opus.contributingSessions).toBe(1);
    expect(m.sonnet.contributingSessions).toBe(1);
    // Total primarySessions across all models = 1 (no double count)
    const totalPrimary = Object.values(m).reduce((s, x) => s + x.primarySessions, 0);
    expect(totalPrimary).toBe(1);
  });

  test("agentStatus tracks per-agent status (Bug 2 fix)", () => {
    const completed = [ev({ ts: "2026-05-01T10:00:00Z", agents: ["builder"], status: "completed" })];
    const failed = [ev({ ts: "2026-05-01T11:00:00Z", sessionId: "s2", agents: ["builder", "scout"], status: "failed" })];
    const rows = aggregateDaily(
      tracesMap([
        ["2026-05-01|s1", completed],
        ["2026-05-01|s2", failed],
      ])
    );
    expect(rows[0].agentStatus.builder.completed).toBe(1);
    expect(rows[0].agentStatus.builder.failed).toBe(1);
    expect(rows[0].agentStatus.scout.failed).toBe(1);
    expect(rows[0].agentStatus.scout.completed).toBe(0);
  });

  test("toolTimings.byTool aggregated correctly (Bug 4 fix)", () => {
    const events = [
      ev({
        ts: "2026-05-01T10:00:00Z",
        toolTimings: {
          count: 10,
          totalMs: 1000,
          avgMs: 100,
          p95Ms: 250,
          slowestTool: "Bash",
          failureCount: 1,
          byTool: {
            Read: { count: 5, avgMs: 10, failures: 0 },
            Bash: { count: 5, avgMs: 200, failures: 1 },
          },
        },
      }),
    ];
    const rows = aggregateDaily(tracesMap([["2026-05-01|s1", events]]));
    expect(rows[0].byTool.Bash.totalCalls).toBe(5);
    expect(rows[0].byTool.Bash.avgMs).toBe(200);
    expect(rows[0].byTool.Bash.failureCount).toBe(1);
    expect(rows[0].toolTimings?.slowestTool).toBe("Bash"); // Bug 5 — real value, not hardcoded
  });

  test("cheapModelRatio aggregated per day (Bug 7 fix)", () => {
    const events = [ev({ ts: "2026-05-01T10:00:00Z", cheapModelRatio: 0.7 })];
    const rows = aggregateDaily(tracesMap([["2026-05-01|s1", events]]));
    expect(rows[0].modelMix.avgCheapRatio).toBe(0.7);
  });

  test("idempotency: same input → bit-identical output", () => {
    const events = [
      ev({ ts: "2026-05-01T10:00:00Z", costUsd: 1 }),
      ev({ ts: "2026-05-01T11:00:00Z", costUsd: 2 }),
    ];
    const a = aggregateDaily(tracesMap([["2026-05-01|s1", events]]));
    const b = aggregateDaily(tracesMap([["2026-05-01|s1", events]]));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("computeAggregates — per-agent rate (Bug 2 effective)", () => {
  test("agentSuccessRate distinct per agent, not global proxy", () => {
    const referenceNow = new Date("2026-05-15T00:00:00Z");
    const rows = aggregateDaily(
      tracesMap([
        // Builder: 2 completed
        ["2026-05-10|s1", [ev({ ts: "2026-05-10T10:00:00Z", agents: ["builder"], status: "completed" })]],
        ["2026-05-11|s2", [ev({ ts: "2026-05-11T10:00:00Z", agents: ["builder"], status: "completed" })]],
        // Scout: 1 completed, 1 failed → 0.5
        ["2026-05-10|s3", [ev({ ts: "2026-05-10T11:00:00Z", agents: ["scout"], status: "completed" })]],
        ["2026-05-11|s4", [ev({ ts: "2026-05-11T11:00:00Z", agents: ["scout"], status: "failed" })]],
      ])
    );
    const agg = computeAggregates(rows, referenceNow);
    expect(agg.health.agentSuccessRate.builder).toBe(1);
    expect(agg.health.agentSuccessRate.scout).toBe(0.5);
    expect(agg.health.agentSuccessRate.builder).not.toBe(agg.health.agentSuccessRate.scout);
  });

  test("costTrend === 'stale_data' when latest data is old (Bug 3 fix)", () => {
    const referenceNow = new Date("2026-05-30T00:00:00Z");
    const rows = aggregateDaily(
      tracesMap([
        ["2026-04-01|s1", [ev({ ts: "2026-04-01T10:00:00Z", costUsd: 5 })]],
      ])
    );
    const agg = computeAggregates(rows, referenceNow);
    expect(agg.roi.costTrend).toBe("stale_data");
  });

  test("agentSuccessRatePrevWindow populated for regression rule (Bloque D)", () => {
    const referenceNow = new Date("2026-05-30T00:00:00Z");
    // Prev window: 2026-04-01 to 2026-04-30 — builder completed
    // Recent: 2026-05-01 to 2026-05-30 — builder failed
    const rows = aggregateDaily(
      tracesMap([
        ["2026-04-15|s1", [ev({ ts: "2026-04-15T10:00:00Z", agents: ["builder"], status: "completed" })]],
        ["2026-05-15|s2", [ev({ ts: "2026-05-15T10:00:00Z", agents: ["builder"], status: "failed" })]],
      ])
    );
    const agg = computeAggregates(rows, referenceNow);
    expect(agg.health.agentSuccessRatePrevWindow.builder).toBe(1);
    expect(agg.health.agentSuccessRate.builder).toBe(0);
  });

  test("config.skills.total uses multi-source count", () => {
    const referenceNow = new Date("2026-05-15T00:00:00Z");
    const rows = aggregateDaily(tracesMap([]));
    const agg = computeAggregates(rows, referenceNow);
    // Should be ≥ 0, and structured with breakdown
    expect(agg.config.skills.total).toBeGreaterThanOrEqual(0);
    expect(agg.config.skills.project).toBeGreaterThanOrEqual(0);
    expect(typeof agg.config.skills.commandsProject).toBe("number");
  });
});

describe("countHooks — reads from settings.json (Bug 9 fix)", () => {
  test("counts hooks per event from settings.json", () => {
    const dir = path.join(tmpdir(), `usage-snapshot-test-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const settingsPath = path.join(dir, "settings.json");
    writeFileSync(
      settingsPath,
      JSON.stringify({
        hooks: {
          PreToolUse: [{ matcher: "Edit", hooks: [{ type: "command", command: "x" }] }],
          PostToolUse: [{ matcher: "Edit", hooks: [{ type: "command", command: "y" }] }],
          Stop: [{ matcher: "", hooks: [{ type: "command", command: "z" }] }],
        },
      })
    );
    const result = countHooks(settingsPath);
    expect(result.registered).toBe(3);
    expect(result.matchers).toEqual([
      { event: "PreToolUse", count: 1 },
      { event: "PostToolUse", count: 1 },
      { event: "Stop", count: 1 },
    ]);
    rmSync(dir, { recursive: true, force: true });
  });

  test("returns 0 when settings.json missing", () => {
    const result = countHooks("/nonexistent/path/settings.json");
    expect(result.registered).toBe(0);
    expect(result.matchers).toEqual([]);
  });
});

describe("readJsonlFile — robustness", () => {
  test("returns empty for nonexistent file", () => {
    expect(readJsonlFile("/nonexistent/path.jsonl")).toEqual([]);
  });

  test("skips malformed lines, keeps valid ones", () => {
    const dir = path.join(tmpdir(), `usage-snapshot-test-jsonl-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, "test.jsonl");
    writeFileSync(filePath, `{"valid":1}\n{this is broken\n{"valid":2}\n`);
    const result = readJsonlFile(filePath);
    expect(result).toEqual([{ valid: 1 }, { valid: 2 }]);
    rmSync(dir, { recursive: true, force: true });
  });
});
