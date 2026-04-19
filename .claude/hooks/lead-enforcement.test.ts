import { describe, test, expect } from "bun:test";
import { join } from "path";
import { homedir } from "os";

const HOOK_PATH = join(import.meta.dir, "lead-enforcement.ts");

interface RunResult {
  exitCode: number;
  stderr: string;
  stdout: string;
}

async function runHook(
  stdinJson: object,
  env?: Record<string, string>,
): Promise<RunResult> {
  const proc = Bun.spawn([process.execPath, HOOK_PATH], {
    stdin: new Blob([JSON.stringify(stdinJson)]),
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...env },
  });
  const exitCode = await proc.exited;
  const stderr = await new Response(proc.stderr).text();
  const stdout = await new Response(proc.stdout).text();
  return { exitCode, stderr, stdout };
}

const LEAD_ENV = { CLAUDE_LEAD_MODE: "true" };

describe("lead-enforcement — blocking mode", () => {
  test("non-Lead mode: Edit on any path exits 0 silently", async () => {
    const result = await runHook(
      { tool_name: "Edit", tool_input: { file_path: "/some/project/src/auth.ts" } },
      { CLAUDE_LEAD_MODE: "false" },
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  test("Lead mode: Edit on non-whitelisted path exits 2 with message", async () => {
    const result = await runHook(
      { tool_name: "Edit", tool_input: { file_path: "/some/project/src/auth.ts" } },
      LEAD_ENV,
    );
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("[LEAD ENFORCEMENT]");
    expect(result.stderr).toContain("Edit");
    expect(result.stderr).toContain("/some/project/src/auth.ts");
  });

  test("Lead mode: Write on non-whitelisted path exits 2", async () => {
    const result = await runHook(
      { tool_name: "Write", tool_input: { file_path: "/home/user/project/file.ts" } },
      LEAD_ENV,
    );
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("[LEAD ENFORCEMENT]");
    expect(result.stderr).toContain("Write");
  });

  test("Lead mode: Read on non-whitelisted path exits 2", async () => {
    const result = await runHook(
      { tool_name: "Read", tool_input: { file_path: "/some/project/README.md" } },
      LEAD_ENV,
    );
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("[LEAD ENFORCEMENT]");
  });

  test("Lead mode: Grep on non-whitelisted pattern exits 2", async () => {
    const result = await runHook(
      { tool_name: "Grep", tool_input: { pattern: "someFunc", path: "/project/src" } },
      LEAD_ENV,
    );
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("[LEAD ENFORCEMENT]");
  });

  test("Lead mode: Bash with non-git command exits 2", async () => {
    const result = await runHook(
      { tool_name: "Bash", tool_input: { command: "ls -la /tmp" } },
      LEAD_ENV,
    );
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("[LEAD ENFORCEMENT]");
  });

  test("Lead mode: Bash with git status exits 0", async () => {
    const result = await runHook(
      { tool_name: "Bash", tool_input: { command: "git status" } },
      LEAD_ENV,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  test("Lead mode: Bash with git log exits 0", async () => {
    const result = await runHook(
      { tool_name: "Bash", tool_input: { command: "git log --oneline" } },
      LEAD_ENV,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  test("Lead mode: Bash with git diff exits 0", async () => {
    const result = await runHook(
      { tool_name: "Bash", tool_input: { command: "git diff HEAD" } },
      LEAD_ENV,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  test("Lead mode: Bash with git add exits 0", async () => {
    const result = await runHook(
      { tool_name: "Bash", tool_input: { command: "git add src/file.ts" } },
      LEAD_ENV,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  test("Lead mode: Bash with git commit exits 0", async () => {
    const result = await runHook(
      { tool_name: "Bash", tool_input: { command: "git commit -m 'test'" } },
      LEAD_ENV,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  test("Lead mode: Glob on non-whitelisted pattern exits 2", async () => {
    const result = await runHook(
      { tool_name: "Glob", tool_input: { pattern: "**/*.ts", path: "/project/src" } },
      LEAD_ENV,
    );
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("[LEAD ENFORCEMENT]");
  });

  // Whitelisted paths — must exit 0 silently
  test("Lead mode: Edit inside .claude/ directory exits 0", async () => {
    const result = await runHook(
      { tool_name: "Edit", tool_input: { file_path: "/project/.claude/rules/foo.md" } },
      LEAD_ENV,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  test("Lead mode: Read a CLAUDE.md file exits 0", async () => {
    const result = await runHook(
      { tool_name: "Read", tool_input: { file_path: "/project/CLAUDE.md" } },
      LEAD_ENV,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  test("Lead mode: Edit inside memory/ exits 0", async () => {
    const result = await runHook(
      { tool_name: "Edit", tool_input: { file_path: "/project/memory/MEMORY.md" } },
      LEAD_ENV,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  test("Lead mode: Edit inside agent-memory/ exits 0", async () => {
    const result = await runHook(
      { tool_name: "Edit", tool_input: { file_path: ".claude/agent-memory/builder/MEMORY.md" } },
      LEAD_ENV,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  test("Lead mode: Read inside orchestrator/ exits 0", async () => {
    const result = await runHook(
      { tool_name: "Read", tool_input: { file_path: ".claude/orchestrator/playbook.md" } },
      LEAD_ENV,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  test("Lead mode: Read inside ~/.claude/ exits 0", async () => {
    const claudePath = join(homedir(), ".claude", "settings.json").replace(/\\/g, "/");
    const result = await runHook(
      { tool_name: "Read", tool_input: { file_path: claudePath } },
      LEAD_ENV,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  // Non-direct tools are always allowed
  test("Lead mode: Agent tool (not in directTools) exits 0", async () => {
    const result = await runHook(
      { tool_name: "Agent", tool_input: { subagent_type: "builder", prompt: "..." } },
      LEAD_ENV,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  // Freeze mode takes priority regardless of LEAD_MODE
  test("Freeze mode: Edit blocked with freeze message regardless of LEAD_MODE", async () => {
    const result = await runHook(
      { tool_name: "Edit", tool_input: { file_path: "/some/file.ts" } },
      { CLAUDE_FREEZE_MODE: "true", CLAUDE_LEAD_MODE: "false" },
    );
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Freeze mode");
  });

  test("malformed JSON stdin exits 0 without crash", async () => {
    const proc = Bun.spawn([process.execPath, HOOK_PATH], {
      stdin: new Blob(["{bad json"]),
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, CLAUDE_LEAD_MODE: "true" },
    });
    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });

  test("empty stdin exits 0 without crash", async () => {
    const proc = Bun.spawn([process.execPath, HOOK_PATH], {
      stdin: new Blob([""]),
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, CLAUDE_LEAD_MODE: "true" },
    });
    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });
});
