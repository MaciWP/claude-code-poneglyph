import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { join } from "path";
import { mkdirSync, rmSync, writeFileSync } from "fs";

const HOOK_PATH = join(import.meta.dir, "validate-plan-paths.ts");
const tmpDir = join(import.meta.dir, "__test_temp_validate_plan_paths__");

interface RunResult {
  exitCode: number;
  stderr: string;
  stdout: string;
}

async function runHook(stdinJson: object, cwd?: string): Promise<RunResult> {
  const proc = Bun.spawn([process.execPath, HOOK_PATH], {
    stdin: new Blob([JSON.stringify(stdinJson)]),
    stdout: "pipe",
    stderr: "pipe",
    cwd: cwd ?? process.cwd(),
    env: { ...process.env },
  });
  const exitCode = await proc.exited;
  const stderr = await new Response(proc.stderr).text();
  const stdout = await new Response(proc.stdout).text();
  return { exitCode, stderr, stdout };
}

beforeAll(() => {
  mkdirSync(tmpDir, { recursive: true });
  mkdirSync(join(tmpDir, "plans"), { recursive: true });
  mkdirSync(join(tmpDir, "src"), { recursive: true });
  writeFileSync(join(tmpDir, "src", "existing.ts"), "export const x = 1;\n");
  writeFileSync(join(tmpDir, "src", "other.ts"), "export const y = 2;\n");
});

afterAll(() => {
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // best effort
  }
});

describe("validate-plan-paths", () => {
  test("plan with only existing paths produces no warning", async () => {
    const planPath = join(tmpDir, "plans", "plan1.md");
    const content = "Modify src/existing.ts and src/other.ts for refactor.";
    const result = await runHook(
      { tool_name: "Write", tool_input: { file_path: planPath, content } },
      tmpDir,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  test("plan with missing path emits warning", async () => {
    const planPath = join(tmpDir, "plans", "plan2.md");
    const content = "Modify src/does-not-exist.ts to add feature.";
    const result = await runHook(
      { tool_name: "Write", tool_input: { file_path: planPath, content } },
      tmpDir,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("validate-plan-paths");
    expect(result.stderr).toContain("src/does-not-exist.ts");
  });

  test("missing path marked (NEW) produces no warning", async () => {
    const planPath = join(tmpDir, "plans", "plan3.md");
    const content = "Create src/new-feature.ts (NEW) for the module.";
    const result = await runHook(
      { tool_name: "Write", tool_input: { file_path: planPath, content } },
      tmpDir,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  test("wildcard matching existing files produces no warning", async () => {
    const planPath = join(tmpDir, "plans", "plan4.md");
    const content = "Review src/*.ts for consistency.";
    const result = await runHook(
      { tool_name: "Write", tool_input: { file_path: planPath, content } },
      tmpDir,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  test("URL (http://...) is excluded from path checks", async () => {
    const planPath = join(tmpDir, "plans", "plan5.md");
    const content = "See https://docs.example.com/example.py for reference.";
    const result = await runHook(
      { tool_name: "Write", tool_input: { file_path: planPath, content } },
      tmpDir,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  test("path inside git commit -m block is excluded", async () => {
    const planPath = join(tmpDir, "plans", "plan6.md");
    const content = 'Run: git commit -m "feat: add src/nonexistent-in-commit.ts file"';
    const result = await runHook(
      { tool_name: "Write", tool_input: { file_path: planPath, content } },
      tmpDir,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  test("non-plan file path: hook no-ops", async () => {
    const content = "Modify src/does-not-exist.ts to add feature.";
    const result = await runHook(
      {
        tool_name: "Write",
        tool_input: { file_path: join(tmpDir, "src", "notaplan.ts"), content },
      },
      tmpDir,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  test("malformed JSON stdin exits 0 without crash", async () => {
    const proc = Bun.spawn([process.execPath, HOOK_PATH], {
      stdin: new Blob(["{bad json"]),
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env },
    });
    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });
});
