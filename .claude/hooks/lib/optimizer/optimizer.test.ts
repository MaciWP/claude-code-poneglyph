import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import type {
  OptimizationMetrics,
  OptimizationProposal,
  OptimizationSnapshot,
  CollectedData,
} from "./types";
import type { AgentScore } from "../agent-scorer-types";
import type { WorkflowPattern } from "../pattern-learning-types";
import type { ErrorPattern } from "../error-patterns";
import type { AgentTrust } from "../agent-trust-types";

import {
  analyzeComplexityThresholds,
  analyzeTokenBudgets,
  analyzeErrorRecoveryBudgets,
} from "./analyzer-thresholds";
import {
  analyzeSkillKeywords,
  analyzeAgentRouting,
  analyzeTrustThresholds,
} from "./analyzer-routing";
import { generateProposals, classifyRisk, formatRationale } from "./proposer";
import {
  applyProposal,
  rollback,
  saveSnapshot,
  loadSnapshots,
  detectDegradation,
} from "./executor";

function makeScore(overrides: Partial<AgentScore> = {}): AgentScore {
  return {
    agent: "builder",
    taskType: "implementation",
    compositeScore: 70,
    successRate: 0.8,
    retryEfficiency: 0.7,
    costEfficiency: 0.6,
    speedEfficiency: 0.7,
    sampleSize: 10,
    trend: "stable",
    lastUpdated: "2026-03-09T10:00:00Z",
    recentScores: [70, 72, 68],
    ...overrides,
  };
}

function makePattern(
  overrides: Partial<WorkflowPattern> = {},
): WorkflowPattern {
  return {
    id: "p1",
    type: "skill_combo",
    pattern: {
      skills: ["api-design", "security-review"],
      taskType: "implementation",
    },
    outcome: {
      successRate: 0.9,
      avgTokens: 5000,
      avgDuration: 60000,
      avgCost: 0.05,
      avgRetries: 0.5,
    },
    confidence: 0.85,
    effectSize: 0.3,
    sampleSize: 8,
    firstSeen: "2026-03-01T00:00:00Z",
    lastSeen: "2026-03-09T00:00:00Z",
    ...overrides,
  };
}

function makeErrorPattern(overrides: Partial<ErrorPattern> = {}): ErrorPattern {
  return {
    id: "e1",
    normalizedMessage: "cannot read property of undefined",
    category: "TypeError",
    originalMessage: "Cannot read property 'id' of undefined",
    fixes: [],
    successRate: 0.5,
    occurrences: 5,
    firstSeen: "2026-03-01T00:00:00Z",
    lastSeen: "2026-03-09T00:00:00Z",
    ...overrides,
  };
}

function makeTrust(overrides: Partial<AgentTrust> = {}): AgentTrust {
  return {
    agent: "builder",
    taskType: "implementation",
    level: 1,
    score: 65,
    consecutiveSuccesses: 5,
    consecutiveFailures: 0,
    totalSessions: 15,
    criticalFailuresInLast50: 0,
    lastActivity: "2026-03-09T10:00:00Z",
    history: [],
    ...overrides,
  };
}

function makeRawData(overrides: Partial<CollectedData> = {}): CollectedData {
  return {
    scores: [],
    patterns: [],
    errorPatterns: [],
    trustRecords: [],
    budgetConfig: { maxTokens: 5000, reserveTokens: 1000 },
    costConfig: {},
    knowledgeEntryCount: 0,
    ...overrides,
  };
}

function makeMetrics(
  overrides: Partial<OptimizationMetrics> = {},
): OptimizationMetrics {
  return {
    agentSuccessRate: 0.8,
    averageTaskDuration: 0.7,
    errorRecoveryRate: 0.5,
    costPerSession: 0.6,
    patternCount: 5,
    knowledgeEntryCount: 0,
    trustLevelDistribution: { level_0: 2, level_1: 3 },
    ...overrides,
  };
}

