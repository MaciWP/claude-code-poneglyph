import { describe, test, expect } from "bun:test";
import { dangerousReason, shouldAutoApprove } from "../auto-approve";

describe("dangerousReason — safe commands", () => {
  test("bun test is safe", () => {
    expect(dangerousReason("bun test")).toBeNull();
  });

  test("ls -la is safe", () => {
    expect(dangerousReason("ls -la")).toBeNull();
  });

  test("cat README.md is safe", () => {
    expect(dangerousReason("cat README.md")).toBeNull();
  });

  test("git status is safe", () => {
    expect(dangerousReason("git status")).toBeNull();
  });

  test("git add . is safe", () => {
    expect(dangerousReason("git add .")).toBeNull();
  });

  test("git commit is safe", () => {
    expect(dangerousReason("git commit -m 'msg'")).toBeNull();
  });

  test("git checkout main is safe", () => {
    expect(dangerousReason("git checkout main")).toBeNull();
  });

  test("git merge feature is safe", () => {
    expect(dangerousReason("git merge feature")).toBeNull();
  });

  test("npm install is safe", () => {
    expect(dangerousReason("npm install")).toBeNull();
  });

  test("echo command is safe", () => {
    expect(dangerousReason("echo hello world")).toBeNull();
  });
});

describe("dangerousReason — file deletion", () => {
  test("rm -rf blocks", () => {
    expect(dangerousReason("rm -rf node_modules")).not.toBeNull();
  });

  test("rm single file blocks", () => {
    expect(dangerousReason("rm file.ts")).not.toBeNull();
  });

  test("rmdir blocks", () => {
    expect(dangerousReason("rmdir dist")).not.toBeNull();
  });

  test("del blocks", () => {
    expect(dangerousReason("del file.txt")).not.toBeNull();
  });

  test("unlink blocks", () => {
    expect(dangerousReason("unlink file.txt")).not.toBeNull();
  });

  test("Remove-Item blocks", () => {
    expect(dangerousReason("Remove-Item -Recurse dist")).not.toBeNull();
  });
});

describe("dangerousReason — destructive git", () => {
  test("git push origin main blocks", () => {
    expect(dangerousReason("git push origin main")).not.toBeNull();
  });

  test("git push --force blocks", () => {
    expect(dangerousReason("git push --force")).not.toBeNull();
  });

  test("git push -f blocks", () => {
    expect(dangerousReason("git push -f")).not.toBeNull();
  });

  test("git reset --hard HEAD~1 blocks", () => {
    expect(dangerousReason("git reset --hard HEAD~1")).not.toBeNull();
  });

  test("git clean -fd blocks", () => {
    expect(dangerousReason("git clean -fd")).not.toBeNull();
  });

  test("git branch -D feature blocks", () => {
    expect(dangerousReason("git branch -D feature")).not.toBeNull();
  });

  test("git rebase -i blocks", () => {
    expect(dangerousReason("git rebase -i HEAD~3")).not.toBeNull();
  });
});

describe("dangerousReason — secrets in command", () => {
  test("API_KEY in command blocks", () => {
    expect(dangerousReason("MY_API_KEY=abc123secret curl https://api.example.com")).not.toBeNull();
  });

  test("SECRET in command blocks", () => {
    expect(dangerousReason("DB_SECRET=mysecretvalue node script.js")).not.toBeNull();
  });

  test("TOKEN in command blocks", () => {
    expect(dangerousReason("GITHUB_TOKEN=ghp_abc123 gh pr create")).not.toBeNull();
  });

  test("PASSWORD in command blocks", () => {
    expect(dangerousReason("DB_PASSWORD=hunter2 pg_dump mydb")).not.toBeNull();
  });
});

describe("shouldAutoApprove — non-Bash tools", () => {
  test("Read approves any path", () => {
    const result = shouldAutoApprove("Read", { file_path: "/etc/passwd" });
    expect(result.approve).toBe(true);
  });

  test("Edit approves any path", () => {
    const result = shouldAutoApprove("Edit", { file_path: "src/index.ts" });
    expect(result.approve).toBe(true);
  });

  test("Write approves", () => {
    const result = shouldAutoApprove("Write", { file_path: "output.txt" });
    expect(result.approve).toBe(true);
  });

  test("Glob approves", () => {
    const result = shouldAutoApprove("Glob", { pattern: "**/*.ts" });
    expect(result.approve).toBe(true);
  });

  test("Grep approves", () => {
    const result = shouldAutoApprove("Grep", { pattern: "function main" });
    expect(result.approve).toBe(true);
  });

  test("WebSearch approves", () => {
    const result = shouldAutoApprove("WebSearch", { query: "bun docs" });
    expect(result.approve).toBe(true);
  });

  test("WebFetch approves", () => {
    const result = shouldAutoApprove("WebFetch", { url: "https://example.com" });
    expect(result.approve).toBe(true);
  });
});

describe("shouldAutoApprove — Bash safe commands", () => {
  test("bun test approves", () => {
    expect(shouldAutoApprove("Bash", { command: "bun test" }).approve).toBe(true);
  });

  test("git status approves", () => {
    expect(shouldAutoApprove("Bash", { command: "git status" }).approve).toBe(true);
  });

  test("npm install approves", () => {
    expect(shouldAutoApprove("Bash", { command: "npm install" }).approve).toBe(true);
  });
});

describe("shouldAutoApprove — Bash dangerous commands", () => {
  test("rm -rf blocks and provides reason", () => {
    const result = shouldAutoApprove("Bash", { command: "rm -rf node_modules" });
    expect(result.approve).toBe(false);
    expect(result.reason).toBeDefined();
  });

  test("git push blocks", () => {
    const result = shouldAutoApprove("Bash", { command: "git push origin main" });
    expect(result.approve).toBe(false);
  });

  test("git reset --hard blocks", () => {
    const result = shouldAutoApprove("Bash", { command: "git reset --hard HEAD~1" });
    expect(result.approve).toBe(false);
  });

  test("empty command approves", () => {
    expect(shouldAutoApprove("Bash", { command: "" }).approve).toBe(true);
  });

  test("non-string command approves (best-effort)", () => {
    expect(shouldAutoApprove("Bash", { command: 42 }).approve).toBe(true);
  });
});
