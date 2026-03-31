#!/usr/bin/env bun

/**
 * Auto-Approve Hook (PermissionRequest)
 *
 * Best-effort: auto-approves known-safe tool patterns to reduce permission prompts.
 * When in doubt, passes through to normal permission flow (no output, exit 0).
 *
 * PermissionRequest hooks receive JSON via stdin with:
 *   - tool_name: string
 *   - tool_input: Record<string, unknown>
 *   - session_id: string
 *
 * Output `{"permissionDecision": "allow"}` to auto-approve.
 * No output (exit 0) to pass through to normal permission flow.
 */

interface PermissionInput {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  session_id?: string;
  [key: string]: unknown;
}

const SAFE_BASH_PREFIXES = [
  "bun test",
  "git status",
  "git diff",
  "git log",
  "git branch",
  "ls",
  "pwd",
];

function isSafeBashCommand(command: string): boolean {
  const trimmed = command.trim();
  if (SAFE_BASH_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
    return true;
  }
  // cat only on .claude/ files
  if (trimmed.startsWith("cat ") && trimmed.includes("/.claude/")) {
    return true;
  }
  return false;
}

function isSafePath(path: string): boolean {
  return path.includes("/.claude/") || path.includes("\\.claude\\");
}

function shouldAutoApprove(
  tool: string,
  input: Record<string, unknown>,
): boolean {
  switch (tool) {
    case "Bash": {
      const command =
        typeof input.command === "string" ? input.command : "";
      return isSafeBashCommand(command);
    }
    case "Read": {
      const filePath =
        typeof input.file_path === "string" ? input.file_path : "";
      return isSafePath(filePath);
    }
    case "Glob":
    case "Grep":
    case "WebSearch":
      return true;
    default:
      return false;
  }
}

try {
  const raw = await Bun.stdin.text();
  if (raw.trim()) {
    const input: PermissionInput = JSON.parse(raw);
    const tool = input.tool_name ?? "";
    const toolInput = input.tool_input ?? {};

    if (shouldAutoApprove(tool, toolInput)) {
      process.stderr.write(`[auto-approve] allowing ${tool}\n`);
      process.stdout.write(
        JSON.stringify({ permissionDecision: "allow" }) + "\n",
      );
    }
  }
} catch {
  // Best-effort: never block on parse failure
}

process.exit(0);
