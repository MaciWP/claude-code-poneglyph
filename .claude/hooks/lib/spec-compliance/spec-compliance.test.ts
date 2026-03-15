import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from "bun:test";
import { writeFileSync, unlinkSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  parseSpecFrontmatter,
  validateSections,
  validateBddScenarios,
  checkSources,
  runComplianceCheck,
  validateTransition,
  parseIndexEntry,
  updateIndexStatus,
  collectIssues,
  calculateCompliance,
  SPEC_SECTIONS,
  VALID_TRANSITIONS,
  COMPLIANCE_THRESHOLDS,
} from "./index";

import type {
  SpecStatus,
  SectionCheck,
  BddCheck,
  SpecFrontmatter,
} from "./index";

interface MockSpecOptions {
  skipSections?: number[];
  emptyBdd?: boolean;
  noSources?: boolean;
  status?: string;
  confidence?: string;
}

const BDD_CONTENT =
  "```gherkin\nScenario: Basic validation\n  Given a valid input\n  When the validator runs\n  Then the output is correct\n\nScenario: Error handling\n  Given an invalid input\n  When the validator runs\n  Then an error is reported\n```";

const SOURCES_CONTENT =
  "| # | Source | URL |\n|---|--------|-----|\n| 1 | Example | https://example.com |\n| 2 | Docs | https://docs.example.com |";

const LONG_FILLER = "and additional context is provided here to ensure the word count exceeds the minimum threshold required for a complete quality assessment by the validation engine which checks content length carefully across all sections";

const SECTION_DEFAULTS: Array<{ n: number; name: string; content: string }> = [
  { n: 0, name: "Research Summary", content: `Research was conducted across multiple sources to validate the approach and identify best practices for implementation across the entire stack ${LONG_FILLER}.` },
  { n: 1, name: "Vision", content: `This feature will provide users with an enhanced experience by implementing automated validation and feedback mechanisms across the platform ${LONG_FILLER}.` },
  { n: 2, name: "Goals & Non-Goals", content: `The primary goal is to automate the validation pipeline and the non-goals include manual review processes and external integrations that are out of scope ${LONG_FILLER}.` },
  { n: 3, name: "Alternatives Considered", content: `Three alternatives were evaluated including manual processes automated scripts and third party services before selecting the current approach ${LONG_FILLER}.` },
  { n: 4, name: "Design", content: `The system architecture follows a modular pattern with clear separation of concerns between validation scoring and reporting components in the pipeline ${LONG_FILLER}.` },
  { n: 5, name: "FAQ", content: `Common questions about the implementation include how to handle edge cases and what happens when validation fails unexpectedly during processing of inputs ${LONG_FILLER}.` },
  { n: 6, name: "Acceptance Criteria", content: BDD_CONTENT },
  { n: 7, name: "Open Questions", content: `Remaining questions include performance targets and integration timeline with existing infrastructure components in production environments for deployment ${LONG_FILLER}.` },
  { n: 8, name: "Sources", content: SOURCES_CONTENT },
  { n: 9, name: "Next Steps", content: `Implementation will proceed in three phases starting with core validation followed by integration testing and production deployment across all environments ${LONG_FILLER}.` },
];

function resolveSectionContent(s: typeof SECTION_DEFAULTS[0], opts: MockSpecOptions): string {
  const overrides: Record<number, string> = {};
  if (opts.emptyBdd) overrides[6] = "";
  if (opts.noSources) overrides[8] = "";
  return overrides[s.n] ?? s.content;
}

function buildMockFrontmatter(status: string, confidence: string): string {
  return `<!--\nstatus: ${status}\npriority: high\nresearch_confidence: ${confidence}\nsources_count: 12\ndepends_on: SPEC-006\ncreated: 2026-03-10\n-->\n\n# SPEC-TEST: Test Specification\n\n`;
}

