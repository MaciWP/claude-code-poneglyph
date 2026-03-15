import { describe, test, expect } from "bun:test";
import { join } from "node:path";

const HOOK_PATH = join(import.meta.dir, "context-virtualizer.ts");

describe("context-virtualizer hook", () => {

  test("skips small outputs (<4KB)", async () => {
    const input = JSON.stringify({
      tool_name: "Read",
      tool_input: { file_path: "/test/small.ts" },
      tool_output: "small content",
    });

    const proc = Bun.spawn([process.execPath, "run", HOOK_PATH], {
      stdin: new Blob([input]),
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });

  test("indexes large outputs (>=4KB)", async () => {
    const largeContent = "x".repeat(5000);
    const input = JSON.stringify({
      tool_name: "Read",
      tool_input: { file_path: "/test/large.ts" },
      tool_output: largeContent,
    });

    const proc = Bun.spawn([process.execPath, "run", HOOK_PATH], {
      stdin: new Blob([input]),
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);

    const stderr = await new Response(proc.stderr).text();
    expect(stderr).toContain("indexed");
  });

  test("handles malformed JSON gracefully", async () => {
    const proc = Bun.spawn([process.execPath, "run", HOOK_PATH], {
      stdin: new Blob(["not json"]),
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });

  test("handles empty stdin", async () => {
    const proc = Bun.spawn([process.execPath, "run", HOOK_PATH], {
      stdin: new Blob([""]),
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });

  test("extracts source for Grep tool", async () => {
    const largeContent = "match line\n".repeat(500);
    const input = JSON.stringify({
      tool_name: "Grep",
      tool_input: { pattern: "function.*export" },
      tool_output: largeContent,
    });

    const proc = Bun.spawn([process.execPath, "run", HOOK_PATH], {
      stdin: new Blob([input]),
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);

    const stderr = await new Response(proc.stderr).text();
    expect(stderr).toContain("grep:");
  });

  test("extracts source for Bash tool", async () => {
    const largeContent = "output line\n".repeat(500);
    const input = JSON.stringify({
      tool_name: "Bash",
      tool_input: { command: "ls -la /some/directory" },
      tool_output: largeContent,
    });

    const proc = Bun.spawn([process.execPath, "run", HOOK_PATH], {
      stdin: new Blob([input]),
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);

    const stderr = await new Response(proc.stderr).text();
    expect(stderr).toContain("bash:");
  });
});
