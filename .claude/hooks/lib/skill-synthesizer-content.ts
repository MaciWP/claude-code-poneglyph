/**
 * Content generation for skill synthesis (SPEC-014).
 * Keyword extraction, name generation, and draft formatting.
 */

import type { WorkflowPattern } from "./pattern-learning-types";
import type { SynthesizedSkill } from "./skill-synthesizer-types";
import {
  buildPatternLines,
  buildConventionLines,
  buildAntiPatternLines,
  buildExampleLines,
} from "./skill-synthesizer-builders";

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "is",
  "in",
  "to",
  "of",
  "for",
  "with",
  "on",
  "at",
  "by",
  "from",
  "it",
  "this",
  "that",
]);

function collectPatternWords(p: WorkflowPattern["pattern"]): string[] {
  const words: string[] = [];
  if (p.agents) words.push(...p.agents);
  if (p.skills) words.push(...p.skills);
  if (p.taskType) words.push(p.taskType);
  if (p.recoverySteps) words.push(...p.recoverySteps);
  return words;
}

function incrementFreq(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) || 0) + 1);
}

export function extractKeywords(pattern: WorkflowPattern): string[] {
  const words = collectPatternWords(pattern.pattern);
  const freqMap = new Map<string, number>();

  for (const word of words) {
    const lower = word.toLowerCase().trim();
    if (!lower) continue;
    if (STOP_WORDS.has(lower)) continue;
    incrementFreq(freqMap, lower);
  }

  return [...freqMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
}

function pickNameParts(p: WorkflowPattern["pattern"]): string[] {
  if (p.agents && p.agents.length > 0) return p.agents.slice(0, 2);
  if (p.skills && p.skills.length > 0) return p.skills.slice(0, 2);
  if (p.taskType) return [p.taskType];
  return [];
}

function sanitizeKebab(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateSkillName(pattern: WorkflowPattern): string {
  const parts = [pattern.type, ...pickNameParts(pattern.pattern)];
  const candidate = sanitizeKebab(parts.join("-"));
  if (candidate.length > 40) {
    return candidate.slice(0, 40).replace(/-$/, "");
  }
  return candidate;
}

export function generateContent(
  pattern: WorkflowPattern,
): SynthesizedSkill["content"] {
  return {
    patterns: buildPatternLines(pattern),
    conventions: buildConventionLines(pattern),
    antiPatterns: buildAntiPatternLines(pattern),
    examples: buildExampleLines(pattern),
  };
}

function renderSection(heading: string, items: string[]): string[] {
  if (items.length === 0) return [];
  return [`## ${heading}`, "", ...items.map((i) => `- ${i}`), ""];
}

export function formatDraftContent(skill: SynthesizedSkill): string {
  const frontmatter = [
    "---",
    `name: ${skill.name}`,
    `description: "${skill.description}"`,
    `triggers: [${skill.triggers.join(", ")}]`,
    `version: ${skill.version}`,
    `source_pattern: ${skill.source.patternId}`,
    `confidence: ${skill.source.confidence}`,
    "auto_synthesized: true",
    "---",
  ].join("\n");

  const sections = [
    frontmatter,
    "",
    `# ${skill.name}`,
    "",
    ...renderSection("Patterns", skill.content.patterns),
    ...renderSection("Conventions", skill.content.conventions),
    ...renderSection("Anti-Patterns", skill.content.antiPatterns),
    ...renderSection("Examples", skill.content.examples),
  ];

  return sections.join("\n");
}
