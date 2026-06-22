#!/usr/bin/env bun
// Stop hook: scans recently modified files for potential secret leaks.
// Synchronous + visible: when a secret is suspected it surfaces a `systemMessage`
// to the user (stdout JSON). It NEVER blocks the turn (always exits 0) — it warns,
// it does not gate. Registered WITHOUT `async` so the systemMessage is not discarded.

import { readHookStdin } from "./lib/hook-stdin";

export const SECRET_PATTERN =
  /(?:API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY)\s*[=:]\s*['"]?[A-Za-z0-9_\-\.]{16,}['"]?/gi;

export const SECRET_PATTERN_CI =
  /(?:password|passwd|secret|api_key|apikey|access_token|accesstoken|private_key|privatekey)\s*[=:]\s*.{8,}/i;

// Markdown is documentation/illustration by nature: how-tos, skill references,
// and PR reports routinely contain `SECRET_KEY=...` / `password: ...` as EXAMPLES.
// SECRET_PATTERN_CI matches that prose en masse, so a stateless Stop hook re-surfaces
// the same false positives every turn — training the user to ignore the gate, which
// is exactly when a REAL leak gets missed. Real secrets live in .env / code / config,
// not in .md. So .md is intentionally NOT scanned; detection in the rest stays intact.
const TEXT_EXTENSIONS = new Set([
  ".ts", ".js", ".json", ".env", ".yaml", ".yml",
]);

export function hasTextExtension(filePath: string): boolean {
  const dot = filePath.lastIndexOf(".");
  if (dot === -1) return false;
  return TEXT_EXTENSIONS.has(filePath.slice(dot).toLowerCase());
}

// The .claude/ tree is Claude Code orchestration config — hooks, skills, commands,
// rules, settings — i.e. meta-system plumbing, NOT the project's business code where
// a real secret leak matters. By nature it CONTAINS secret-shaped literals: this very
// detector's SECRET_PATTERN, its tests (`API_KEY = "..."`), security how-tos, auth
// skills. Scanning it produces self-matching false positives every turn. The gate
// watches YOUR code; .claude/ is the tool, not the codebase. (.md anywhere is already
// excluded by hasTextExtension.) Tradeoff: a literal secret in .claude/settings.json
// is not caught — acceptable, that's tool config (secrets belong in env/gitignore).
export function isOrchestrationPath(filePath: string): boolean {
  return /(?:^|\/)\.claude\//.test(filePath);
}

// Per-line secret check. Resets the stateful /g regex BEFORE testing — the
// lastIndex gotcha would silently skip alternating lines otherwise.
export function lineHasSecret(line: string): boolean {
  SECRET_PATTERN.lastIndex = 0;
  return SECRET_PATTERN.test(line) || SECRET_PATTERN_CI.test(line);
}

export async function getModifiedFiles(): Promise<string[]> {
  const [stagedProc, untrackedProc] = [
    Bun.spawn(["git", "diff", "--name-only", "HEAD"], { stdout: "pipe", stderr: "pipe" }),
    Bun.spawn(["git", "ls-files", "--others", "--exclude-standard"], { stdout: "pipe", stderr: "pipe" }),
  ];
  const [stagedOut, untrackedOut] = await Promise.all([
    new Response(stagedProc.stdout).text(),
    new Response(untrackedProc.stdout).text(),
  ]);
  await Promise.all([stagedProc.exited, untrackedProc.exited]);
  const all = new Set([...stagedOut.split("\n"), ...untrackedOut.split("\n")]);
  return [...all]
    .map((f) => f.trim())
    .filter((f) => f.length > 0 && hasTextExtension(f) && !isOrchestrationPath(f));
}

// Returns a list of "path:line" hits (empty if none). Pure — no stderr side effects,
// so main() can aggregate hits into a single visible systemMessage.
export async function scanFile(filePath: string): Promise<string[]> {
  const hits: string[] = [];
  try {
    const file = Bun.file(filePath);
    if (!(await file.exists())) return hits;
    const content = await file.text();
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lineHasSecret(lines[i])) {
        hits.push(`${filePath}:${i + 1}`);
      }
    }
  } catch {
    // best-effort — skip unreadable files
  }
  return hits;
}

async function main(): Promise<void> {
  try {
    const raw = await readHookStdin();
    if (!raw.trim()) process.exit(0);

    const files = await getModifiedFiles();
    if (files.length === 0) process.exit(0); // early-out: nothing changed → no file scan

    const hits = (await Promise.all(files.map(scanFile))).flat();
    if (hits.length > 0) {
      const list = hits.map((h) => `  - ${h}`).join("\n");
      const message =
        `[security-gate] Potential secret(s) in recently modified files:\n${list}\n` +
        `Review, then remove and rotate/revoke before committing.`;
      // systemMessage is shown to the user; exit 0 keeps it non-blocking.
      process.stdout.write(JSON.stringify({ systemMessage: message }) + "\n");
    }
  } catch {
    // best-effort — never block
  }

  process.exit(0);
}

if (import.meta.main) {
  main();
}
