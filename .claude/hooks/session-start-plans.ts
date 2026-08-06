#!/usr/bin/env bun

// SessionStart open-plans reminder (US1, plan 027). Fires on EVERY session start
// (post-compact only fires after a compaction — short sessions never saw the
// reminder; audit 2026-06-30 follow-up, design ratified). Thin main over the
// shared scan exported by post-compact.ts — same dir, synced together, no
// sync-trap. Best-effort: never blocks the session; silent when nothing is open.
import { openPlansReminder } from "./post-compact";

// Location-conditional skill hint (030): sessions inside the Bjumper workspace
// get ONE line pointing at worktrees-bjumper (topology + navigation). Rules
// `paths:` frontmatter only documents project-relative globs, so cwd-matching
// here is the deterministic route. Separator-agnostic (macOS/Windows).
export function bjumperWorkspaceHint(cwd: string): string | null {
  if (!/[\\/]Bjumper[\\/]REPOSITORIOS(?:[\\/]|$)/.test(cwd)) return null;
  return (
    "## Workspace Bjumper\n" +
    "Estás en el workspace Bjumper (git worktrees + CLI bjumper-worktrees). " +
    "Para topología y navegación entre repos/worktrees: Skill(worktrees-bjumper)."
  );
}

export function buildSessionStartOutput(plansRoot = ".claude/plans", cwd = process.cwd()): string | null {
  const sections = [openPlansReminder(plansRoot), bjumperWorkspaceHint(cwd)].filter(
    (s): s is string => s !== null,
  );
  return sections.length > 0 ? sections.join("\n\n") : null;
}

if (import.meta.main) {
  try {
    const out = buildSessionStartOutput();
    if (out) console.log(out);
  } catch {
    // best-effort — never block session start
  }
  process.exit(0);
}
