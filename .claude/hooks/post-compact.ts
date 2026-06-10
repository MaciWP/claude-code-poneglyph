#!/usr/bin/env bun

export const LEAD_REMINDER = [
  "## Lead Orchestrator Mode (re-injected after compaction)",
  "This session operates as Lead Orchestrator — orchestrator-first, but bounded work (1-3 units) runs inline; do not over-delegate.",
  "Spawn decision tree (single source of truth in orchestrator-protocol): 1 agent is forbidden; 1-3 units → inline; ≥4 independent units → Workflow (opt-in); massive read-only exploration → Explore (Haiku built-in). No custom work-agents.",
  "Lead default-allow gate is on: Edit/Write/Bash work directly unless touching sensitive paths or destructive ops. A single unit of work — even ≥5 files — stays inline ('isolation' is not a reason to spawn).",
  "Planning lives in Skill('tech-plan'); error diagnosis in Skill('diagnostic-patterns') — both Lead-invoked. Use Skill() for context, AskUserQuestion() to clarify.",
].join("\n");

export const ANTI_HALLUCINATION = [
  "## Anti-Hallucination Checklist",
  "1. Glob before asserting file exists",
  "2. Read before Edit",
  "3. Grep/LSP before asserting function exists",
  "4. Ask if confidence < 70%",
].join("\n");

export function getSessionMode(): string | null {
  const mode = Bun.env.CLAUDE_LEAD_MODE;
  if (mode === "true") {
    return "## Session Mode\nCLAUDE_LEAD_MODE=true (Lead Orchestrator active)";
  }
  return null;
}

export function buildOutput(): string {
  const sections: string[] = [LEAD_REMINDER, ANTI_HALLUCINATION];

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
