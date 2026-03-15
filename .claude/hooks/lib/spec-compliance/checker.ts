import { readFileSync } from "node:fs";
import { basename } from "node:path";

import type {
  SpecFrontmatter,
  SectionCheck,
  BddCheck,
  SpecComplianceCheck,
  SpecStatus,
} from "./types";
import { SPEC_SECTIONS } from "./types";
import { collectIssues, calculateCompliance } from "./scoring";

function parseArrayValue(value: string): string[] {
  const listMatch = value.match(/^\[(.*)]/);
  const raw = listMatch ? listMatch[1] : value;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseKvPair(
  key: string,
  value: string,
): unknown {
  if (key === "depends_on" || key === "enables") {
    return parseArrayValue(value);
  }
  if (key === "sources_count") {
    return parseInt(value, 10);
  }
  return value;
}

export function parseSpecFrontmatter(content: string): SpecFrontmatter {
  const defaults: SpecFrontmatter = { status: "draft" };
  const match = content.match(/^<!--\s*\n([\s\S]*?)\n-->/);
  if (!match) return defaults;

  const result: Record<string, unknown> = {};

  for (const line of match[1].split("\n")) {
    const kvMatch = line.match(/^\s*(\w[\w_]*):\s*(.+)$/);
    if (!kvMatch) continue;
    const [, key, rawValue] = kvMatch;
    result[key] = parseKvPair(key, rawValue.trim());
  }

  return {
    status: (result.status as SpecStatus) ?? "draft",
    priority: result.priority as string | undefined,
    research_confidence: result.research_confidence as string | undefined,
    sources_count: result.sources_count as number | undefined,
    depends_on: result.depends_on as string[] | undefined,
    enables: result.enables as string[] | undefined,
    created: result.created as string | undefined,
    updated: result.updated as string | undefined,
  };
}

function getSectionContent(
  content: string,
  sectionNum: number,
): string | null {
  const headingPattern = new RegExp(`^## ${sectionNum}\\.`, "m");
  const headingMatch = content.match(headingPattern);
  if (!headingMatch || headingMatch.index === undefined) return null;

  const startIdx = headingMatch.index + headingMatch[0].length;
  const rest = content.slice(startIdx);
  const nextMatch = rest.match(/^## \d+\./m);
  return rest.slice(0, nextMatch?.index ?? rest.length).trim();
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function assessQuality(
  sectionContent: string | null,
): "complete" | "partial" | "missing" {
  if (sectionContent === null) return "missing";
  return countWords(sectionContent) > 50 ? "complete" : "partial";
}

export function validateSections(content: string): SectionCheck[] {
  return SPEC_SECTIONS.map(({ section, name }) => {
    const sectionContent = getSectionContent(content, section);
    const quality = assessQuality(sectionContent);
    return { section, name, present: sectionContent !== null, quality };
  });
}

export function validateBddScenarios(content: string): BddCheck[] {
  const section6 = getSectionContent(content, 6);
  if (!section6) return [];

  return section6.split(/Scenario:/i).slice(1).map((block) => {
    const scenarioName = block.split("\n")[0]?.trim() ?? "Unnamed";
    const lower = block.toLowerCase();
    const hasGiven = lower.includes("given");
    const hasWhen = lower.includes("when");
    const hasThen = lower.includes("then");
    return {
      scenario: scenarioName,
      hasGiven,
      hasWhen,
      hasThen,
      isExecutable: hasGiven && hasWhen && hasThen,
    };
  });
}

export function checkSources(content: string): {
  count: number;
  hasIssue: boolean;
} {
  const section8 = getSectionContent(content, 8);
  if (!section8) return { count: 0, hasIssue: true };

  const count = section8
    .split("\n")
    .filter((line) => /https?:\/\//.test(line)).length;

  return { count, hasIssue: count === 0 };
}

function extractSpecId(specPath: string): string {
  const match = basename(specPath).match(/SPEC-\d+/);
  return match ? match[0] : "UNKNOWN";
}

export function runComplianceCheck(specPath: string): SpecComplianceCheck {
  const content = readFileSync(specPath, "utf-8");
  const frontmatter = parseSpecFrontmatter(content);
  const sections = validateSections(content);
  const bddScenarios = validateBddScenarios(content);
  const sources = checkSources(content);

  return {
    specId: extractSpecId(specPath),
    specPath,
    status: frontmatter.status,
    sections,
    bddScenarios,
    overallCompliance: calculateCompliance(
      sections,
      bddScenarios,
      sources.count,
      frontmatter,
    ),
    issues: collectIssues(sections, bddScenarios, sources.hasIssue),
  };
}
