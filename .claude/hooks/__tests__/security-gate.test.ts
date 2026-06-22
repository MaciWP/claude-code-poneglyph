import { describe, test, expect } from "bun:test";
import { lineHasSecret, hasTextExtension, isOrchestrationPath } from "../security-gate";

// Fake values built at runtime so no literal secret lives in this file.
const LONG = "x".repeat(20);

describe("hasTextExtension", () => {
  test("accepts scannable text extensions (where real secrets live)", () => {
    for (const f of ["a.ts", "a.js", "a.json", "a.env", "a.yaml", "a.yml"]) {
      expect(hasTextExtension(f)).toBe(true);
    }
  });
  test("does NOT scan .md — docs/examples/reports carry illustrative secrets, not real ones", () => {
    expect(hasTextExtension("README.md")).toBe(false);
    expect(hasTextExtension(".claude/skills/django-architecture/references/service-patterns.md")).toBe(false);
    expect(hasTextExtension("reports/review-pr-body.md")).toBe(false);
    expect(hasTextExtension("README.MD")).toBe(false); // case-insensitive too
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
    expect(hasTextExtension("config.JSON")).toBe(true);
    expect(hasTextExtension("App.TS")).toBe(true);
  });
});

describe("SECRET_PATTERN — uppercase KEY=value", () => {
  test("flags API_KEY with a 16+ char value", () => {
    expect(lineHasSecret(`API_KEY = "${LONG}"`)).toBe(true);
  });
  test("flags TOKEN with a colon separator", () => {
    expect(lineHasSecret(`TOKEN: "${LONG}"`)).toBe(true);
  });
  test("does NOT flag a short value", () => {
    expect(lineHasSecret("TOKEN=abc")).toBe(false);
  });
});

describe("SECRET_PATTERN_CI — lowercase credentials", () => {
  test("flags password with an 8+ char value", () => {
    expect(lineHasSecret(`password=${"y".repeat(12)}`)).toBe(true);
  });
  test("flags access_token", () => {
    expect(lineHasSecret(`access_token = ${"z".repeat(10)}`)).toBe(true);
  });
  test("does NOT flag a short password", () => {
    expect(lineHasSecret("password = short")).toBe(false);
  });
});

describe("isOrchestrationPath — exclude the .claude/ orchestration tree", () => {
  test("excludes hooks (the self-matching false-positive case)", () => {
    expect(isOrchestrationPath(".claude/hooks/security-gate.ts")).toBe(true);
    expect(isOrchestrationPath(".claude/hooks/__tests__/security-gate.test.ts")).toBe(true);
  });
  test("excludes skills, references, examples, templates (any extension)", () => {
    expect(isOrchestrationPath(".claude/skills/django-architecture/references/service-patterns.md")).toBe(true);
    expect(isOrchestrationPath(".claude/skills/binora-multi-tenant-guardian/examples/auth_token_mixin_pattern.md")).toBe(true);
    expect(isOrchestrationPath(".claude/skills/foo/templates/config.yaml")).toBe(true);
  });
  test("excludes settings (documented tradeoff — tool config, not business code)", () => {
    expect(isOrchestrationPath(".claude/settings.json")).toBe(true);
  });
  test("does NOT exclude business code — detection there is untouched", () => {
    expect(isOrchestrationPath("src/auth/middleware.ts")).toBe(false);
    expect(isOrchestrationPath("binora/settings.py")).toBe(false);
    expect(isOrchestrationPath(".env")).toBe(false);
    expect(isOrchestrationPath("config.yaml")).toBe(false);
  });
  test("does NOT exclude a 'claude' dir that isn't .claude", () => {
    expect(isOrchestrationPath("src/claude/client.ts")).toBe(false);
    expect(isOrchestrationPath("claude.ts")).toBe(false);
  });
});

describe("clean code", () => {
  test("no detection for env-var indirection", () => {
    expect(lineHasSecret("const key = process.env.API_KEY")).toBe(false);
  });
  test("stateful /g regex resets between calls", () => {
    const line = `SECRET = "${LONG}"`;
    expect(lineHasSecret(line)).toBe(true);
    // Would be false on the 2nd call if lastIndex were not reset — guards the gotcha.
    expect(lineHasSecret(line)).toBe(true);
  });
});
