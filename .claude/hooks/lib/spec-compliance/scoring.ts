import type {
  SectionCheck,
  BddCheck,
  ComplianceIssue,
  SpecFrontmatter,
} from "./types";

const CONFIDENCE_SCORES: Record<string, number> = {
  high: 10,
  medium: 7,
  low: 3,
};
const DEFAULT_CONFIDENCE_SCORE = 5;

export function collectIssues(
  sections: SectionCheck[],
  bddScenarios: BddCheck[],
  sourcesHasIssue: boolean,
): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];

  for (const sec of sections) {
    if (!sec.present) {
      issues.push({
        type: "missing_section",
        severity: "major",
        message: `Section ${sec.section} (${sec.name}) is missing`,
        suggestion: `Add section "## ${sec.section}. ${sec.name}" to the spec`,
      });
    }
  }

  if (bddScenarios.length === 0) {
    issues.push({
      type: "empty_bdd",
      severity: "critical",
      message: "No BDD scenarios found in Section 6 (Acceptance Criteria)",
      suggestion:
        "Add at least one Scenario with Given/When/Then in Section 6",
    });
  }

  if (sourcesHasIssue) {
    issues.push({
      type: "no_sources",
      severity: "critical",
      message: "Section 8 (Sources) has no entries with URLs",
      suggestion: "Add research sources with URLs to Section 8",
    });
  }

  return issues;
}

function calcSectionPresence(sections: SectionCheck[]): number {
  const presentCount = sections.filter((s) => s.present).length;
  return (presentCount / 10) * 40;
}

function calcSectionQuality(sections: SectionCheck[]): number {
  const qualitySum = sections.reduce((sum, s) => {
    if (s.quality === "complete") return sum + 2;
    if (s.quality === "partial") return sum + 1;
    return sum;
  }, 0);
  return (qualitySum / 20) * 20;
}

function calcBddCompleteness(bddScenarios: BddCheck[]): number {
  if (bddScenarios.length === 0) return 0;
  const executable = bddScenarios.filter((b) => b.isExecutable).length;
  return (executable / bddScenarios.length) * 20;
}

function calcResearchScore(frontmatter: SpecFrontmatter): number {
  const confidence = frontmatter.research_confidence?.toLowerCase() ?? "";
  return CONFIDENCE_SCORES[confidence] ?? DEFAULT_CONFIDENCE_SCORE;
}

export function calculateCompliance(
  sections: SectionCheck[],
  bddScenarios: BddCheck[],
  sourcesCount: number,
  frontmatter: SpecFrontmatter,
): number {
  const sectionPresence = calcSectionPresence(sections);
  const sectionQuality = calcSectionQuality(sections);
  const bddCompleteness = calcBddCompleteness(bddScenarios);
  const sourcesPresent = sourcesCount > 0 ? 10 : 0;
  const researchScore = calcResearchScore(frontmatter);

  return Math.round(
    sectionPresence +
      sectionQuality +
      bddCompleteness +
      sourcesPresent +
      researchScore,
  );
}
