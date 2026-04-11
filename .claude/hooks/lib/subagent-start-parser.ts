/**
 * Parsers for the SubagentStart hook. Extracts spawn context
 * (memory, skills, effort) from the agent's initial prompt.
 */

import { createHash } from "node:crypto";

// Backward compat: historical traces used "[ACCUMULATED EXPERTISE" as the
// delegation marker. Phase 3 renamed it to "[ACCUMULATED MEMORY". Both are
// accepted here so old JSONL spawn records remain parseable and newer
// delegation templates work immediately.
const MEMORY_MARKER = "[ACCUMULATED MEMORY";
const LEGACY_EXPERTISE_MARKER = "[ACCUMULATED EXPERTISE";
const TASK_MARKER = "[TASK]";
const MEMORY_OUTPUT_MARKER = "[MEMORY OUTPUT]";
const LEGACY_MEMORY_OUTPUT_MARKER = "[EXPERTISE OUTPUT]";
const SKILLS_LINE_REGEX =
  /^(?:Loaded skills|Skills loaded|Skills):\s*([^\n]+)/im;
const EFFORT_REGEX = /\[effort:\s*(high|medium|low)\]/i;

function findMarker(prompt: string, markers: string[]): number {
  for (const m of markers) {
    const idx = prompt.indexOf(m);
    if (idx >= 0) return idx;
  }
  return -1;
}

/**
 * Count bytes of memory content between [ACCUMULATED MEMORY... (or the
 * legacy [ACCUMULATED EXPERTISE marker) and the next [TASK] / [MEMORY OUTPUT]
 * / [EXPERTISE OUTPUT] marker. Returns 0 if absent.
 */
export function extractMemoryBytes(prompt: string): number {
  const start = findMarker(prompt, [MEMORY_MARKER, LEGACY_EXPERTISE_MARKER]);
  if (start < 0) return 0;
  const bracketEnd = prompt.indexOf("]", start);
  const contentStart =
    bracketEnd >= 0 ? bracketEnd + 1 : start + MEMORY_MARKER.length;
  const rest = prompt.slice(contentStart);
  const taskIdx = rest.indexOf(TASK_MARKER);
  const memOutIdx = rest.indexOf(MEMORY_OUTPUT_MARKER);
  const expOutIdx = rest.indexOf(LEGACY_MEMORY_OUTPUT_MARKER);
  const candidates = [taskIdx, memOutIdx, expOutIdx].filter((i) => i >= 0);
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
  memoryBytes: number;
  skillsInjected: string[];
  effort: "high" | "medium" | "low" | null;
  promptHash: string;
}

export function parseSpawnContext(
  prompt: string,
  knownSkills: readonly string[] = [],
): SpawnContext {
  return {
    memoryBytes: extractMemoryBytes(prompt),
    skillsInjected: extractSkillsInjected(prompt, knownSkills),
    effort: extractEffort(prompt),
    promptHash: promptHash(prompt),
  };
}