function createMockSpec(options?: MockSpecOptions): string {
  const opts = options ?? {};
  let spec = buildMockFrontmatter(opts.status ?? "draft", opts.confidence ?? "high");
  const skip = new Set(opts.skipSections ?? []);

  for (const s of SECTION_DEFAULTS) {
    if (skip.has(s.n)) continue;
    spec += `## ${s.n}. ${s.name}\n\n${resolveSectionContent(s, opts)}\n\n`;
  }

  return spec;
}

function createMockIndex(): string {
  return [
    "# Spec Registry",
    "",
    "| ID | Name | Version | Complexity | Depends On | Status | File |",
    "|-----|------|---------|-----------|-----------|--------|------|",
    "| SPEC-001 | Test One | v1.0 | 20 | - | `implemented` | [link](test.md) |",
    "| SPEC-002 | Test Two | v1.0 | 30 | SPEC-001 | `draft` | [link](test2.md) |",
    "| SPEC-003 | Test Three | v1.0 | 40 | SPEC-002 | `approved` | [link](test3.md) |",
    "",
  ].join("\n");
}

describe("spec-compliance", () => {
  describe("parseSpecFrontmatter", () => {
    test("parses valid HTML comment frontmatter", () => {
      const content = createMockSpec();
      const fm = parseSpecFrontmatter(content);

      expect(fm.status).toBe("draft");
      expect(fm.priority).toBe("high");
      expect(fm.research_confidence).toBe("high");
      expect(fm.sources_count).toBe(12);
      expect(fm.created).toBe("2026-03-10");
    });

    test("parses depends_on as array", () => {
      const content =
        "<!--\nstatus: review\ndepends_on: SPEC-001, SPEC-002, SPEC-003\n-->\n\n# Test";
      const fm = parseSpecFrontmatter(content);

      expect(fm.depends_on).toBeArray();
      expect(fm.depends_on).toEqual(["SPEC-001", "SPEC-002", "SPEC-003"]);
    });

    test("parses depends_on with bracket syntax", () => {
      const content =
        "<!--\nstatus: draft\ndepends_on: [SPEC-006]\n-->\n\n# Test";
      const fm = parseSpecFrontmatter(content);

      expect(fm.depends_on).toBeArray();
      expect(fm.depends_on).toEqual(["SPEC-006"]);
    });

    test("parses enables as array", () => {
      const content =
        "<!--\nstatus: draft\nenables: [SPEC-018, SPEC-019]\n-->\n\n# Test";
      const fm = parseSpecFrontmatter(content);

      expect(fm.enables).toBeArray();
      expect(fm.enables).toEqual(["SPEC-018", "SPEC-019"]);
    });

    test("returns defaults for missing frontmatter", () => {
      const content = "# Just a heading\n\nSome content";
      const fm = parseSpecFrontmatter(content);

      expect(fm.status).toBe("draft");
      expect(fm.priority).toBeUndefined();
      expect(fm.research_confidence).toBeUndefined();
      expect(fm.sources_count).toBeUndefined();
      expect(fm.depends_on).toBeUndefined();
    });

    test("handles malformed frontmatter gracefully", () => {
      const content = "<!-- this is not valid frontmatter -->\n\n# Title";
      const fm = parseSpecFrontmatter(content);

      expect(fm.status).toBe("draft");
    });

    test("handles empty content", () => {
      const fm = parseSpecFrontmatter("");

      expect(fm.status).toBe("draft");
    });

    test("parses sources_count as number", () => {
      const content = "<!--\nstatus: draft\nsources_count: 18\n-->\n\n# Test";
      const fm = parseSpecFrontmatter(content);

      expect(fm.sources_count).toBe(18);
      expect(typeof fm.sources_count).toBe("number");
    });
  });

  describe("validateSections", () => {
    test("all 10 sections present returns all present: true", () => {
      const content = createMockSpec();
      const sections = validateSections(content);

      expect(sections).toHaveLength(10);
      for (const sec of sections) {
        expect(sec.present).toBe(true);
      }
    });

    test("missing section returns present: false and quality: missing", () => {
      const content = createMockSpec({ skipSections: [3, 7] });
      const sections = validateSections(content);

      const sec3 = sections.find((s) => s.section === 3);
      expect(sec3?.present).toBe(false);
      expect(sec3?.quality).toBe("missing");

      const sec7 = sections.find((s) => s.section === 7);
      expect(sec7?.present).toBe(false);
      expect(sec7?.quality).toBe("missing");
    });

    test("section with heading only has quality partial or missing", () => {
      const content = "## 0. Research Summary\n\n## 1. Vision\n\nSome words.";
      const sections = validateSections(content);

      const sec0 = sections.find((s) => s.section === 0);
      expect(sec0?.present).toBe(true);
      expect(sec0?.quality).not.toBe("complete");
    });

    test("section with >50 words has quality complete", () => {
      const content = createMockSpec();
      const sections = validateSections(content);

      const completeSections = sections.filter(
        (s) => s.quality === "complete",
      );
      expect(completeSections.length).toBeGreaterThan(0);
    });

    test("empty spec returns all sections missing", () => {
      const sections = validateSections("");

      expect(sections).toHaveLength(10);
      for (const sec of sections) {
        expect(sec.present).toBe(false);
        expect(sec.quality).toBe("missing");
      }
    });

    test("handles numbered section pattern without name", () => {
      const content =
        "## 0.\n\nSome content with enough words to be meaningful for the quality check that requires more than fifty words in a section to count as complete.\n\n## 1.\n\nMore content here.";
      const sections = validateSections(content);

      const sec0 = sections.find((s) => s.section === 0);
      expect(sec0?.present).toBe(true);
    });

    test("section names match SPEC_SECTIONS constant", () => {
      const content = createMockSpec();
      const sections = validateSections(content);

      for (let i = 0; i < SPEC_SECTIONS.length; i++) {
        expect(sections[i].section).toBe(SPEC_SECTIONS[i].section);
        expect(sections[i].name).toBe(SPEC_SECTIONS[i].name);
      }
    });
  });

  describe("validateBddScenarios", () => {
    test("complete scenario with Given/When/Then returns all true", () => {
      const content = createMockSpec();
      const scenarios = validateBddScenarios(content);

      expect(scenarios.length).toBeGreaterThanOrEqual(2);
      for (const sc of scenarios) {
        expect(sc.hasGiven).toBe(true);
        expect(sc.hasWhen).toBe(true);
        expect(sc.hasThen).toBe(true);
        expect(sc.isExecutable).toBe(true);
      }
    });

    test("scenario missing Then has hasThen: false and isExecutable: false", () => {
      const content =
        "## 6. Acceptance Criteria\n\n```gherkin\nScenario: Incomplete test\n  Given a setup\n  When an action\n```\n\n## 7. Open Questions\n\nSome content here.";
      const scenarios = validateBddScenarios(content);

      expect(scenarios).toHaveLength(1);
      expect(scenarios[0].hasGiven).toBe(true);
      expect(scenarios[0].hasWhen).toBe(true);
      expect(scenarios[0].hasThen).toBe(false);
      expect(scenarios[0].isExecutable).toBe(false);
    });

    test("multiple scenarios parsed correctly", () => {
      const content = createMockSpec();
      const scenarios = validateBddScenarios(content);

      expect(scenarios).toHaveLength(2);
      expect(scenarios[0].scenario).toBe("Basic validation");
      expect(scenarios[1].scenario).toBe("Error handling");
    });

    test("no Section 6 content returns empty array", () => {
      const content = createMockSpec({ skipSections: [6] });
      const scenarios = validateBddScenarios(content);

      expect(scenarios).toEqual([]);
    });

    test("empty Section 6 returns empty array", () => {
      const content = createMockSpec({ emptyBdd: true });
      const scenarios = validateBddScenarios(content);

      expect(scenarios).toEqual([]);
    });

    test("handles Gherkin And keyword in scenarios", () => {
      const content =
        "## 6. Acceptance Criteria\n\n```gherkin\nScenario: With And keyword\n  Given a setup\n  And another precondition\n  When an action occurs\n  Then result is observed\n  And another assertion\n```\n\n## 7. Open Questions\n\nContent.";
      const scenarios = validateBddScenarios(content);

      expect(scenarios).toHaveLength(1);
      expect(scenarios[0].isExecutable).toBe(true);
    });
  });

  describe("checkSources", () => {
    test("Section 8 with URLs returns count > 0 and hasIssue: false", () => {
      const content = createMockSpec();
      const result = checkSources(content);

      expect(result.count).toBeGreaterThan(0);
      expect(result.hasIssue).toBe(false);
    });

    test("Section 8 empty returns count: 0 and hasIssue: true", () => {
      const content = createMockSpec({ noSources: true });
      const result = checkSources(content);

      expect(result.count).toBe(0);
      expect(result.hasIssue).toBe(true);
    });

    test("Section 8 missing returns count: 0 and hasIssue: true", () => {
      const content = createMockSpec({ skipSections: [8] });
      const result = checkSources(content);

      expect(result.count).toBe(0);
      expect(result.hasIssue).toBe(true);
    });

    test("table format with pipe-delimited URLs counted correctly", () => {
      const content = createMockSpec();
      const result = checkSources(content);

      expect(result.count).toBe(2);
    });
  });

  describe("collectIssues", () => {
    test("missing sections generate missing_section issues", () => {
      const sections: SectionCheck[] = SPEC_SECTIONS.map(
        ({ section, name }) => ({
          section,
          name,
          present: section !== 3,
          quality: section === 3 ? ("missing" as const) : ("complete" as const),
        }),
      );
      const issues = collectIssues(sections, [], true);

      const missingSectionIssues = issues.filter(
        (i) => i.type === "missing_section",
      );
      expect(missingSectionIssues).toHaveLength(1);
      expect(missingSectionIssues[0].message).toContain("Section 3");
      expect(missingSectionIssues[0].severity).toBe("major");
    });

    test("empty BDD scenarios generate empty_bdd issue", () => {
      const sections: SectionCheck[] = SPEC_SECTIONS.map(
        ({ section, name }) => ({
          section,
          name,
          present: true,
          quality: "complete" as const,
        }),
      );
      const issues = collectIssues(sections, [], false);

      const bddIssues = issues.filter((i) => i.type === "empty_bdd");
      expect(bddIssues).toHaveLength(1);
      expect(bddIssues[0].severity).toBe("critical");
    });

    test("sources issue generates no_sources issue", () => {
      const sections: SectionCheck[] = SPEC_SECTIONS.map(
        ({ section, name }) => ({
          section,
          name,
          present: true,
          quality: "complete" as const,
        }),
      );
      const bdd: BddCheck[] = [
        {
          scenario: "Test",
          hasGiven: true,
          hasWhen: true,
          hasThen: true,
          isExecutable: true,
        },
      ];
      const issues = collectIssues(sections, bdd, true);

      const sourceIssues = issues.filter((i) => i.type === "no_sources");
      expect(sourceIssues).toHaveLength(1);
      expect(sourceIssues[0].severity).toBe("critical");
    });

    test("no problems returns empty issues array", () => {
      const sections: SectionCheck[] = SPEC_SECTIONS.map(
        ({ section, name }) => ({
          section,
          name,
          present: true,
          quality: "complete" as const,
        }),
      );
      const bdd: BddCheck[] = [
        {
          scenario: "Test",
          hasGiven: true,
          hasWhen: true,
          hasThen: true,
          isExecutable: true,
        },
      ];
      const issues = collectIssues(sections, bdd, false);

      expect(issues).toHaveLength(0);
    });
  });

  describe("calculateCompliance", () => {
    test("full spec with all sections complete returns high score", () => {
      const sections: SectionCheck[] = SPEC_SECTIONS.map(
        ({ section, name }) => ({
          section,
          name,
          present: true,
          quality: "complete" as const,
        }),
      );
      const bdd: BddCheck[] = [
        {
          scenario: "T1",
          hasGiven: true,
          hasWhen: true,
          hasThen: true,
          isExecutable: true,
        },
        {
          scenario: "T2",
          hasGiven: true,
          hasWhen: true,
          hasThen: true,
          isExecutable: true,
        },
      ];
      const fm: SpecFrontmatter = {
        status: "draft",
        research_confidence: "high",
      };

      const score = calculateCompliance(sections, bdd, 5, fm);

      expect(score).toBeGreaterThanOrEqual(90);
      expect(score).toBeLessThanOrEqual(100);
    });

    test("empty spec returns low score", () => {
      const sections: SectionCheck[] = SPEC_SECTIONS.map(
        ({ section, name }) => ({
          section,
          name,
          present: false,
          quality: "missing" as const,
        }),
      );

      const score = calculateCompliance(sections, [], 0, { status: "draft" });

      expect(score).toBeLessThan(COMPLIANCE_THRESHOLDS.BLOCK);
    });

    test("partial spec returns intermediate score", () => {
      const sections: SectionCheck[] = SPEC_SECTIONS.map(
        ({ section, name }) => ({
          section,
          name,
          present: section < 5,
          quality: section < 5 ? ("partial" as const) : ("missing" as const),
        }),
      );

      const score = calculateCompliance(sections, [], 2, { status: "draft" });

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(90);
    });

    test("research_confidence affects score", () => {
      const sections: SectionCheck[] = SPEC_SECTIONS.map(
        ({ section, name }) => ({
          section,
          name,
          present: true,
          quality: "complete" as const,
        }),
      );
      const bdd: BddCheck[] = [
        {
          scenario: "T",
          hasGiven: true,
          hasWhen: true,
          hasThen: true,
          isExecutable: true,
        },
      ];

      const highScore = calculateCompliance(sections, bdd, 5, {
        status: "draft",
        research_confidence: "high",
      });
      const lowScore = calculateCompliance(sections, bdd, 5, {
        status: "draft",
        research_confidence: "low",
      });

      expect(highScore).toBeGreaterThan(lowScore);
    });
  });

  describe("runComplianceCheck (integration)", () => {
    test("runs on real SPEC-016 file", () => {
      const specPath =
        "D:\\PYTHON\\claude-code-poneglyph\\.specs\\v2.1\\SPEC-016-spec-driven-development-workflow.md";
      const result = runComplianceCheck(specPath);

      expect(result.specId).toBe("SPEC-016");
      expect(result.specPath).toBe(specPath);
      expect(result.status).toBe("draft");
      expect(result.overallCompliance).toBeGreaterThan(0);
      expect(result.sections).toHaveLength(10);
      expect(result.bddScenarios.length).toBeGreaterThan(0);
      expect(Array.isArray(result.issues)).toBe(true);
    });

    test("real spec has all 10 sections present", () => {
      const specPath =
        "D:\\PYTHON\\claude-code-poneglyph\\.specs\\v2.1\\SPEC-016-spec-driven-development-workflow.md";
      const result = runComplianceCheck(specPath);

      for (const sec of result.sections) {
        expect(sec.present).toBe(true);
      }
    });

    test("runs on mock spec via temp file", () => {
      const tmpPath = join(
        tmpdir(),
        `SPEC-042-mock-test-${Date.now()}.md`,
      );
      writeFileSync(tmpPath, createMockSpec());

      try {
        const result = runComplianceCheck(tmpPath);

        expect(result.specId).toBe("SPEC-042");
        expect(result.overallCompliance).toBeGreaterThan(0);
        expect(result.sections).toHaveLength(10);
      } finally {
        unlinkSync(tmpPath);
      }
    });

    test("minimal mock spec generates issues for missing sections", () => {
      const tmpPath = join(
        tmpdir(),
        `SPEC-TEST-${Date.now()}-minimal.md`,
      );
      const minimalSpec = createMockSpec({
        skipSections: [0, 3, 5, 7, 9],
        emptyBdd: true,
        noSources: true,
      });
      writeFileSync(tmpPath, minimalSpec);

      try {
        const result = runComplianceCheck(tmpPath);

        const missingIssues = result.issues.filter(
          (i) => i.type === "missing_section",
        );
        expect(missingIssues.length).toBe(5);

        const bddIssue = result.issues.find((i) => i.type === "empty_bdd");
        expect(bddIssue).toBeTruthy();

        const sourceIssue = result.issues.find((i) => i.type === "no_sources");
        expect(sourceIssue).toBeTruthy();
      } finally {
        unlinkSync(tmpPath);
      }
    });

    test("nonexistent file throws error", () => {
      expect(() =>
        runComplianceCheck("/nonexistent/path/SPEC-999-fake.md"),
      ).toThrow();
    });
  });

  describe("validateTransition", () => {
    test("draft -> review is valid", () => {
      const result = validateTransition("draft", "review");

      expect(result.valid).toBe(true);
      expect(result.allowed).toContain("review");
      expect(result.allowed).toContain("deprecated");
    });

    test("draft -> in_progress is invalid", () => {
      const result = validateTransition("draft", "in_progress");

      expect(result.valid).toBe(false);
      expect(result.allowed).toEqual(["review", "deprecated"]);
    });

    test("draft -> deprecated is valid", () => {
      const result = validateTransition("draft", "deprecated");

      expect(result.valid).toBe(true);
    });

    test("review -> approved is valid", () => {
      const result = validateTransition("review", "approved");

      expect(result.valid).toBe(true);
    });

    test("review -> draft is valid", () => {
      const result = validateTransition("review", "draft");

      expect(result.valid).toBe(true);
    });

    test("approved -> in_progress is valid", () => {
      const result = validateTransition("approved", "in_progress");

      expect(result.valid).toBe(true);
    });

    test("in_progress -> implemented is valid", () => {
      const result = validateTransition("in_progress", "implemented");

      expect(result.valid).toBe(true);
    });

    test("in_progress -> approved is valid (abandon implementation)", () => {
      const result = validateTransition("in_progress", "approved");

      expect(result.valid).toBe(true);
    });

    test("implemented -> deprecated is valid", () => {
      const result = validateTransition("implemented", "deprecated");

      expect(result.valid).toBe(true);
    });

    test("deprecated has no valid transitions", () => {
      const result = validateTransition("deprecated", "draft");

      expect(result.valid).toBe(false);
      expect(result.allowed).toEqual([]);
    });

    test("implemented -> draft is invalid", () => {
      const result = validateTransition("implemented", "draft");

      expect(result.valid).toBe(false);
      expect(result.allowed).toEqual(["deprecated"]);
    });

    test("all transitions from each status match VALID_TRANSITIONS", () => {
      const statuses: SpecStatus[] = [
        "draft",
        "review",
        "approved",
        "in_progress",
        "implemented",
        "deprecated",
      ];

      for (const status of statuses) {
        const result = validateTransition(status, "draft");
        expect(result.allowed).toEqual(VALID_TRANSITIONS[status]);
      }
    });
  });

  describe("parseIndexEntry", () => {
    test("parses valid index line with SPEC-001", () => {
      const line =
        "| SPEC-001 | Test One | v1.0 | 20 | - | `implemented` | [link](test.md) |";
      const entry = parseIndexEntry(line);

      expect(entry).not.toBeNull();
      expect(entry!.specId).toBe("SPEC-001");
      expect(entry!.status).toBe("implemented");
    });

    test("parses draft status", () => {
      const line =
        "| SPEC-002 | Test Two | v1.0 | 30 | SPEC-001 | `draft` | [link](test2.md) |";
      const entry = parseIndexEntry(line);

      expect(entry).not.toBeNull();
      expect(entry!.specId).toBe("SPEC-002");
      expect(entry!.status).toBe("draft");
    });

    test("returns null for non-table line", () => {
      expect(parseIndexEntry("# Just a heading")).toBeNull();
      expect(parseIndexEntry("Some plain text")).toBeNull();
      expect(parseIndexEntry("")).toBeNull();
    });

    test("returns null for header separator row", () => {
      const line = "|-----|------|---------|-----------|-----------|--------|------|";
      expect(parseIndexEntry(line)).toBeNull();
    });

    test("returns null for table header row without SPEC ID", () => {
      const line =
        "| ID | Name | Version | Complexity | Depends On | Status | File |";
      expect(parseIndexEntry(line)).toBeNull();
    });

    test("returns null for line with too few columns", () => {
      const line = "| SPEC-001 | Name | v1.0 |";
      expect(parseIndexEntry(line)).toBeNull();
    });
  });

  describe("updateIndexStatus", () => {
    let tmpIndexPath: string;

    beforeEach(() => {
      tmpIndexPath = join(
        tmpdir(),
        `INDEX-test-${Date.now()}.md`,
      );
      writeFileSync(tmpIndexPath, createMockIndex());
    });

    afterEach(() => {
      try {
        unlinkSync(tmpIndexPath);
      } catch {
        // ignore cleanup errors
      }
    });

    test("valid transition updates status correctly", () => {
      const result = updateIndexStatus(tmpIndexPath, "SPEC-002", "review");

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const content = require("node:fs").readFileSync(tmpIndexPath, "utf-8");
      expect(content).toContain("`review`");
      expect(content).not.toMatch(/SPEC-002.*`draft`/);
    });

    test("invalid transition returns error without modifying file", () => {
      const originalContent = require("node:fs").readFileSync(
        tmpIndexPath,
        "utf-8",
      );

      const result = updateIndexStatus(
        tmpIndexPath,
        "SPEC-002",
        "implemented",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid transition");

      const afterContent = require("node:fs").readFileSync(
        tmpIndexPath,
        "utf-8",
      );
      expect(afterContent).toBe(originalContent);
    });

    test("unknown specId returns error", () => {
      const result = updateIndexStatus(tmpIndexPath, "SPEC-999", "review");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    test("approved -> in_progress transition works", () => {
      const result = updateIndexStatus(
        tmpIndexPath,
        "SPEC-003",
        "in_progress",
      );

      expect(result.success).toBe(true);

      const content = require("node:fs").readFileSync(tmpIndexPath, "utf-8");
      expect(content).toContain("`in_progress`");
    });

    test("nonexistent file returns error", () => {
      const result = updateIndexStatus(
        "/nonexistent/INDEX.md",
        "SPEC-001",
        "deprecated",
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("constants", () => {
    test("SPEC_SECTIONS has 10 entries numbered 0-9", () => {
      expect(SPEC_SECTIONS).toHaveLength(10);
      for (let i = 0; i < 10; i++) {
        expect(SPEC_SECTIONS[i].section).toBe(i);
        expect(SPEC_SECTIONS[i].name).toBeTruthy();
      }
    });

    test("VALID_TRANSITIONS covers all statuses", () => {
      const statuses: SpecStatus[] = [
        "draft",
        "review",
        "approved",
        "in_progress",
        "implemented",
        "deprecated",
      ];
      for (const s of statuses) {
        expect(VALID_TRANSITIONS[s]).toBeArray();
      }
    });

    test("COMPLIANCE_THRESHOLDS has expected values", () => {
      expect(COMPLIANCE_THRESHOLDS.APPROVE).toBe(70);
      expect(COMPLIANCE_THRESHOLDS.BLOCK).toBe(50);
      expect(COMPLIANCE_THRESHOLDS.APPROVE).toBeGreaterThan(
        COMPLIANCE_THRESHOLDS.BLOCK,
      );
    });
  });
});
