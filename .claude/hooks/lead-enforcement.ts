#!/usr/bin/env bun
/**
 * Lead Enforcement Hook (PreToolUse)
 *
 * Blocks Edit/Write in LEAD_MODE — these must be delegated to builder.
 * Read/Glob/Grep are always allowed (orientation tools per CLAUDE.md).
 * Bash is warn-only (too broad to block; many legitimate read-only uses).
 * FREEZE_MODE independently blocks Edit/Write regardless of LEAD_MODE.
 */

async function main(): Promise<void> {
  const input = JSON.parse(await Bun.stdin.text());
  const tool = input.tool_name;

  // Subagents can Edit/Write freely — lead mode restriction applies only to the Lead.
  // agent_id is a non-empty string when caller is a subagent; absent or empty-string for the Lead.
  // Both cases are falsy-safe: "" and undefined are both falsy in JS.
  if (input.agent_id) {
    process.exit(0);
  }

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

  // Allow writes to Claude's internal planning and memory directories
  const filePath: string = input.tool_input?.file_path ?? input.tool_input?.path ?? "";
  const homeDir = process.env.HOME ?? process.env.USERPROFILE ?? "";
  const allowedPaths = [
    `${homeDir}/.claude/plans/`,
    `${homeDir}/.claude/projects/`,
  ];
  if (filePath && allowedPaths.some((p) => filePath.startsWith(p))) {
    process.exit(0);
  }

  if (["Edit", "Write"].includes(tool)) {
    console.error(
      `🚫 Lead mode: Edit/Write must be delegated to builder. For complexity <20 direct actions, set CLAUDE_LEAD_MODE=false temporarily.`,
    );
    process.exit(2);
  }

  if (tool === "Bash") {
    console.error(
      `⚠️ Lead mode: Bash used directly. Only allowed for read-only operations or complexity <20 (state inline: "Complexity: ~X → direct action").`,
    );
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
