#!/usr/bin/env bun
/**
 * Lead Enforcement Hook (PreToolUse)
 *
 * In CLAUDE_LEAD_MODE=true: blocks (exit 2) when the Lead uses prohibited
 * tools directly on non-whitelisted paths. Whitelisted paths (Lead's own
 * config, memory, plans, CLAUDE.md, orchestrator) are always allowed.
 *
 * The actual orchestration rules are in rules/lead-orchestrator.md.
 */

import { readHookStdin } from "./lib/hook-stdin";

const WHITELISTED_PATTERNS = [
  /[/\\]\.claude[/\\]/,
  /^\.claude[/\\]/,
  /[/\\]memory[/\\]/,
  /^memory[/\\]/,
  /[/\\]agent-memory[/\\]/,
  /^agent-memory[/\\]/,
  /[/\\]orchestrator[/\\]/,
  /^orchestrator[/\\]/,
  /[Cc]:[/\\][Uu]sers[/\\][^/\\]+[/\\]\.claude[/\\]/,
  /\/Users\/[^/]+\/\.claude\//,
  /CLAUDE\.md$/i,
];

function isWhitelisted(path: string): boolean {
  return WHITELISTED_PATTERNS.some((pattern) => pattern.test(path));
}

function isBashGitCommandWhitelisted(command: string): boolean {
  const trimmed = command.trim();
  return trimmed.startsWith("git ");
}

function extractPath(tool: string, input: Record<string, unknown>): string {
  if (typeof input.file_path === "string") return input.file_path;
  if (typeof input.path === "string") return input.path;
  if (typeof input.command === "string") return input.command;
  if (typeof input.pattern === "string") return input.pattern;
  return "";
}

async function main(): Promise<void> {
  const raw = await readHookStdin();
  if (!raw.trim()) process.exit(0);

  let input: Record<string, unknown>;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const tool = input.tool_name as string | undefined;
  const toolInput = (input.tool_input ?? {}) as Record<string, unknown>;

  if (
    process.env.CLAUDE_FREEZE_MODE === "true" &&
    ["Edit", "Write"].includes(tool ?? "")
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
  if (!directTools.includes(tool ?? "")) {
    process.exit(0);
  }

  // Bash: check if command is a whitelisted git command
  if (tool === "Bash") {
    const command = toolInput.command as string | undefined;
    if (command && isBashGitCommandWhitelisted(command)) {
      process.exit(0);
    }
  }

  const path = extractPath(tool!, toolInput);
  if (path && isWhitelisted(path)) {
    process.exit(0);
  }

  console.error(
    `\n[LEAD ENFORCEMENT] Direct ${tool} blocked. Delegate to builder/scout instead.\nPath: ${path || "(none)"}\n`,
  );
  process.exit(2);
}

main().catch(() => process.exit(0));
