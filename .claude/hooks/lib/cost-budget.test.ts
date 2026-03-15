import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadBudgetConfig, checkBudget } from "./cost-budget";

let tempDir: string;

beforeEach(() => {
  tempDir = join(tmpdir(), "cost-budget-test-" + Date.now());
  mkdirSync(tempDir, { recursive: true });
});

afterEach(() => {
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // cleanup best effort
  }
});

describe("loadBudgetConfig", () => {
  test("returns defaults when no config file exists", () => {
    const config = loadBudgetConfig();
    expect(config.daily).toBe(20.0);
    expect(config.weekly).toBe(100.0);
    expect(config.alertAt).toBe(0.8);
    expect(config.enabled).toBe(true);
  });
});

describe("checkBudget", () => {
  test("returns zero costs when no traces exist", () => {
    const status = checkBudget(tempDir);
    expect(status.dailyCost).toBe(0);
    expect(status.weeklyCost).toBe(0);
    expect(status.dailyPercent).toBe(0);
    expect(status.weeklyPercent).toBe(0);
    expect(status.alerts).toHaveLength(0);
  });

  test("returns zero costs when traces dir is empty", () => {
    const status = checkBudget(tempDir);
    expect(status.dailyCost).toBe(0);
    expect(status.weeklyCost).toBe(0);
    expect(status.alerts).toEqual([]);
  });

  test("sums costs from today trace file", () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const traceFile = join(tempDir, `${todayStr}.jsonl`);
    const lines = [
      JSON.stringify({ costUsd: 1.5 }),
      JSON.stringify({ costUsd: 2.0 }),
      JSON.stringify({ costUsd: 0.5 }),
    ].join("\n");
    writeFileSync(traceFile, lines + "\n");

    const status = checkBudget(tempDir);
    expect(status.dailyCost).toBeCloseTo(4.0, 2);
    expect(status.weeklyCost).toBeCloseTo(4.0, 2);
  });

  test("generates alert when daily exceeds alertAt threshold", () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const traceFile = join(tempDir, `${todayStr}.jsonl`);
    const lines = [JSON.stringify({ costUsd: 17.0 })].join("\n");
    writeFileSync(traceFile, lines + "\n");

    const status = checkBudget(tempDir);
    expect(status.dailyPercent).toBeGreaterThanOrEqual(0.8);
    expect(status.alerts.length).toBeGreaterThanOrEqual(1);
    expect(status.alerts[0]).toContain("daily budget");
  });

  test("generates alert when daily exceeds 100%", () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const traceFile = join(tempDir, `${todayStr}.jsonl`);
    const lines = [JSON.stringify({ costUsd: 25.0 })].join("\n");
    writeFileSync(traceFile, lines + "\n");

    const status = checkBudget(tempDir);
    expect(status.dailyPercent).toBeGreaterThanOrEqual(1.0);
    expect(status.alerts.some((a) => a.includes("exceeded"))).toBe(true);
  });

  test("returns no alerts when under threshold", () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const traceFile = join(tempDir, `${todayStr}.jsonl`);
    writeFileSync(traceFile, JSON.stringify({ costUsd: 1.0 }) + "\n");

    const status = checkBudget(tempDir);
    expect(status.alerts).toHaveLength(0);
  });

  test("skips malformed JSON lines", () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const traceFile = join(tempDir, `${todayStr}.jsonl`);
    const content = [
      JSON.stringify({ costUsd: 2.0 }),
      "not valid json",
      JSON.stringify({ costUsd: 3.0 }),
    ].join("\n");
    writeFileSync(traceFile, content + "\n");

    const status = checkBudget(tempDir);
    expect(status.dailyCost).toBeCloseTo(5.0, 2);
  });

  test("returns default limits from config", () => {
    const status = checkBudget(tempDir);
    expect(status.dailyLimit).toBe(20.0);
    expect(status.weeklyLimit).toBe(100.0);
  });
});
