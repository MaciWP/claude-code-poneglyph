#!/usr/bin/env bun

// PostCompact re-injection. The open-plans reminder section was cut post-audit
// 2026-08-07 (measured follow-through 1/9; the SessionStart copy was retired in
// the same change — re-engagement with open /flow plans is manual via
// `bun $HOME/.claude/scripts/flow-state.ts status`).

export const LEAD_REMINDER = [
  "## Lead Orchestrator Mode (re-injected after compaction)",
  "This session operates as Lead Orchestrator — orchestrator-first, but bounded work (1-3 units) runs inline; do not over-delegate.",
  "Agent spawn hard gate (CLAUDE.md §Agent spawn): NEVER launch Agent/Workflow/Explore/Task/Codex workers without THIS-TURN permission + model choice; ask both questions and WAIT. Defaults when approved — cheapest host tier for search/bulk, mid tier for research/synthesis, top tier + reason for high-risk verify; resolve tier NAMES from the active host at runtime (Agent tool model options / CLI config), never from memory; single-model hosts: permission still required, model N/A. Spawn tree (orchestrator-protocol, after approval): 1 agent forbidden; 1-3 units → inline; ≥4 independent read-only → Workflow. No custom work-agents.",
  "Lead default-allow gate is on for Edit/Write/Bash (not for Agent — Agent is permissions.ask). A single unit of work — even ≥5 files — stays inline ('isolation' is not a reason to spawn).",
  "Git/PR hard gate (CLAUDE.md §Git / PR): NEVER proactive commit/push/branch/PR — only when the user asked THIS turn. About to slip → STOP and AskUserQuestion/drillme; do not default-close with '¿hago commit?'. Never add AI authorship (Co-Authored-By, 'Generated with …', subject/body AI credit) unless asked THIS turn.",
  "Planning lives in Skill('tech-plan'); error diagnosis in Skill('diagnostic-patterns') — both Lead-invoked. Use Skill() for context, AskUserQuestion() to clarify.",
].join("\n");

export function getSessionMode(): string | null {
  const mode = Bun.env.CLAUDE_LEAD_MODE;
  if (mode === "true") {
    return "## Session Mode\nCLAUDE_LEAD_MODE=true (Lead Orchestrator active)";
  }
  return null;
}

export function buildOutput(): string {
  // ANTI_HALLUCINATION block cut (030): CLAUDE.md reloads at the same compaction
  // instant (proven via instructions-loaded.log) and already carries the checklist.
  const sections: string[] = [LEAD_REMINDER];

  const modeSection = getSessionMode();
  if (modeSection) {
    sections.push(modeSection);
  }

  return sections.join("\n\n");
}

async function main(): Promise<void> {
  try {
    console.log(buildOutput());
  } catch {
    // best-effort — never block Claude Code
  }

  process.exit(0);
}

if (import.meta.main) {
  main();
}
