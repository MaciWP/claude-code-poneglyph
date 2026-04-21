#!/usr/bin/env bun

/**
 * Auto-Approve Hook (PermissionRequest)
 *
 * Block-list approach: approve everything by default, block only destructive operations.
 * When blocked, outputs nothing (exit 0) to pass through to normal permission flow.
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

// Returns a reason string if the command should be BLOCKED, null if safe to approve.
export function dangerousReason(command: string): string | null {
  const cmd = command.trim();

  // Delete operations
  if (/\brm\s/.test(cmd)) return "rm (file deletion)";
  if (/\brmdir\b/.test(cmd)) return "rmdir (directory deletion)";
  if (/\bdel\s/.test(cmd)) return "del (file deletion)";
  if (/\bunlink\s/.test(cmd)) return "unlink (file deletion)";
  if (/\bRemove-Item\b/.test(cmd)) return "Remove-Item (file deletion)";

  // Destructive git operations
  if (/\bgit\s+push\b/.test(cmd)) return "git push (remote write)";
  if (/\bgit\s+reset\s+--hard\b/.test(cmd)) return "git reset --hard";
  if (/\bgit\s+clean\b/.test(cmd)) return "git clean (untracked file deletion)";
  if (/\bgit\s+branch\s+-D\b/.test(cmd)) return "git branch -D (force delete branch)";
  if (/\bgit\s+rebase\s+-i\b/.test(cmd)) return "git rebase -i (interactive rebase)";

  // Secrets in command
  if (/[A-Z_]+(KEY|SECRET|TOKEN|PASSWORD)=\S+/.test(cmd)) return "secret value in command";

  return null;
}

export function shouldAutoApprove(
  tool: string,
  input: Record<string, unknown>,
): { approve: boolean; reason?: string } {
  if (tool === "Bash") {
    const command = typeof input.command === "string" ? input.command : "";
    const reason = dangerousReason(command);
    if (reason) return { approve: false, reason };
    return { approve: true };
  }
  // All other tools: approve by default
  return { approve: true };
}

if (import.meta.main) {
  try {
    const raw = await Bun.stdin.text();
    if (raw.trim()) {
      const input: PermissionInput = JSON.parse(raw);
      const tool = input.tool_name ?? "";
      const toolInput = input.tool_input ?? {};

      const { approve, reason } = shouldAutoApprove(tool, toolInput);

      if (approve) {
        process.stderr.write(`[auto-approve] allowing ${tool}\n`);
        process.stdout.write(
          JSON.stringify({ permissionDecision: "allow" }) + "\n",
        );
      } else {
        process.stderr.write(`[auto-approve] blocking ${tool}: ${reason}\n`);
      }
    }
  } catch {
    // Best-effort: never block on parse failure
  }

  process.exit(0);
}
