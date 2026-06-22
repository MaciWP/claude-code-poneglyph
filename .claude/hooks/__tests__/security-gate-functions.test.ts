import { describe, test, expect, afterAll } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unlinkSync } from "node:fs";
import { getModifiedFiles, scanFile } from "../security-gate";

// Integration coverage of the security-gate functions exported in-situ.
// Previously these were unexported → untestable by import; only the pure SECRET_PATTERN was covered.

const LONG = "x".repeat(20);
const created: string[] = [];

async function tmpFile(name: string, content: string): Promise<string> {
  const path = join(tmpdir(), `sg-test-${Date.now()}-${name}`);
  await Bun.write(path, content);
  created.push(path);
  return path;
}

afterAll(() => {
  for (const p of created) {
    try {
      unlinkSync(p);
    } catch {
      // best-effort cleanup
    }
  }
});

describe("scanFile (exported in-situ)", () => {
  test("flags a file containing a secret with path:line", async () => {
    const path = await tmpFile("secret.env", `HARMLESS=ok\nAPI_KEY = "${LONG}"\n`);
    const hits = await scanFile(path);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]).toContain(path);
    expect(hits[0]).toMatch(/:2$/); // secret is on line 2
  });

  test("returns empty for a clean file (env-var indirection)", async () => {
    const path = await tmpFile("clean.ts", "const key = process.env.API_KEY;\n");
    expect(await scanFile(path)).toEqual([]);
  });

  test("returns empty for a non-existent file (best-effort)", async () => {
    expect(await scanFile(join(tmpdir(), "sg-test-does-not-exist-xyz"))).toEqual([]);
  });
});

describe("getModifiedFiles (exported in-situ)", () => {
  test("returns an array of text-extension paths (no crash on real git state)", async () => {
    const files = await getModifiedFiles();
    expect(Array.isArray(files)).toBe(true);
    // every returned path must be non-empty (function contract)
    for (const f of files) {
      expect(f.length).toBeGreaterThan(0);
    }
  });
});

describe("hook stdin path end-to-end (readHookStdin)", () => {
  const autoApprove = join(import.meta.dir, "..", "auto-approve.ts");

  async function runWithStdin(input: string): Promise<number> {
    const proc = Bun.spawn(["bun", autoApprove], {
      stdin: new TextEncoder().encode(input),
      stdout: "pipe",
      stderr: "pipe",
    });
    return await proc.exited;
  }

  test("valid JSON PermissionRequest exits 0 (does not hang)", async () => {
    const code = await runWithStdin(JSON.stringify({ tool_name: "Read", tool_input: { file_path: "/x" } }));
    expect(code).toBe(0);
  });

  test("empty stdin exits 0 (no-op)", async () => {
    expect(await runWithStdin("")).toBe(0);
  });

  test("malformed JSON exits 0 (handled, no uncaught throw)", async () => {
    expect(await runWithStdin("not-json{{{")).toBe(0);
  });
});
