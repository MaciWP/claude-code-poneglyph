import { describe, test, expect } from "bun:test";
import {
  generateBudgetReport,
  formatBudgetReport,
} from "./budget-reporter";

describe("generateBudgetReport", () => {
  test("produces correct report for known agent (builder)", () => {
    const report = generateBudgetReport("sess-1", [
      { agent: "builder", contextSize: 400 },
    ]);

    expect(report.sessionId).toBe("sess-1");
    expect(report.agentReports).toHaveLength(1);
    expect(report.agentReports[0].agent).toBe("builder");
    expect(report.agentReports[0].budget.maxTokens).toBe(8000);
    expect(report.agentReports[0].tokensEstimated).toBe(100);
    expect(report.timestamp).toBeTruthy();
  });

  test("uses default budget for unknown agent", () => {
    const report = generateBudgetReport("sess-2", [
      { agent: "unknown-agent", contextSize: 400 },
    ]);

    expect(report.agentReports[0].budget.maxTokens).toBe(5000);
  });

  test("marks overBudget true when tokens exceed max", () => {
    const report = generateBudgetReport("sess-3", [
      { agent: "scout", contextSize: 40000 },
    ]);

    expect(report.agentReports[0].overBudget).toBe(true);
    expect(report.agentReports[0].tokensEstimated).toBeGreaterThan(
      report.agentReports[0].budget.maxTokens,
    );
  });

  test("returns empty agentReports for empty usages", () => {
    const report = generateBudgetReport("sess-4", []);

    expect(report.agentReports).toHaveLength(0);
    expect(report.totalTokensEstimated).toBe(0);
  });

  test("calculates utilization correctly", () => {
    const report = generateBudgetReport("sess-5", [
      { agent: "builder", contextSize: 32000 },
    ]);

    const r = report.agentReports[0];
    const expectedTokens = Math.ceil(32000 / 4);
    const expectedPct = Math.round((expectedTokens / 8000) * 100);
    expect(r.tokensEstimated).toBe(expectedTokens);
    expect(r.utilizationPct).toBe(expectedPct);
  });

  test("sums totalTokensEstimated across all agents", () => {
    const report = generateBudgetReport("sess-6", [
      { agent: "builder", contextSize: 400 },
      { agent: "scout", contextSize: 800 },
    ]);

    const expected =
      report.agentReports[0].tokensEstimated +
      report.agentReports[1].tokensEstimated;
    expect(report.totalTokensEstimated).toBe(expected);
  });
});

describe("formatBudgetReport", () => {
  test("produces readable string", () => {
    const report = generateBudgetReport("sess-fmt", [
      { agent: "builder", contextSize: 400 },
    ]);

    const output = formatBudgetReport(report);
    expect(output).toContain("budget:");
    expect(output).toContain("builder");
    expect(output).toContain("/8000");
  });

  test("returns no agent data for empty report", () => {
    const report = generateBudgetReport("sess-empty", []);
    expect(formatBudgetReport(report)).toBe("budget: no agent data");
  });

  test("includes OVER marker for over-budget agents", () => {
    const report = generateBudgetReport("sess-over", [
      { agent: "scout", contextSize: 40000 },
    ]);

    const output = formatBudgetReport(report);
    expect(output).toContain("OVER");
  });
});
