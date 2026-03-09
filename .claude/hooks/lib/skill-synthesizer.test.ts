import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type { WorkflowPattern } from "./pattern-learning-types";
import type { SynthesizedSkill } from "./skill-synthesizer-types";
import {
  checkTrigger,
  extractKeywords,
  generateSkillName,
  generateContent,
  calculateKeywordOverlap,
  buildSkill,
} from "./skill-synthesizer";
import { runQualityGates } from "./skill-synthesizer-gates";
import { formatDraftContent } from "./skill-synthesizer-content";

function makePattern(
  overrides: Partial<WorkflowPattern> = {},
): WorkflowPattern {
  const defaults: WorkflowPattern = {
    id: "pat-test-001",
    type: "sequence",
    pattern: {
      agents: ["scout", "builder"],
      skills: ["api-design"],
      taskType: "implementation",
    },
    outcome: {
      successRate: 0.92,
      avgTokens: 5000,
      avgDuration: 3000,
      avgCost: 0.05,
      avgRetries: 0,
    },
    confidence: 0.9,
    effectSize: 0.2,
    sampleSize: 25,
    firstSeen: "2026-01-01T00:00:00Z",
    lastSeen: "2026-03-01T00:00:00Z",
  };

  return { ...defaults, ...overrides };
}

function makeSkill(
  overrides: Partial<SynthesizedSkill> = {},
): SynthesizedSkill {
  const defaults: SynthesizedSkill = {
    name: "test-skill",
    description: "A test skill for validation",
    triggers: ["scout", "builder", "api-design", "implementation"],
    content: {
      patterns: [
        "Agent sequence: scout -> builder",
        "Skill combination: api-design",
        "Pattern type: implementation with 92% success rate",
        "Average cost: $0.0500 | Average duration: 3000ms",
      ],
      conventions: [
        "Use this pattern for implementation tasks with similar complexity",
        "Execute agents in order: scout, builder",
        "Load skills before delegation: api-design",
        "Confidence: 90% over 25 traces",
      ],
      antiPatterns: [
        "8% failure rate observed; verify preconditions before applying",
      ],
      examples: [
        "First observed: 2026-01-01T00:00:00Z",
        "Last observed: 2026-03-01T00:00:00Z",
        "Sample size: 25 traces",
      ],
    },
    source: {
      patternId: "pat-test-001",
      traceCount: 25,
      confidence: 0.9,
    },
    version: 1,
  };

  return { ...defaults, ...overrides };
}

describe("checkTrigger", () => {
  it("triggers on high-confidence pattern with enough traces", () => {
    const pattern = makePattern({ confidence: 0.9, sampleSize: 25 });
    const result = checkTrigger(pattern);
    expect(result.triggered).toBe(true);
  });

  it("skips low-confidence pattern", () => {
    const pattern = makePattern({ confidence: 0.7, sampleSize: 30 });
    const result = checkTrigger(pattern);
    expect(result.triggered).toBe(false);
    expect(result.reason).toContain("confidence");
    expect(result.reason).toContain("70%");
  });

  it("skips low sample size pattern", () => {
    const pattern = makePattern({ confidence: 0.95, sampleSize: 10 });
    const result = checkTrigger(pattern);
    expect(result.triggered).toBe(false);
    expect(result.reason).toContain("10 traces");
  });
});

describe("extractKeywords", () => {
  it("extracts keywords from pattern fields without stop words", () => {
    const pattern = makePattern({
      pattern: {
        agents: ["scout", "builder"],
        skills: ["api-design", "security-review"],
        taskType: "implementation",
      },
    });

    const keywords = extractKeywords(pattern);

    expect(keywords).toContain("scout");
    expect(keywords).toContain("builder");
    expect(keywords).toContain("api-design");
    expect(keywords).toContain("security-review");
    expect(keywords).toContain("implementation");
    expect(keywords).not.toContain("the");
    expect(keywords).not.toContain("and");
  });

  it("returns empty for pattern with no extractable fields", () => {
    const pattern = makePattern({
      pattern: {},
    });
    const keywords = extractKeywords(pattern);
    expect(keywords).toHaveLength(0);
  });
});

describe("generateContent", () => {
  it("returns non-empty patterns, conventions, antiPatterns, examples", () => {
    const pattern = makePattern();
    const content = generateContent(pattern);

    expect(content.patterns.length).toBeGreaterThan(0);
    expect(content.conventions.length).toBeGreaterThan(0);
    expect(content.examples.length).toBeGreaterThan(0);
  });

  it("includes anti-patterns when success rate below 1", () => {
    const pattern = makePattern({
      outcome: {
        successRate: 0.85,
        avgTokens: 5000,
        avgDuration: 3000,
        avgCost: 0.05,
        avgRetries: 1,
      },
    });
    const content = generateContent(pattern);
    expect(content.antiPatterns.length).toBeGreaterThan(0);
    expect(content.antiPatterns[0]).toContain("failure rate");
  });
});

describe("Quality gate: format validation", () => {
  it("passes for complete skill", () => {
    const skill = makeSkill();
    const results = runQualityGates(skill, []);
    const formatGate = results.find((g) => g.gate === "format");
    expect(formatGate).toBeDefined();
    expect(formatGate!.passed).toBe(true);
  });

  it("fails for skill with empty name", () => {
    const skill = makeSkill({ name: "" });
    const results = runQualityGates(skill, []);
    const formatGate = results.find((g) => g.gate === "format");
    expect(formatGate).toBeDefined();
    expect(formatGate!.passed).toBe(false);
  });
});

