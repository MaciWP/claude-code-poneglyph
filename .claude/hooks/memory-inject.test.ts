import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSessionTitle, isFirstTurn } from "./memory-inject";

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
