/**
 * Helpers for the PermissionDenied hook. Split out to keep the hook's
 * per-file cyclomatic complexity under the project threshold.
 */

const PREVIEW_MAX = 200;

interface ToolInput {
  command?: unknown;
  file_path?: unknown;
  [key: string]: unknown;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeBash(toolInput: ToolInput | undefined): string {
  const trimmed = asString(toolInput?.command).trim();
  if (!trimmed) return "bash:unknown";
  const [first] = trimmed.split(/\s+/);
  return first || "unknown";
}

function extensionOf(path: string): string {
  const dot = path.lastIndexOf(".");
  const slashPos = path.lastIndexOf("/");
  const backPos = path.lastIndexOf("\\");
  const slash = slashPos > backPos ? slashPos : backPos;
  if (dot > slash && dot >= 0) return path.slice(dot).toLowerCase();
  return "unknown";
}

function normalizeFileTool(toolInput: ToolInput | undefined): string {
  const path = asString(toolInput?.file_path);
  return extensionOf(path);
}

/**
 * Normalize a denied tool call into a short stable key.
 * - Bash: first token of command (e.g. "rm", "curl", "git")
 * - Edit/Write: file extension (e.g. ".ts") or "unknown"
 * - Other: tool name only
 */
export function normalizeDeniedCall(
  toolName: string,
  toolInput: Record<string, unknown> | undefined,
): string {
  const name = toolName || "unknown";
  const input = toolInput as ToolInput | undefined;
  if (name === "Bash") return normalizeBash(input);
  if (name === "Edit" || name === "Write") return normalizeFileTool(input);
  return name;
}

export function extractCommandPreview(
  toolName: string,
  toolInput: Record<string, unknown> | undefined,
): string {
  const input = toolInput as ToolInput | undefined;
  if (toolName === "Bash")
    return asString(input?.command).slice(0, PREVIEW_MAX);
  if (toolName === "Edit" || toolName === "Write") {
    return asString(input?.file_path).slice(0, PREVIEW_MAX);
  }
  return "";
}

const REASON_KEYS = ["reason", "denied_by", "deniedBy", "message", "error"];

function reasonFromValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") {
    const msg = (value as Record<string, unknown>).message;
    if (typeof msg === "string") return msg.trim();
  }
  return "";
}

export function extractReason(input: Record<string, unknown>): string {
  for (const key of REASON_KEYS) {
    const found = reasonFromValue(input[key]);
    if (found) return found;
  }
  return "unknown";
}

/**
 * Build the synthesized message recorded via recordError.
 * Prefix `[tool-deny]` is detected by error-pattern-matching as category
 * `permission_denial`.
 */
export function buildDenialMessage(
  toolName: string,
  normalized: string,
  preview: string,
  reason: string,
): string {
  const parts = [`[tool-deny] ${toolName}:${normalized}`];
  if (preview) parts.push(`cmd=${preview}`);
  parts.push(`reason=${reason}`);
  return parts.join(" ");
}