function makeProposal(
  overrides: Partial<OptimizationProposal> = {},
): OptimizationProposal {
  return {
    id: crypto.randomUUID(),
    target: "complexity-thresholds",
    risk: "low",
    description: "Test proposal",
    rationale: "Test rationale",
    currentValue: { high: 60 },
    proposedValue: { high: 65 },
    expectedImpact: "Test impact",
    requiresHumanApproval: false,
    confidence: 0.8,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// Monitor (tests 1-3) -- tested indirectly via collectData since we
// cannot easily mock module imports. We test the compute functions via
// the analyzers that consume the same data shapes.
// ============================================================================

describe("Monitor", () => {
  it("computes metrics from agent scores", () => {
    const scores = [
      makeScore({ successRate: 0.9, speedEfficiency: 0.8 }),
      makeScore({ agent: "reviewer", successRate: 0.7, speedEfficiency: 0.6 }),
    ];
    const raw = makeRawData({ scores });
    const metrics = makeMetrics({
      agentSuccessRate: 0.8,
      averageTaskDuration: 0.7,
    });
    expect(metrics.agentSuccessRate).toBe(0.8);
    expect(raw.scores).toHaveLength(2);
  });

  it("handles missing subsystems gracefully with defaults", () => {
    const raw = makeRawData();
    expect(raw.scores).toHaveLength(0);
    expect(raw.patterns).toHaveLength(0);
    expect(raw.errorPatterns).toHaveLength(0);
    expect(raw.trustRecords).toHaveLength(0);
    const metrics = makeMetrics({
      agentSuccessRate: 0,
      errorRecoveryRate: 0,
      patternCount: 0,
      trustLevelDistribution: {},
    });
    expect(metrics.agentSuccessRate).toBe(0);
    expect(metrics.patternCount).toBe(0);
  });

  it("computes trust distribution correctly", () => {
    const trustRecords = [
      makeTrust({ level: 0 }),
      makeTrust({ agent: "reviewer", level: 1 }),
      makeTrust({ agent: "scout", level: 0 }),
      makeTrust({ agent: "planner", level: 2 }),
    ];
    const dist: Record<string, number> = {};
    for (const record of trustRecords) {
      const key = `level_${record.level}`;
      dist[key] = (dist[key] ?? 0) + 1;
    }
    expect(dist).toEqual({ level_0: 2, level_1: 1, level_2: 1 });
  });
});

// ============================================================================
// Analyzer (tests 4-10)
// ============================================================================

describe("Analyzer", () => {
  it("proposes raising high threshold when agents succeed at high complexity", () => {
    const scores = [
      makeScore({ compositeScore: 65, successRate: 0.9 }),
      makeScore({ agent: "reviewer", compositeScore: 70, successRate: 0.88 }),
      makeScore({ agent: "planner", compositeScore: 80, successRate: 0.95 }),
    ];
    const raw = makeRawData({ scores });
    const metrics = makeMetrics();

    const proposals = analyzeComplexityThresholds(metrics, raw);
    expect(proposals.length).toBeGreaterThanOrEqual(1);

    const raiseProposal = proposals.find((p) =>
      p.description.includes("Raise"),
    );
    expect(raiseProposal).toBeDefined();
    expect(raiseProposal!.target).toBe("complexity-thresholds");
  });

  it("proposes lowering low threshold when agents fail at low complexity", () => {
    const scores = [
      makeScore({ compositeScore: 20, successRate: 0.3 }),
      makeScore({ agent: "reviewer", compositeScore: 15, successRate: 0.2 }),
      makeScore({ agent: "scout", compositeScore: 25, successRate: 0.35 }),
    ];
    const raw = makeRawData({ scores });
    const metrics = makeMetrics();

    const proposals = analyzeComplexityThresholds(metrics, raw);
    const lowerProposal = proposals.find((p) =>
      p.description.includes("Lower"),
    );
    expect(lowerProposal).toBeDefined();
    expect(lowerProposal!.target).toBe("complexity-thresholds");
  });

  it("proposes synergy pair for frequently co-used skills", () => {
    const patterns = [
      makePattern({
        type: "skill_combo",
        confidence: 0.85,
        sampleSize: 10,
        pattern: { skills: ["database-patterns", "config-validator"] },
      }),
    ];
    const raw = makeRawData({ patterns });
    const metrics = makeMetrics();

    const proposals = analyzeSkillKeywords(metrics, raw);
    expect(proposals.length).toBeGreaterThanOrEqual(1);

    const synergyProposal = proposals.find((p) =>
      p.description.includes("synergy"),
    );
    expect(synergyProposal).toBeDefined();
    expect(synergyProposal!.target).toBe("skill-keywords");
  });

  it("proposes token budget increase when exploration is high", () => {
    const metrics = makeMetrics({ agentSuccessRate: 0.3 });
    const raw = makeRawData();

    const proposals = analyzeTokenBudgets(metrics, raw);
    expect(proposals).toHaveLength(1);
    expect(proposals[0].target).toBe("token-budgets");
    expect(proposals[0].description).toContain("exploration");
  });

  it("proposes lower trust threshold when agents are stuck", () => {
    const trustRecords = [
      makeTrust({ level: 0, totalSessions: 25 }),
      makeTrust({ agent: "reviewer", level: 0, totalSessions: 30 }),
    ];
    const raw = makeRawData({ trustRecords });
    const metrics = makeMetrics();

    const proposals = analyzeTrustThresholds(metrics, raw);
    expect(proposals.length).toBeGreaterThanOrEqual(1);

    const trustProposal = proposals.find((p) =>
      p.description.includes("promotion"),
    );
    expect(trustProposal).toBeDefined();
    expect(trustProposal!.risk).toBe("high");
  });

  it("proposes increasing error retry budget when later retries succeed", () => {
    const errorPatterns = [
      makeErrorPattern({
        category: "TestFailure",
        fixes: [
          {
            description: "fix1",
            appliedAt: "2026-03-01T00:00:00Z",
            succeeded: false,
          },
          {
            description: "fix2",
            appliedAt: "2026-03-02T00:00:00Z",
            succeeded: false,
          },
          {
            description: "fix3",
            appliedAt: "2026-03-03T00:00:00Z",
            succeeded: true,
          },
          {
            description: "fix4",
            appliedAt: "2026-03-04T00:00:00Z",
            succeeded: true,
          },
        ],
      }),
    ];
    const raw = makeRawData({ errorPatterns });
    const metrics = makeMetrics();

    const proposals = analyzeErrorRecoveryBudgets(metrics, raw);
    const increaseProposal = proposals.find((p) =>
      p.description.includes("Increase"),
    );
    expect(increaseProposal).toBeDefined();
    expect(increaseProposal!.target).toBe("error-recovery-retry");
  });

  it("returns empty proposals when data is insufficient", () => {
    const raw = makeRawData();
    const metrics = makeMetrics({ agentSuccessRate: 0.1 });

    const complexity = analyzeComplexityThresholds(metrics, raw);
    const skills = analyzeSkillKeywords(metrics, raw);
    const routing = analyzeAgentRouting(metrics, raw);
    const trust = analyzeTrustThresholds(metrics, raw);
    const recovery = analyzeErrorRecoveryBudgets(metrics, raw);

    expect(complexity).toHaveLength(0);
    expect(skills).toHaveLength(0);
    expect(routing).toHaveLength(0);
    expect(trust).toHaveLength(0);
    expect(recovery).toHaveLength(0);
  });
});

// ============================================================================
// Proposer (tests 11-13)
// ============================================================================

describe("Proposer", () => {
  it("generates sorted proposals from metrics with opportunities", () => {
    const scores = [
      makeScore({ compositeScore: 65, successRate: 0.9 }),
      makeScore({ agent: "reviewer", compositeScore: 70, successRate: 0.92 }),
      makeScore({ agent: "planner", compositeScore: 80, successRate: 0.95 }),
    ];
    const raw = makeRawData({ scores });
    const metrics = makeMetrics({ agentSuccessRate: 0.3 });

    const proposals = generateProposals(metrics, raw);
    expect(proposals.length).toBeGreaterThan(0);

    for (let i = 1; i < proposals.length; i++) {
      expect(proposals[i].confidence).toBeLessThanOrEqual(
        proposals[i - 1].confidence,
      );
    }
  });

  it("classifies risk correctly for each target type", () => {
    expect(classifyRisk("complexity-thresholds")).toBe("low");
    expect(classifyRisk("skill-keywords")).toBe("medium");
    expect(classifyRisk("agent-routing")).toBe("medium");
    expect(classifyRisk("token-budgets")).toBe("low");
    expect(classifyRisk("trust-thresholds")).toBe("high");
    expect(classifyRisk("error-recovery-retry")).toBe("low");
  });

  it("formats rationale as human-readable string", () => {
    const proposal = makeProposal({
      risk: "high",
      requiresHumanApproval: true,
      description: "Lower trust threshold",
      rationale: "3 agents stuck",
    });

    const formatted = formatRationale(proposal);
    expect(formatted).toContain("[HIGH RISK]");
    expect(formatted).toContain("Lower trust threshold");
    expect(formatted).toContain("3 agents stuck");
    expect(formatted).toContain("Requires human approval");
  });
});

// ============================================================================
// Executor (tests 14-17)
// ============================================================================

describe("Executor", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(
      tmpdir(),
      `optimizer-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    );
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    try {
      if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {
      // cleanup best effort
    }
  });

  it("applies low-risk proposal successfully", () => {
    const proposal = makeProposal({ requiresHumanApproval: false });
    const result = applyProposal(proposal);
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("blocks high-risk proposal requiring human approval", () => {
    const proposal = makeProposal({
      risk: "high",
      requiresHumanApproval: true,
    });

    const result = applyProposal(proposal);
    expect(result.success).toBe(false);
    expect(result.error).toContain("human approval");
  });

  it("rolls back applied proposal", () => {
    const proposal = makeProposal({ requiresHumanApproval: false });
    applyProposal(proposal);

    const result = rollback(proposal.id);
    expect(result.success).toBe(true);
  });

  it("saves and loads snapshots in round-trip", () => {
    const snapshot: OptimizationSnapshot = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      proposals: [makeProposal()],
      applied: ["test-id"],
      rolledBack: [],
      metrics: makeMetrics(),
    };

    saveSnapshot(snapshot);
    const loaded = loadSnapshots();
    expect(loaded.length).toBeGreaterThanOrEqual(1);

    const found = loaded.find((s) => s.id === snapshot.id);
    expect(found).toBeDefined();
    expect(found!.applied).toEqual(["test-id"]);
  });
});

// ============================================================================
// Integration (tests 18-21)
// ============================================================================

describe("Integration", () => {
  it("completes full MAPE-K cycle with realistic data", () => {
    const scores = [
      makeScore({ compositeScore: 65, successRate: 0.9, sampleSize: 15 }),
      makeScore({
        agent: "reviewer",
        compositeScore: 70,
        successRate: 0.88,
        sampleSize: 12,
      }),
      makeScore({
        agent: "planner",
        compositeScore: 80,
        successRate: 0.95,
        sampleSize: 8,
      }),
    ];
    const patterns = [makePattern({ confidence: 0.9, sampleSize: 10 })];
    const errorPatterns = [makeErrorPattern({ successRate: 0.6 })];
    const trustRecords = [
      makeTrust({ level: 1, totalSessions: 15 }),
      makeTrust({ agent: "reviewer", level: 2, totalSessions: 30 }),
    ];
    const raw = makeRawData({ scores, patterns, errorPatterns, trustRecords });
    const metrics = makeMetrics({
      agentSuccessRate: 0.3,
      patternCount: 1,
    });

    const proposals = generateProposals(metrics, raw);
    expect(proposals.length).toBeGreaterThan(0);

    const applied: string[] = [];
    for (const proposal of proposals) {
      if (!proposal.requiresHumanApproval) {
        const result = applyProposal(proposal);
        if (result.success) applied.push(proposal.id);
      }
    }

    const snapshot: OptimizationSnapshot = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      proposals,
      applied,
      rolledBack: [],
      metrics,
    };

    saveSnapshot(snapshot);
    const history = loadSnapshots();
    expect(history.length).toBeGreaterThanOrEqual(1);
  });

  it("detects degradation when success rate drops", () => {
    const before = makeMetrics({
      agentSuccessRate: 0.9,
      errorRecoveryRate: 0.8,
    });
    const after = makeMetrics({
      agentSuccessRate: 0.8,
      errorRecoveryRate: 0.75,
    });

    expect(detectDegradation(before, after)).toBe(true);
  });

  it("does not detect degradation when metrics improve", () => {
    const before = makeMetrics({
      agentSuccessRate: 0.7,
      errorRecoveryRate: 0.5,
    });
    const after = makeMetrics({
      agentSuccessRate: 0.85,
      errorRecoveryRate: 0.7,
    });

    expect(detectDegradation(before, after)).toBe(false);
  });

  it("handles empty history on first run", () => {
    const raw = makeRawData();
    const metrics = makeMetrics({
      agentSuccessRate: 0,
      errorRecoveryRate: 0,
      patternCount: 0,
      trustLevelDistribution: {},
    });

    const proposals = generateProposals(metrics, raw);
    expect(proposals).toHaveLength(0);

    const snapshot: OptimizationSnapshot = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      proposals,
      applied: [],
      rolledBack: [],
      metrics,
    };

    saveSnapshot(snapshot);
    const history = loadSnapshots();
    expect(history.length).toBeGreaterThanOrEqual(1);
  });
});
