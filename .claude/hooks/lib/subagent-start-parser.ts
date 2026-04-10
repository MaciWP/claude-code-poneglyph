/**
 * Parsers for the SubagentStart hook. Extracts spawn context
 * (expertise, skills, effort) from the agent's initial prompt.
 */

import { createHash } from "node:crypto";

const EXPERTISE_MARKER = "[ACCUMULATED EXPERTISE";
const TASK_MARKER = "[TASK]";
const EXPERTISE_OUTPUT_MARKER = "[EXPERTISE OUTPUT]";
const SKILLS_LINE_REGEX =
  /^(?:Loaded skills|Skills loaded|Skills):\s*([^\n]+)/im;
const EFFORT_REGEX = /\[effort:\s*(high|medium|low)\]/i;

/**
 * Count bytes of expertise content between [ACCUMULATED EXPERTISE...
 * and the next [TASK] or [EXPERTISE OUTPUT] marker. Returns 0 if absent.
 */
export function extractExpertiseBytes(prompt: string): number {
  const start = prompt.indexOf(EXPERTISE_MARKER);
  if (start < 0) return 0;
  const bracketEnd = prompt.indexOf("]", start);
  const contentStart =
    bracketEnd >= 0 ? bracketEnd + 1 : start + EXPERTISE_MARKER.length;
  const rest = prompt.slice(contentStart);
  const taskIdx = rest.indexOf(TASK_MARKER);
  const outIdx = rest.indexOf(EXPERTISE_OUTPUT_MARKER);
  const candidates = [taskIdx, outIdx].filter((i) => i >= 0);
  const endOffset =
    candidates.length > 0 ? Math.min(...candidates) : rest.length;
  const content = rest.slice(0, endOffset);
  return Buffer.byteLength(content, "utf8");
}

function splitCsv(line: string): string[] {
  return line
    .split(",")
    .map((s) => s.trim().replace(/^[`'"]|[`'"]$/g, ""))
    .filter((s) => s.length > 0);
}

/**
 * Extract injected skill names from the prompt.
 * Priority:
 *   1. Explicit "Loaded skills: a, b, c" line
 *   2. Fuzzy match against known skill names (if provided)
 *   3. Empty array
 */
export function extractSkillsInjected(
  prompt: string,
  knownSkills: readonly string[] = [],
): string[] {
  const match = prompt.match(SKILLS_LINE_REGEX);
  if (match) return splitCsv(match[1]);

  if (knownSkills.length === 0) return [];
  const found: string[] = [];
  for (const skill of knownSkills) {
    if (prompt.includes(skill)) found.push(skill);
  }
  return found;
}

export function extractEffort(
  prompt: string,
): "high" | "medium" | "low" | null {
  const match = prompt.match(EFFORT_REGEX);
  if (!match) return null;
  const level = match[1].toLowerCase();
  if (level === "high" || level === "medium" || level === "low") return level;
  return null;
}

export function promptHash(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 16);
}

export interface SpawnContext {
  expertiseBytes: number;
  skillsInjected: string[];
  effort: "high" | "medium" | "low" | null;
  promptHash: string;
}

export function parseSpawnContext(
  prompt: string,
  knownSkills: readonly string[] = [],
): SpawnContext {
  return {
    expertiseBytes: extractExpertiseBytes(prompt),
    skillsInjected: extractSkillsInjected(prompt, knownSkills),
    effort: extractEffort(prompt),
    promptHash: promptHash(prompt),
  };
}
