import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { join } from "path";

const VALIDATOR_PATH = join(import.meta.dir, "validate-file-contains.ts");

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

describe("validate-file-contains", () => {
  const tempDir = join(import.meta.dir, "__test_temp_contains__");
  const sampleFile = join(tempDir, "sample.ts");

  beforeAll(async () => {
    await Bun.$`mkdir -p ${tempDir}`.quiet();
    await Bun.write(
      sampleFile,
      [
        "export interface User {",
        "  id: string",
        "  name: string",
        "  email: string",
        "}",
        "",
        "export function createUser(name: string): User {",
        '  return { id: crypto.randomUUID(), name, email: "" }',
        "}",
      ].join("\n"),
    );
  });

  afterAll(async () => {
    await Bun.$`rm -rf ${tempDir}`.quiet();
  });

  test("passes when neither VALIDATE_CONTAINS nor VALIDATE_PATTERNS is set (skip)", async () => {
    const result = await runValidator({});
    expect(result.exitCode).toBe(0);
  });

  test("passes when all literal strings are found", async () => {
    const result = await runValidator({
      VALIDATE_FILE_PATH: sampleFile,
      VALIDATE_CONTAINS: "interface User,createUser",
    });
    expect(result.exitCode).toBe(0);
  });

  test("blocks when literal string is missing", async () => {
    const result = await runValidator({
      VALIDATE_FILE_PATH: sampleFile,
      VALIDATE_CONTAINS: "interface User,deleteUser",
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("deleteUser");
    expect(result.stderr).toContain("Missing literal string");
  });

  test("passes when all regex patterns match", async () => {
    const result = await runValidator({
      VALIDATE_FILE_PATH: sampleFile,
      VALIDATE_PATTERNS: "interface\\s+User,export function",
    });
    expect(result.exitCode).toBe(0);
  });

  test("blocks when regex pattern does not match", async () => {
    const result = await runValidator({
      VALIDATE_FILE_PATH: sampleFile,
      VALIDATE_PATTERNS: "class\\s+User",
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Pattern not matched");
  });

  test("handles both VALIDATE_CONTAINS and VALIDATE_PATTERNS together", async () => {
    const result = await runValidator({
      VALIDATE_FILE_PATH: sampleFile,
      VALIDATE_CONTAINS: "interface User",
      VALIDATE_PATTERNS: "export function",
    });
    expect(result.exitCode).toBe(0);
  });

  test("blocks when VALIDATE_FILE_PATH is missing but VALIDATE_CONTAINS is set", async () => {
    const result = await runValidator({
      VALIDATE_CONTAINS: "something",
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("VALIDATE_FILE_PATH is required");
  });

  test("blocks when file does not exist", async () => {
    const result = await runValidator({
      VALIDATE_FILE_PATH: join(tempDir, "nonexistent.ts"),
      VALIDATE_CONTAINS: "something",
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("File does not exist");
  });

  test("handles invalid regex gracefully", async () => {
    const result = await runValidator({
      VALIDATE_FILE_PATH: sampleFile,
      VALIDATE_PATTERNS: "[invalid",
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("invalid regex");
  });
});