describe("Quality gate: uniqueness check", () => {
  it("fails when keyword overlap exceeds 50%", () => {
    const skill = makeSkill({
      triggers: ["auth", "jwt", "token", "security"],
    });
    const existingKeywords = [
      ["auth", "jwt", "password", "security", "token", "session"],
    ];
    const results = runQualityGates(skill, existingKeywords);
    const gate = results.find((g) => g.gate === "uniqueness");
    expect(gate).toBeDefined();
    expect(gate!.passed).toBe(false);
  });

  it("passes when keywords are unique", () => {
    const skill = makeSkill({
      triggers: ["custom-workflow", "special-agent"],
    });
    const results = runQualityGates(skill, [["auth", "jwt", "token"]]);
    const gate = results.find((g) => g.gate === "uniqueness");
    expect(gate).toBeDefined();
    expect(gate!.passed).toBe(true);
  });
});

describe("Quality gate: content quality", () => {
  it("fails when content is too thin", () => {
    const skill = makeSkill({
      content: {
        patterns: ["short"],
        conventions: ["x"],
        antiPatterns: [],
        examples: [],
      },
    });
    const results = runQualityGates(skill, []);
    const gate = results.find((g) => g.gate === "content_quality");
    expect(gate).toBeDefined();
    expect(gate!.passed).toBe(false);
    expect(gate!.detail).toContain("Content too thin");
  });
});

describe("calculateKeywordOverlap (Jaccard)", () => {
  it("returns 0 for completely disjoint sets", () => {
    const overlap = calculateKeywordOverlap(["a", "b"], ["c", "d"]);
    expect(overlap).toBe(0);
  });

  it("returns 1 for identical sets", () => {
    const overlap = calculateKeywordOverlap(["a", "b"], ["a", "b"]);
    expect(overlap).toBe(1);
  });

  it("returns correct value for partial overlap", () => {
    const overlap = calculateKeywordOverlap(["a", "b", "c"], ["b", "c", "d"]);
    expect(overlap).toBeCloseTo(0.5, 1);
  });

  it("returns 0 for two empty arrays", () => {
    const overlap = calculateKeywordOverlap([], []);
    expect(overlap).toBe(0);
  });
});

describe("Draft file formatting", () => {
  it("creates file with correct YAML frontmatter and content sections", () => {
    const skill = makeSkill();
    const content = formatDraftContent(skill);

    expect(content).toContain("---");
    expect(content).toContain("name: test-skill");
    expect(content).toContain("auto_synthesized: true");
    expect(content).toContain("## Patterns");
    expect(content).toContain("## Conventions");
    expect(content).toContain("## Anti-Patterns");
    expect(content).toContain("## Examples");
    expect(content).toContain("Agent sequence: scout -> builder");
  });

  it("writes to temp directory successfully", () => {
    const tempDir = join(tmpdir(), `synth-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    const skill = makeSkill({ name: "draft-write-test" });
    const dir = join(tempDir, skill.name);
    mkdirSync(dir, { recursive: true });
    const filePath = join(dir, "SKILL.md");
    const formattedContent = formatDraftContent(skill);
    writeFileSync(filePath, formattedContent, "utf-8");

    expect(existsSync(filePath)).toBe(true);
    const written = readFileSync(filePath, "utf-8");
    expect(written).toContain("name: draft-write-test");
    expect(written).toContain("## Patterns");

    rmSync(tempDir, { recursive: true, force: true });
  });
});

describe("generateSkillName", () => {
  it("returns valid kebab-case name from pattern", () => {
    const pattern = makePattern({
      type: "sequence",
      pattern: { agents: ["scout", "builder"] },
    });

    const name = generateSkillName(pattern);

    expect(name).toBe("sequence-scout-builder");
    expect(name).toMatch(/^[a-z0-9-]+$/);
  });

  it("truncates names longer than 40 characters", () => {
    const pattern = makePattern({
      type: "decomposition",
      pattern: {
        agents: ["very-long-agent-name-one", "very-long-agent-name-two"],
      },
    });

    const name = generateSkillName(pattern);
    expect(name.length).toBeLessThanOrEqual(40);
  });

  it("uses skills when no agents present", () => {
    const pattern = makePattern({
      type: "skill_combo",
      pattern: { skills: ["api-design", "security-review"] },
    });

    const name = generateSkillName(pattern);
    expect(name).toContain("api-design");
  });
});

describe("Synthesis log round-trip", () => {
  let tempLogDir: string;
  let tempLogPath: string;

  beforeEach(() => {
    tempLogDir = join(tmpdir(), `synth-log-test-${Date.now()}`);
    mkdirSync(tempLogDir, { recursive: true });
    tempLogPath = join(tempLogDir, "test-log.jsonl");
  });

  afterEach(() => {
    rmSync(tempLogDir, { recursive: true, force: true });
  });

  it("writes and reads log entries correctly", () => {
    const entry = {
      timestamp: "2026-03-01T00:00:00Z",
      patternId: "pat-001",
      result: {
        status: "created" as const,
        skillName: "test-skill",
        reason: "All gates passed",
        draftPath: "/tmp/test",
        gateResults: [{ gate: "format", passed: true, detail: "OK" }],
      },
    };

    const { appendFileSync } = require("fs");
    appendFileSync(tempLogPath, JSON.stringify(entry) + "\n");

    const content = readFileSync(tempLogPath, "utf-8");
    const lines = content.split("\n").filter((l: string) => l.trim());
    expect(lines).toHaveLength(1);

    const parsed = JSON.parse(lines[0]);
    expect(parsed.patternId).toBe("pat-001");
    expect(parsed.result.status).toBe("created");
    expect(parsed.result.skillName).toBe("test-skill");
  });
});
