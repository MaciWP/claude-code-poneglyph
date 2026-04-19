#!/usr/bin/env bun
/**
 * Lead Enforcement Hook (PreToolUse)
 *
 * WARN-ONLY: never blocks (always exit 0).
 * Emits a warning to stderr when the main session uses direct tools
 * instead of delegating to subagents. It is just a reminder, not a blocker.
 *
 * The actual orchestration rules are in rules/lead-orchestrator.md.
 */

async function main(): Promise<void> {
  const input = JSON.parse(await Bun.stdin.text());
  const tool = input.tool_name;

  if (
    process.env.CLAUDE_FREEZE_MODE === "true" &&
    ["Edit", "Write"].includes(tool)
  ) {
    console.error(
      "🔒 Freeze mode active: Edit/Write blocked. Use /freeze off to deactivate.",
    );
    process.exit(2);
  }

  if (process.env.CLAUDE_LEAD_MODE !== "true") {
    process.exit(0);
  }
  const directTools = ["Read", "Edit", "Write", "Bash", "Glob", "Grep"];

  if (directTools.includes(tool)) {
    console.error(`⚠️ Lead: ${tool} used directly. Consider delegating.`);
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
