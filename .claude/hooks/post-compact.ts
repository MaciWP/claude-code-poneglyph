#!/usr/bin/env bun

const LEAD_REMINDER = [
  "## Lead Orchestrator Mode (re-injected after compaction)",
  "This session operates as Lead Orchestrator.",
  "NEVER use Read/Edit/Write/Bash/Glob/Grep directly. Delegate to agents (builder, reviewer, planner, scout, error-analyzer).",
  "Use Task() to delegate, Skill() for context, AskUserQuestion() to clarify.",
].join("\n");

const ANTI_HALLUCINATION = [
  "## Anti-Hallucination Checklist",
  "1. Glob before asserting file exists",
  "2. Read before Edit",
  "3. Grep/LSP before asserting function exists",
  "4. Ask if confidence < 70%",
].join("\n");

function getSessionMode(): string | null {
  const mode = Bun.env.CLAUDE_LEAD_MODE;
  if (mode === "true") {
    return "## Session Mode\nCLAUDE_LEAD_MODE=true (Lead Orchestrator active)";
  }
  return null;
}

async function main(): Promise<void> {
  try {
    const sections: string[] = [];

    sections.push(LEAD_REMINDER);
    sections.push(ANTI_HALLUCINATION);

    const modeSection = getSessionMode();
    if (modeSection) {
      sections.push(modeSection);
    }

    const output = sections.join("\n\n");
    console.log(output);
  } catch {
    // best-effort — never block Claude Code
  }

  process.exit(0);
}

main();
