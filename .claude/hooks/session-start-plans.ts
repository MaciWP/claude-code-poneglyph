#!/usr/bin/env bun

// SessionStart open-plans reminder (US1, plan 027). Fires on EVERY session start
// (post-compact only fires after a compaction — short sessions never saw the
// reminder; audit 2026-06-30 follow-up, design ratified). Thin main over the
// shared scan exported by post-compact.ts — same dir, synced together, no
// sync-trap. Best-effort: never blocks the session; silent when nothing is open.
import { openPlansReminder } from "./post-compact";

export function buildSessionStartOutput(plansRoot = ".claude/plans"): string | null {
  return openPlansReminder(plansRoot);
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
