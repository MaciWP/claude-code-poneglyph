/**
 * Shared stdin reader for best-effort hooks.
 *
 * Uses Bun.stdin.text() (same pattern as memory-inject.ts). Swallows errors
 * and returns an empty string so callers can treat "no input" as a no-op.
 */

export async function readHookStdin(): Promise<string> {
  try {
    return await Bun.stdin.text();
  } catch {
    return "";
  }
}
