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
