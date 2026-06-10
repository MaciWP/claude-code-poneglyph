import { describe, test, expect } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSkills, matchSkills, buildInjection, processPayload } from "../skill-activation";
import { formatLogLine } from "../instructions-loaded";

// Fixture: a minimal skills dir with one drillme-like skill (keywords on disk,
// no hardcoded list — mirrors the production loader contract).
const fixtures = mkdtempSync(join(tmpdir(), "skills-fixture-"));
mkdirSync(join(fixtures, "drillme"), { recursive: true });
writeFileSync(
  join(fixtures, "drillme", "SKILL.md"),
  [
    "---",
    "name: drillme",
    "description: |",
    "  Socratic check for plans and decisions.",
    "  Keywords - drill, drillme, socratic, valida, cuestiona, challenge",
    "---",
    "",
    "# drillme",
  ].join("\n"),
);
const skills = loadSkills([fixtures]);

describe("matchSkills + buildInjection — prompt with match (T12.1)", () => {
  test("'valida este plan' injects explicit Skill(drillme) in ≤5 lines", () => {
    const injection = buildInjection(matchSkills("valida este plan", skills));
    expect(injection).toContain("Skill(drillme)");
    expect(injection.split("\n").length).toBeLessThanOrEqual(5);
  });
});

describe("matchSkills — prompt without match (T12.2)", () => {
  test("greeting matches nothing", () => {
    expect(matchSkills("hola buenos días", skills)).toEqual([]);
  });

  test("buildInjection of empty list is empty string", () => {
    expect(buildInjection([])).toBe("");
  });
});

describe("processPayload — malformed payload is silent (T12.3)", () => {
  test("invalid JSON produces empty output without throwing", () => {
    expect(processPayload("{not json", skills)).toBe("");
  });

  test("empty input produces empty output", () => {
    expect(processPayload("", skills)).toBe("");
  });

  test("payload without prompt produces empty output", () => {
    expect(processPayload(JSON.stringify({ session_id: "x" }), skills)).toBe("");
  });

  test("slash-command prompt is skipped (user already chose)", () => {
    expect(processPayload(JSON.stringify({ prompt: "/drillme algo" }), skills)).toBe("");
  });
});

describe("instructions-loaded — formatLogLine", () => {
  test("well-formed payload produces a line with type, reason and path", () => {
    const line = formatLogLine({
      session_id: "s1",
      file_path: "/x/CLAUDE.md",
      memory_type: "Project",
      load_reason: "session_start",
    });
    expect(line).toContain("Project");
    expect(line).toContain("session_start");
    expect(line).toContain("/x/CLAUDE.md");
  });

  test("payload without file_path returns null", () => {
    expect(formatLogLine({ session_id: "s1" })).toBeNull();
  });
});
