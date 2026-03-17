import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { join } from "node:path";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";

const HOOK_PATH = join(import.meta.dir, "..", "post-compact.ts");
const SPEC_DIR = join(import.meta.dir, "..", "..", "..", ".specs");
const SPEC_FILE = join(SPEC_DIR, "active-spec.txt");

interface HookProc {
  exited: Promise<number>;
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
}

function runHook(env: Record<string, string> = {}): HookProc {
  return Bun.spawn([process.execPath, "run", HOOK_PATH], {
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...env },
  });
}

describe("post-compact hook", () => {
  test("exits with code 0", async () => {
    const proc = runHook({ CLAUDE_LEAD_MODE: "true" });
    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });

  test("output contains lead orchestrator reminder", async () => {
    const proc = runHook({ CLAUDE_LEAD_MODE: "true" });
    await proc.exited;
    const stdout = await new Response(proc.stdout).text();

    expect(stdout).toContain("Lead Orchestrator");
    expect(stdout).toContain("NEVER use Read/Edit/Write/Bash/Glob/Grep directly");
    expect(stdout).toContain("Delegate to agents");
  });

  test("output contains anti-hallucination checklist", async () => {
    const proc = runHook({ CLAUDE_LEAD_MODE: "true" });
    await proc.exited;
    const stdout = await new Response(proc.stdout).text();

    expect(stdout).toContain("Anti-Hallucination Checklist");
    expect(stdout).toContain("Glob before asserting file exists");
    expect(stdout).toContain("Read before Edit");
    expect(stdout).toContain("confidence < 70%");
  });

  test("output contains session mode when CLAUDE_LEAD_MODE=true", async () => {
    const proc = runHook({ CLAUDE_LEAD_MODE: "true" });
    await proc.exited;
    const stdout = await new Response(proc.stdout).text();

    expect(stdout).toContain("CLAUDE_LEAD_MODE=true");
  });

  test("omits session mode section when CLAUDE_LEAD_MODE is not set", async () => {
    const env = { ...process.env };
    delete env.CLAUDE_LEAD_MODE;

    const proc: HookProc = Bun.spawn([process.execPath, "run", HOOK_PATH], {
      stdout: "pipe",
      stderr: "pipe",
      env,
    });
    await proc.exited;
    const stdout = await new Response(proc.stdout).text();

    expect(stdout).not.toContain("CLAUDE_LEAD_MODE=true");
    expect(stdout).toContain("Lead Orchestrator");
  });

  test("exits 0 when active-spec.txt does not exist", async () => {
    const proc = runHook({ CLAUDE_LEAD_MODE: "true" });
    const exitCode = await proc.exited;
    const stdout = await new Response(proc.stdout).text();

    expect(exitCode).toBe(0);
    expect(stdout).not.toContain("Active Spec");
  });

  describe("with active-spec.txt present", () => {
    beforeAll(() => {
      mkdirSync(SPEC_DIR, { recursive: true });
      writeFileSync(SPEC_FILE, "SPEC-019");
    });

    afterAll(() => {
      try {
        rmSync(SPEC_FILE);
      } catch {
        // ignore cleanup errors
      }
    });

    test("includes active spec content when file exists", async () => {
      const proc = runHook({ CLAUDE_LEAD_MODE: "true" });
      await proc.exited;
      const stdout = await new Response(proc.stdout).text();

      expect(stdout).toContain("Active Spec");
      expect(stdout).toContain("SPEC-019");
    });
  });

  test("output stays compact (under ~2000 chars as proxy for 500 tokens)", async () => {
    const proc = runHook({ CLAUDE_LEAD_MODE: "true" });
    await proc.exited;
    const stdout = await new Response(proc.stdout).text();

    expect(stdout.length).toBeLessThan(2000);
  });
});
