import { describe, test, expect } from "bun:test";
import { SECRET_PATTERN, SECRET_PATTERN_CI, hasTextExtension } from "../security-gate";

// Mirror the hook's per-line detection, resetting the stateful /g regex lastIndex
// (same gotcha the hook guards against with `SECRET_PATTERN.lastIndex = 0`).
function detectsSecret(line: string): boolean {
  SECRET_PATTERN.lastIndex = 0;
  const hit = SECRET_PATTERN.test(line);
  SECRET_PATTERN.lastIndex = 0;
  return hit || SECRET_PATTERN_CI.test(line);
}

// Fake values built at runtime so no literal secret lives in this file.
const LONG = "x".repeat(20);

describe("hasTextExtension", () => {
  test("accepts scannable text extensions", () => {
    for (const f of ["a.ts", "a.js", "a.json", "a.md", "a.env", "a.yaml", "a.yml"]) {
      expect(hasTextExtension(f)).toBe(true);
    }
  });
  test("rejects binary / non-text extensions", () => {
    for (const f of ["a.png", "a.exe", "a.lock", "a.zip"]) {
      expect(hasTextExtension(f)).toBe(false);
    }
  });
  test("rejects files with no extension", () => {
    expect(hasTextExtension("Makefile")).toBe(false);
    expect(hasTextExtension("LICENSE")).toBe(false);
  });
  test("is case-insensitive on the extension", () => {
    expect(hasTextExtension("README.MD")).toBe(true);
    expect(hasTextExtension("config.JSON")).toBe(true);
  });
});

describe("SECRET_PATTERN — uppercase KEY=value", () => {
  test("flags API_KEY with a 16+ char value", () => {
    expect(detectsSecret(`API_KEY = "${LONG}"`)).toBe(true);
  });
  test("flags TOKEN with a colon separator", () => {
    expect(detectsSecret(`TOKEN: "${LONG}"`)).toBe(true);
  });
  test("does NOT flag a short value", () => {
    expect(detectsSecret("TOKEN=abc")).toBe(false);
  });
});

describe("SECRET_PATTERN_CI — lowercase credentials", () => {
  test("flags password with an 8+ char value", () => {
    expect(detectsSecret(`password=${"y".repeat(12)}`)).toBe(true);
  });
  test("flags access_token", () => {
    expect(detectsSecret(`access_token = ${"z".repeat(10)}`)).toBe(true);
  });
  test("does NOT flag a short password", () => {
    expect(detectsSecret("password = short")).toBe(false);
  });
});

describe("clean code", () => {
  test("no detection for env-var indirection", () => {
    expect(detectsSecret("const key = process.env.API_KEY")).toBe(false);
  });
  test("stateful /g regex resets between calls", () => {
    const line = `SECRET = "${LONG}"`;
    expect(detectsSecret(line)).toBe(true);
    // Would be false on the 2nd call if lastIndex were not reset — guards the gotcha.
    expect(detectsSecret(line)).toBe(true);
  });
});
