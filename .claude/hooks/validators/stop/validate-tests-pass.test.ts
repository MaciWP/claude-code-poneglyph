import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { join } from "path";

const VALIDATOR_PATH = join(import.meta.dir, "validate-tests-pass.ts");

const STOP_EVENT_JSON = JSON.stringify({
  stop_hook_event: "Stop",
  session_id: "test-session",
});

async function runValidator(
  env: Record<string, string> = {},
): Promise<{ exitCode: number; stderr: string }> {
  const proc = Bun.spawn(["bun", VALIDATOR_PATH], {
    stdin: new Blob([STOP_EVENT_JSON]),
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...env },
  });

  const exitCode = await proc.exited;
  const stderr = await new Response(proc.stderr).text();

  return { exitCode, stderr };
}

describe("validate-tests-pass", () => {
  const tempDir = join(import.meta.dir, "__test_temp_tests__");
  const passingTestFile = join(tempDir, "passing.test.ts");
  const failingTestFile = join(tempDir, "failing.test.ts");

  beforeAll(async () => {
    await Bun.$`mkdir -p ${tempDir}`.quiet();

    await Bun.write(
      passingTestFile,
      [
        'import { describe, test, expect } from "bun:test"',
        "",
        'describe("passing suite", () => {',
        '  test("1 + 1 = 2", () => {',
        "    expect(1 + 1).toBe(2)",
        "  })",
        "})",
      ].join("\n"),
    );

    await Bun.write(
      failingTestFile,
      [
        'import { describe, test, expect } from "bun:test"',
        "",
        'describe("failing suite", () => {',
        '  test("deliberately fails", () => {',
        "    expect(1).toBe(2)",
        "  })",
        "})",
      ].join("\n"),
    );
  });

  afterAll(async () => {
    await Bun.$`rm -rf ${tempDir}`.quiet();
  });

  test("passes when targeted tests pass", async () => {
    const result = await runValidator({
      VALIDATE_TEST_PATH: passingTestFile,
    });
    expect(result.exitCode).toBe(0);
  });

  test("blocks when targeted tests fail", async () => {
    const result = await runValidator({
      VALIDATE_TEST_PATH: failingTestFile,
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("VALIDATION FAILED");
    expect(result.stderr).toContain("Tests did not pass");
  });

  test("includes output tail in stderr on failure", async () => {
    const result = await runValidator({
      VALIDATE_TEST_PATH: failingTestFile,
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr.length).toBeGreaterThan(0);
  });
});
