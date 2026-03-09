import type { Section } from "./parser";

export interface ScoredSection {
  section: Section;
  score: number;
  matchedTerms: string[];
}

export function scoreSections(
  sections: Section[],
  queryTerms: string[],
): ScoredSection[] {
  if (queryTerms.length === 0 || sections.length === 0) return [];

  const normalizedTerms = queryTerms.map((t) => t.toLowerCase());
  const scored: ScoredSection[] = [];

  for (const section of sections) {
    const matchedTerms: string[] = [];
    let rawScore = 0;

    const headingLower = section.heading.toLowerCase();
    for (const term of normalizedTerms) {
      if (headingLower.includes(term)) {
        rawScore += 3;
        matchedTerms.push(term);
      }
    }

    for (const term of normalizedTerms) {
      if (section.keywords.includes(term)) {
        rawScore += 2;
        if (!matchedTerms.includes(term)) matchedTerms.push(term);
      }
    }

    const contentLower = section.content.toLowerCase();
    for (const term of normalizedTerms) {
      if (contentLower.includes(term) && !matchedTerms.includes(term)) {
        rawScore += 1;
        matchedTerms.push(term);
      }
    }

    if (rawScore > 0) {
      const maxScore = normalizedTerms.length * 6;
      scored.push({
        section,
        score: Math.min(1.0, rawScore / maxScore),
        matchedTerms,
      });
    }
  }

  return scored.sort((a, b) => b.score - a.score);
}

export function filterByRelevance(
  scored: ScoredSection[],
  minScore: number = 0.1,
): ScoredSection[] {
  return scored.filter((s) => s.score >= minScore);
}
