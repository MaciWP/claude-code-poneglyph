import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { join } from "path";

const VALIDATOR_PATH = join(import.meta.dir, "validate-new-file.ts");

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

describe("validate-new-file", () => {
  const tempDir = join(import.meta.dir, "__test_temp_newfile__");
  const existingFile = join(tempDir, "existing.ts");

  beforeAll(async () => {
    await Bun.$`mkdir -p ${tempDir}`.quiet();
    await Bun.write(existingFile, "export const x = 1;\n");
  });

  afterAll(async () => {
    await Bun.$`rm -rf ${tempDir}`.quiet();
  });

  test("passes when VALIDATE_FILE_PATH is not set (skip)", async () => {
    const result = await runValidator({});
    expect(result.exitCode).toBe(0);
  });

  test("passes when file exists", async () => {
    const result = await runValidator({
      VALIDATE_FILE_PATH: existingFile,
    });
    expect(result.exitCode).toBe(0);
  });

  test("blocks when file does not exist", async () => {
    const missingFile = join(tempDir, "nonexistent.ts");
    const result = await runValidator({
      VALIDATE_FILE_PATH: missingFile,
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Expected file does not exist");
    expect(result.stderr).toContain("nonexistent.ts");
  });

  test("works with directory paths", async () => {
    const result = await runValidator({
      VALIDATE_FILE_PATH: tempDir,
    });
    expect(result.exitCode).toBe(0);
  });
});
