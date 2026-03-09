import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { ContextRegistry } from "./registry";

describe("ContextRegistry", () => {
  const testDir = join(tmpdir(), "context-registry-test-" + Date.now());
  let testFile: string;

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    testFile = join(testDir, "test-file.ts");
    writeFileSync(testFile, "const x = 1;");
  });

  afterEach(() => {
    try {
      if (existsSync(testFile)) unlinkSync(testFile);
    } catch {}
  });

  test("records file read and reports as fresh", () => {
    const registry = new ContextRegistry();
    registry.record(testFile);

    const result = registry.check(testFile);
    expect(result.isStale).toBe(false);
    expect(result.message).toBe("File is fresh.");
  });

  test("detects stale file after modification", async () => {
    const registry = new ContextRegistry();
    registry.record(testFile);

    await new Promise((r) => setTimeout(r, 50));
    writeFileSync(testFile, "const x = 2; // modified");

    const result = registry.check(testFile);
    expect(result.isStale).toBe(true);
    expect(result.message).toContain("changed since last read");
  });

  test("reports never-read file as stale", () => {
    const registry = new ContextRegistry();
    const result = registry.check("/nonexistent/file.ts");
    expect(result.isStale).toBe(true);
    expect(result.message).toContain("never read");
  });

  test("updates mtime after write", async () => {
    const registry = new ContextRegistry();
    registry.record(testFile);

    await new Promise((r) => setTimeout(r, 50));
    writeFileSync(testFile, "const x = 3;");
    registry.update(testFile);

    const result = registry.check(testFile);
    expect(result.isStale).toBe(false);
  });

  test("invalidate removes entry", () => {
    const registry = new ContextRegistry();
    registry.record(testFile);
    expect(registry.size).toBeGreaterThanOrEqual(1);

    registry.invalidate(testFile);
    const result = registry.check(testFile);
    expect(result.isStale).toBe(true);
  });

  test("clear removes all entries", () => {
    const registry = new ContextRegistry();
    registry.record(testFile);
    registry.clear();
    expect(registry.size).toBe(0);
  });

  test("handles deleted file gracefully", () => {
    const registry = new ContextRegistry();
    registry.record(testFile);
    unlinkSync(testFile);

    const result = registry.check(testFile);
    expect(result.isStale).toBe(true);
    expect(result.message).toContain("no longer exists");
  });

  test("normalizes Windows backslashes", () => {
    const registry = new ContextRegistry();
    registry.record(testFile);

    const altPath = testFile.replace(/\//g, "\\");
    const result = registry.check(altPath);
    expect(result.isStale).toBe(false);
  });

  test("performance: check completes in <5ms", () => {
    const registry = new ContextRegistry();
    registry.record(testFile);

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      registry.check(testFile);
    }
    const elapsed = performance.now() - start;
    const avgMs = elapsed / 100;

    expect(avgMs).toBeLessThan(5);
  });
});
