import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { buildSessionTitle, isFirstTurn } from "./memory-inject";

const HOOK_PATH = join(import.meta.dir, "memory-inject.ts");

interface RunResult {
  exitCode: number;
  stderr: string;
  stdout: string;
}

async function runHook(stdinJson: object, env?: Record<string, string>): Promise<RunResult> {
  const proc = Bun.spawn([process.execPath, HOOK_PATH], {
    stdin: new Blob([JSON.stringify(stdinJson)]),
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, MEMORY_API_URL: "http://localhost:19999", ...env },
  });
  const exitCode = await proc.exited;
  const stderr = await new Response(proc.stderr).text();
  const stdout = await new Response(proc.stdout).text();
  return { exitCode, stderr, stdout };
}

describe("buildSessionTitle", () => {
  test("short prompt kept as-is", () => {
    expect(buildSessionTitle("fix bug in auth")).toBe("fix bug in auth");
  });

  test("exactly 50 chars kept as-is", () => {
    const s = "a".repeat(50);
    expect(buildSessionTitle(s)).toBe(s);
  });

  test("long prompt truncated at word boundary with ellipsis", () => {
    const prompt =
      "refactor UserService to separate auth from profile handling entirely";
    const result = buildSessionTitle(prompt);
    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(51);
    expect(result).not.toContain("profil…");
    expect(result.slice(0, -1)).not.toMatch(/\s$/);
  });

  test("multi-line prompt collapses whitespace", () => {
    const prompt = "refactor\nauth\n\nmodule   now";
    expect(buildSessionTitle(prompt)).toBe("refactor auth module now");
  });

  test("long word with no spaces falls back to hard slice", () => {
    const prompt = "a".repeat(80);
    const result = buildSessionTitle(prompt);
    expect(result).toBe(`${"a".repeat(50)}…`);
  });

  test("leading/trailing whitespace stripped", () => {
    expect(buildSessionTitle("  hello world  ")).toBe("hello world");
  });
});

describe("isFirstTurn", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "mi-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("undefined path → first turn", () => {
    expect(isFirstTurn(undefined)).toBe(true);
  });

  test("non-existent file → first turn", () => {
    expect(isFirstTurn(join(tmpDir, "nope.jsonl"))).toBe(true);
  });

  test("empty file → first turn", () => {
    const path = join(tmpDir, "empty.jsonl");
    writeFileSync(path, "");
    expect(isFirstTurn(path)).toBe(true);
  });

  test("single line (current user message) → first turn", () => {
    const path = join(tmpDir, "one.jsonl");
    writeFileSync(path, '{"role":"user","content":"hello"}\n');
    expect(isFirstTurn(path)).toBe(true);
  });

  test("multi-line transcript → not first turn", () => {
    const path = join(tmpDir, "many.jsonl");
    writeFileSync(
      path,
      '{"role":"user","content":"a"}\n{"role":"assistant","content":"b"}\n{"role":"user","content":"c"}\n',
    );
    expect(isFirstTurn(path)).toBe(false);
  });
});

describe("memory-inject — Lead orchestration injection (spawn)", () => {
  const orchestratorDir = join(homedir(), ".claude", "orchestrator");
  const playbookPath = join(orchestratorDir, "lead-playbook.md");
  let playbookCreatedByTest = false;
  let orchestratorDirCreatedByTest = false;

  const promptPayload = {
    hook_event_name: "UserPromptSubmit",
    prompt: "implement the authentication service",
    session_id: "test-lead-session",
    transcript_path: "",
    cwd: import.meta.dir,
  };

  beforeAll(() => {
    if (!existsSync(orchestratorDir)) {
      mkdirSync(orchestratorDir, { recursive: true });
      orchestratorDirCreatedByTest = true;
    }
    if (!existsSync(playbookPath)) {
      writeFileSync(playbookPath, "# Lead Playbook\n\nOrchestration protocol content.\n");
      playbookCreatedByTest = true;
    }
  });

  afterAll(() => {
    if (playbookCreatedByTest && existsSync(playbookPath)) {
      rmSync(playbookPath);
    }
    if (orchestratorDirCreatedByTest && existsSync(orchestratorDir)) {
      try {
        rmSync(orchestratorDir, { recursive: true, force: true });
      } catch {
        // best effort
      }
    }
  });

  test("CLAUDE_LEAD_MODE=true injects LEAD MODE section into additionalContext", async () => {
    const result = await runHook(promptPayload, { CLAUDE_LEAD_MODE: "true" });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("LEAD MODE");
    expect(result.stdout).toContain("Orchestration Protocol");
    const parsed = JSON.parse(result.stdout);
    expect(parsed.hookSpecificOutput.additionalContext).toContain("LEAD MODE — Orchestration Protocol");
  });

  test("CLAUDE_LEAD_MODE unset does NOT inject LEAD MODE section", async () => {
    const result = await runHook(promptPayload, { CLAUDE_LEAD_MODE: "" });
    expect(result.exitCode).toBe(0);
    if (result.stdout.trim().length > 0) {
      const parsed = JSON.parse(result.stdout);
      expect(parsed.hookSpecificOutput.additionalContext ?? "").not.toContain("LEAD MODE");
    }
  });

  test("CLAUDE_LEAD_MODE=true with missing playbook exits 0 without crash", async () => {
    const result = await runHook(
      { ...promptPayload, prompt: "implement something important" },
      { CLAUDE_LEAD_MODE: "true", USERPROFILE: join(homedir(), "__nonexistent_for_test__") },
    );
    expect(result.exitCode).toBe(0);
  });
});
