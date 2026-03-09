import { describe, it, expect } from "bun:test";

import {
  mineAgentSequences,
  mineSkillCombinations,
  mineDecompositionPatterns,
} from "./pattern-learning-miners";
import { mineRecoveryPatterns } from "./pattern-learning-recovery";
import { calculateConfidence } from "./pattern-learning-utils";
import { makeTrace, makeTraces } from "./pattern-learning-test-helpers";

describe("Sequence discovery", () => {
  it("discovers sequence patterns with correct support count", () => {
    const traces = [
      ...makeTraces(8, { agents: ["scout", "builder"], status: "completed" }),
      ...makeTraces(4, { agents: ["builder"], status: "completed" }),
    ];

    const patterns = mineAgentSequences(traces, 5);

    expect(patterns.length).toBeGreaterThanOrEqual(1);
    const seqPattern = patterns.find(
      (p) =>
        p.pattern.agents?.includes("scout") &&
        p.pattern.agents?.includes("builder"),
    );
    expect(seqPattern).toBeDefined();
    expect(seqPattern!.sampleSize).toBe(8);
    expect(seqPattern!.type).toBe("sequence");
  });
});

describe("Skill combo mining", () => {
  it("discovers effective skill combos", () => {
    const traces = [
      ...makeTraces(7, {
        skills: ["security-review", "api-design"],
        status: "completed",
      }),
      ...makeTraces(5, { skills: ["testing-strategy"], status: "error" }),
    ];

    const patterns = mineSkillCombinations(traces, 5);

    expect(patterns.length).toBeGreaterThanOrEqual(1);
    const comboPattern = patterns.find(
      (p) =>
        p.pattern.skills?.includes("api-design") &&
        p.pattern.skills?.includes("security-review"),
    );
    expect(comboPattern).toBeDefined();
    expect(comboPattern!.type).toBe("skill_combo");
  });
});

describe("Decomposition patterns", () => {
  it("discovers decomposition patterns by complexity range", () => {
    const traces = makeTraces(10, {
      agents: ["scout", "planner", "builder"],
      status: "completed",
      tokens: 40000,
      filesChanged: 5,
    });

    const patterns = mineDecompositionPatterns(traces);

    expect(patterns.length).toBeGreaterThanOrEqual(1);
    const decomp = patterns.find((p) => p.type === "decomposition");
    expect(decomp).toBeDefined();
    expect(decomp!.pattern.complexityRange).toBeDefined();
  });
});

describe("Recovery patterns", () => {
  it("discovers recovery chains from error-to-success sequences", () => {
    const traces = [];
    for (let i = 0; i < 6; i++) {
      const ts = new Date(Date.now() - (12 - i * 2) * 60000).toISOString();
      const tsNext = new Date(Date.now() - (11 - i * 2) * 60000).toISOString();
      traces.push(
        makeTrace({
          sessionId: `err-${i}`,
          agents: ["builder"],
          status: "error",
          ts,
        }),
      );
      traces.push(
        makeTrace({
          sessionId: `fix-${i}`,
          agents: ["error-analyzer", "builder"],
          status: "completed",
          ts: tsNext,
        }),
      );
    }

    const patterns = mineRecoveryPatterns(traces, []);

    expect(patterns.length).toBeGreaterThanOrEqual(1);
    const recovery = patterns.find((p) => p.type === "recovery");
    expect(recovery).toBeDefined();
    expect(recovery!.pattern.recoverySteps).toBeDefined();
    expect(recovery!.sampleSize).toBeGreaterThanOrEqual(3);
  });
});

describe("Insufficient data", () => {
  it("returns empty when traces below minSupport", () => {
    const traces = makeTraces(2, {
      agents: ["scout", "builder"],
      status: "completed",
    });

    const seqPatterns = mineAgentSequences(traces, 5);
    const skillPatterns = mineSkillCombinations(traces, 5);

    expect(seqPatterns).toHaveLength(0);
    expect(skillPatterns).toHaveLength(0);
  });
});

describe("Low-support filter", () => {
  it("excludes patterns below minSupport threshold", () => {
    const traces = [
      ...makeTraces(3, { agents: ["scout", "builder"], status: "completed" }),
      ...makeTraces(6, { agents: ["planner", "builder"], status: "completed" }),
    ];

    const patterns = mineAgentSequences(traces, 5);

    const scoutBuilder = patterns.find(
      (p) => p.pattern.agents?.join(",") === "scout,builder",
    );
    const plannerBuilder = patterns.find(
      (p) => p.pattern.agents?.join(",") === "planner,builder",
    );
    expect(scoutBuilder).toBeUndefined();
    expect(plannerBuilder).toBeDefined();
  });
});

describe("Low-confidence filter", () => {
  it("calculateConfidence returns low value for marginal improvement", () => {
    const confidence = calculateConfidence(6, 10, 0.5);
    expect(confidence).toBeLessThan(0.8);
  });

  it("calculateConfidence returns higher value for strong improvement", () => {
    const confidence = calculateConfidence(45, 50, 0.3);
    expect(confidence).toBeGreaterThan(0);
  });
});
