/**
 * skill-advisor ranking — pure, deterministic pre-filter.
 *
 * NOT a re-implementation of the model's semantic matching (keywords have ~0
 * measured effect on native activation — see _research-skill-activation). This
 * is a cheap lexical pre-filter that produces a SHORTLIST the human ratifies.
 * The skill body (SKILL.md) reasons over the in-context listing on top of this.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface SkillMeta {
  name: string;
  description: string;
  keywords: string[];
}

export interface RankedSkill extends SkillMeta {
  score: number;
}

export const SHORTLIST_MAX = 5;
const HEAD_BYTES = 2_500;
const STOP = new Set([
  "the", "and", "for", "with", "que", "los", "las", "una", "del", "por", "con",
  "este", "esta", "para", "como", "the", "a", "de", "el", "la", "en", "un",
]);

function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/[a-záéíóúñ0-9]+/gi) ?? [])
    .filter((t) => t.length >= 3 && !STOP.has(t));
}

/**
 * Pure: given a task and a list of skill metadata, return a deduped shortlist
 * (≤ SHORTLIST_MAX) ranked by lexical overlap. Empty when nothing matches —
 * never invents candidates.
 */
export function rank(task: string, skills: SkillMeta[]): RankedSkill[] {
  const taskTokens = new Set(tokenize(task));
  if (taskTokens.size === 0) return [];

  const byName = new Map<string, RankedSkill>();
  for (const skill of skills) {
    if (byName.has(skill.name)) continue; // dedupe across dirs by name
    const hay = new Set([
      ...tokenize(skill.name),
      ...tokenize(skill.description),
      ...skill.keywords.flatMap((k) => tokenize(k)),
    ]);
    let score = 0;
    for (const t of taskTokens) if (hay.has(t)) score++;
    if (score > 0) byName.set(skill.name, { ...skill, score });
  }

  return [...byName.values()]
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, SHORTLIST_MAX);
}

/** Reads SKILL.md heads from the given dirs. Mirrors skill-activation.loadSkills. */
export function loadSkillsFromDisk(dirs: string[]): SkillMeta[] {
  const byName = new Map<string, SkillMeta>();
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const file = join(dir, entry, "SKILL.md");
      if (byName.has(entry) || !existsSync(file)) continue;
      try {
        const head = readFileSync(file, "utf8").slice(0, HEAD_BYTES);
        const descMatch = head.match(/description:\s*([^\n]+)/i);
        const kwLine = head.match(/Keywords\s*-\s*(.+)/i);
        const keywords = kwLine
          ? kwLine[1].split(",").map((k) => k.trim().toLowerCase()).filter((k) => k.length >= 3)
          : [];
        byName.set(entry, {
          name: entry,
          description: descMatch ? descMatch[1].trim() : "",
          keywords,
        });
      } catch {
        // unreadable — skip
      }
    }
  }
  return [...byName.values()];
}
