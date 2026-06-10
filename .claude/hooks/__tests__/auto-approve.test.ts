import { describe, test, expect } from "bun:test";
import {
  dangerousReason,
  shouldAutoApprove,
  decidePermission,
  safeParse,
} from "../auto-approve";

// Silent-failure guard: a regression that lets any of these auto-approve is
// invisible until a destructive op runs. Every dangerous branch keeps coverage.
describe("dangerousReason — destructive commands block", () => {
  const dangerous = [
    "rm -rf node_modules",
    "rm file.ts",
    "rmdir dist",
    "del file.txt",
    "unlink file.txt",
    "Remove-Item -Recurse dist",
    "git push origin main",
    "git push --force",
    "git push -f",
    "git reset --hard HEAD~1",
    "git clean -fd",
    "git branch -D feature",
    "git rebase -i HEAD~3",
    "MY_API_KEY=abc123secret curl https://api.example.com",
    "DB_SECRET=mysecretvalue node script.js",
    "GITHUB_TOKEN=ghp_abc123 gh pr create",
    "DB_PASSWORD=hunter2 pg_dump mydb",
  ];

  for (const cmd of dangerous) {
    test(`blocks: ${cmd}`, () => {
      expect(dangerousReason(cmd)).not.toBeNull();
    });
  }
});

// Boundary safes: commands sharing a prefix with a blocked pattern (git family)
// plus representative everyday commands — guards against false-positive drift.
describe("dangerousReason — safe commands pass", () => {
  const safe = [
    "bun test",
    "git status",
    "git add .",
    "git commit -m 'msg'",
    "git checkout main",
    "git merge feature",
    "npm install",
  ];

  for (const cmd of safe) {
    test(`passes: ${cmd}`, () => {
      expect(dangerousReason(cmd)).toBeNull();
    });
  }
});

describe("shouldAutoApprove — wiring", () => {
  test("Bash routes through dangerousReason with a reason on block", () => {
    const blocked = shouldAutoApprove("Bash", { command: "rm -rf node_modules" });
    expect(blocked.approve).toBe(false);
    expect(blocked.reason).toBeDefined();
    expect(shouldAutoApprove("Bash", { command: "git status" }).approve).toBe(true);
  });

  test("non-Bash tools approve by default", () => {
    expect(shouldAutoApprove("Read", { file_path: "/etc/passwd" }).approve).toBe(true);
    expect(shouldAutoApprove("Write", { file_path: "output.txt" }).approve).toBe(true);
    expect(shouldAutoApprove("WebFetch", { url: "https://example.com" }).approve).toBe(true);
  });

  test("empty command approves", () => {
    expect(shouldAutoApprove("Bash", { command: "" }).approve).toBe(true);
  });

  test("non-string command approves (best-effort)", () => {
    expect(shouldAutoApprove("Bash", { command: 42 }).approve).toBe(true);
  });
});

describe("decidePermission — payload via readHookStdin contract (T4.1)", () => {
  test("allowed tool payload returns allow decision", () => {
    const payload = JSON.stringify({ tool_name: "Read", tool_input: { file_path: "a.ts" } });
    expect(decidePermission(safeParse(payload))).toEqual({ permissionDecision: "allow" });
  });

  test("dangerous Bash payload returns null (passthrough to normal flow)", () => {
    const payload = JSON.stringify({ tool_name: "Bash", tool_input: { command: "rm -rf node_modules" } });
    expect(decidePermission(safeParse(payload))).toBeNull();
  });
});

describe("decidePermission — malformed stdin is a graceful no-op (T4.2)", () => {
  test("empty input returns null without throwing", () => {
    expect(decidePermission(safeParse(""))).toBeNull();
  });

  test("invalid JSON returns null without throwing", () => {
    expect(decidePermission(safeParse("{not json"))).toBeNull();
  });

  test("whitespace-only input returns null without throwing", () => {
    expect(decidePermission(safeParse("   \n"))).toBeNull();
  });
});

describe("stdin pattern regression guard (T4.3)", () => {
  test("auto-approve uses readHookStdin, never Bun.stdin.text()", async () => {
    const src = await Bun.file(new URL("../auto-approve.ts", import.meta.url)).text();
    expect(src).toContain("readHookStdin(");
    expect(src).not.toContain("Bun.stdin.text()");
  });
});
