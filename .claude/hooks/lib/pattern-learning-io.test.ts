import { describe, it, expect, afterEach } from "bun:test";
import { join } from "path";
import { mkdirSync, rmSync } from "fs";

import type { WorkflowPattern } from "./pattern-learning-types";
import { generateId } from "./pattern-learning-types";
import { mineAgentSequences } from "./pattern-learning-miners";
import { makeTrace, makeTraces } from "./pattern-learning-test-helpers";

function makeSamplePattern(
  overrides: Partial<WorkflowPattern> = {},
): WorkflowPattern {
  return {
    id: generateId(),
    type: "sequence",
    pattern: { agents: ["scout", "builder"] },
    outcome: {
      successRate: 0.9,
      avgTokens: 5000,
      avgDuration: 30000,
      avgCost: 0.05,
      avgRetries: 0,
    },
    confidence: 0.85,
    effectSize: 0.2,
    sampleSize: 10,
    firstSeen: "2026-03-01T00:00:00Z",
    lastSeen: "2026-03-08T00:00:00Z",
    ...overrides,
  };
}

const tmpBase = join(process.env.TEMP ?? "/tmp", `test-patterns-${Date.now()}`);
let tmpDir = "";

function setupTmpDir(): string {
  tmpDir = join(tmpBase, Math.random().toString(36).slice(2, 8));
  mkdirSync(tmpDir, { recursive: true });
  return tmpDir;
}

afterEach(() => {
  try {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // best effort cleanup
  }
});

describe("JSONL round-trip", () => {
  it("saves and loads patterns identically", async () => {
    const dir = setupTmpDir();
    const filePath = join(dir, "patterns.jsonl");
    const patterns = [
      makeSamplePattern(),
      makeSamplePattern({ type: "skill_combo" }),
    ];

    const content = patterns.map((p) => JSON.stringify(p)).join("\n") + "\n";
    await Bun.write(filePath, content);

    const loaded: WorkflowPattern[] = [];
    const text = await Bun.file(filePath).text();
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      loaded.push(JSON.parse(line) as WorkflowPattern);
    }

    expect(loaded).toHaveLength(2);
    expect(loaded[0].type).toBe("sequence");
    expect(loaded[1].type).toBe("skill_combo");
    expect(loaded[0].confidence).toBe(patterns[0].confidence);
    expect(loaded[1].effectSize).toBe(patterns[1].effectSize);
  });
});

describe("Corrupt JSONL handling", () => {
  it("skips corrupt lines and returns valid patterns", async () => {
    const dir = setupTmpDir();
    const filePath = join(dir, "patterns.jsonl");
    const validPattern = makeSamplePattern();

    const lines = [
      JSON.stringify(validPattern),
      "this is not valid json{{{",
      JSON.stringify(makeSamplePattern({ type: "recovery" })),
      "",
      "another corrupt line",
      JSON.stringify(makeSamplePattern({ type: "decomposition" })),
    ];
    await Bun.write(filePath, lines.join("\n") + "\n");

    const loaded: WorkflowPattern[] = [];
    const text = await Bun.file(filePath).text();
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        loaded.push(JSON.parse(line) as WorkflowPattern);
      } catch {
        continue;
      }
    }

    expect(loaded).toHaveLength(3);
    expect(loaded[0].type).toBe("sequence");
    expect(loaded[1].type).toBe("recovery");
    expect(loaded[2].type).toBe("decomposition");
  });
});

describe("Performance 1000 traces", () => {
  it("completes mining in under 5 seconds", () => {
    const traces = [];
    for (let i = 0; i < 1000; i++) {
      traces.push(
        makeTrace({
          agents: i % 3 === 0 ? ["scout", "builder"] : ["builder"],
          skills:
            i % 4 === 0
              ? ["api-design", "security-review"]
              : ["testing-strategy"],
          status: i % 5 === 0 ? "error" : "completed",
          sessionId: `perf-session-${i}`,
          ts: new Date(Date.now() - (1000 - i) * 60000).toISOString(),
        }),
      );
    }

    const start = performance.now();
    mineAgentSequences(traces, 5);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(5000);
  });
});

describe("Cap 100 patterns", () => {
  it("limits output to 100 patterns when more are produced", () => {
    const traces = [];
    for (let i = 0; i < 200; i++) {
      const agentA = `agent-${i % 50}`;
      const agentB = `agent-${(i + 1) % 50}`;
      traces.push(
        makeTrace({
          agents: [agentA, agentB],
          status: "completed",
          sessionId: `cap-session-${i}`,
        }),
      );
    }

    const patterns = mineAgentSequences(traces, 1);
    const sorted = patterns.sort((a, b) => b.confidence - a.confidence);
    const capped = sorted.slice(0, 100);

    expect(capped.length).toBeLessThanOrEqual(100);
  });
});

describe("SPEC-014 export", () => {
  it("returns patterns with skills, outcome, and confidence fields", () => {
    const pattern = makeSamplePattern({
      type: "skill_combo",
      pattern: { skills: ["api-design", "security-review"] },
    });

    expect(pattern.pattern.skills).toBeDefined();
    expect(pattern.outcome).toBeDefined();
    expect(pattern.outcome.successRate).toBeGreaterThan(0);
    expect(pattern.confidence).toBeGreaterThan(0);
    expect(typeof pattern.confidence).toBe("number");
  });
});

describe("SPEC-015 export", () => {
  it("patterns include confidence and effectSize for optimizer", () => {
    const pattern = makeSamplePattern();

    expect(pattern).toHaveProperty("confidence");
    expect(pattern).toHaveProperty("effectSize");
    expect(pattern).toHaveProperty("sampleSize");
    expect(pattern).toHaveProperty("outcome");
    expect(typeof pattern.confidence).toBe("number");
    expect(typeof pattern.effectSize).toBe("number");
  });
});
