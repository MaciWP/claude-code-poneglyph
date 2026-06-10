#!/usr/bin/env bun

/**
 * Skill Activation Hook (UserPromptSubmit)
 *
 * Deterministic layer under `skill-advisor`: matches the submitted prompt
 * against skill keywords read FROM DISK (no hardcoded list that rots) and,
 * on match, prints an explicit `Skill(<name>)` instruction to stdout —
 * UserPromptSubmit stdout is injected as context Claude can act on.
 * Community-proven: explicit tool-call instructions fire; vague hints don't.
 *
 * Conservative by design (injection noise costs more than a missed hint):
 *   - strong keyword (≥5 chars, or multi-word) → 1 hit qualifies the skill
 *   - weak keyword (3-4 chars) → needs ≥2 total hits
 *   - top 2 skills max; injection ≤5 lines; slash-command prompts skipped
 *
 * Known caveat: UserPromptSubmit has a reliability gap early-session /
 * post-compaction (issue #17277) — best-effort layer, never a sole gate.
 * Exits 0 always; silent (no stdout) when nothing matches.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { readHookStdin } from "./lib/hook-stdin";

export interface SkillEntry {
  name: string;
  keywords: string[];
}

interface PromptPayload {
  prompt?: string;
  cwd?: string;
  [key: string]: unknown;
}

// Head of SKILL.md is enough: name + description (with the Keywords line)
// live in the frontmatter. Avoids loading full bodies on every prompt.
const HEAD_BYTES = 2_500;

export function loadSkills(dirs: string[]): SkillEntry[] {
  const byName = new Map<string, SkillEntry>();
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const skillFile = join(dir, entry, "SKILL.md");
      if (byName.has(entry) || !existsSync(skillFile)) continue;
      try {
        const head = readFileSync(skillFile, "utf8").slice(0, HEAD_BYTES);
        const kwLine = head.match(/Keywords\s*-\s*(.+)/i);
        if (!kwLine) continue;
        const keywords = kwLine[1]
          .split(",")
          .map((k) => k.trim().toLowerCase().replace(/['"]/g, ""))
          .filter((k) => k.length >= 3);
        if (keywords.length > 0) byName.set(entry, { name: entry, keywords });
      } catch {
        // unreadable skill — skip
      }
    }
  }
  return [...byName.values()];
}

const STRONG_KEYWORD_MIN = 5;
const MAX_SKILLS = 2;

export function matchSkills(prompt: string, skills: SkillEntry[]): string[] {
  const p = prompt.toLowerCase();
  if (!p.trim()) return [];

  const scored: { name: string; hits: number; strong: boolean }[] = [];
  for (const skill of skills) {
    let hits = 0;
    let strong = false;
    for (const kw of skill.keywords) {
      if (p.includes(kw)) {
        hits++;
        if (kw.length >= STRONG_KEYWORD_MIN || kw.includes(" ")) strong = true;
      }
    }
    if (strong || hits >= 2) scored.push({ name: skill.name, hits, strong });
  }
  return scored
    .sort((a, b) => b.hits - a.hits)
    .slice(0, MAX_SKILLS)
    .map((s) => s.name);
}

export function buildInjection(names: string[]): string {
  if (names.length === 0) return "";
  return [
    "<skill-activation-hint>",
    ...names.map((n) => `Invoke Skill(${n}) before answering — keyword match for this prompt.`),
    "</skill-activation-hint>",
  ].join("\n");
}

// Full pure pipeline: raw stdin → injection string ("" on any invalid input).
export function processPayload(raw: string, skills: SkillEntry[]): string {
  if (!raw.trim()) return "";
  let payload: PromptPayload;
  try {
    payload = JSON.parse(raw) as PromptPayload;
  } catch {
    return "";
  }
  const prompt = typeof payload.prompt === "string" ? payload.prompt : "";
  if (!prompt.trim() || prompt.trimStart().startsWith("/")) return "";
  return buildInjection(matchSkills(prompt, skills));
}

if (import.meta.main) {
  try {
    const raw = await readHookStdin();
    let cwd = process.cwd();
    try {
      const parsed = JSON.parse(raw) as PromptPayload;
      if (typeof parsed.cwd === "string") cwd = parsed.cwd;
    } catch {
      // fall through — processPayload handles malformed input
    }
    const skills = loadSkills([
      join(cwd, ".claude", "skills"),
      join(homedir(), ".claude", "skills"),
    ]);
    const injection = processPayload(raw, skills);
    if (injection) process.stdout.write(injection + "\n");
  } catch {
    // best-effort — never block the prompt
  }
  process.exit(0);
}
