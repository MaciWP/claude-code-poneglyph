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
for (const [name, kw] of [
  ["review-patterns", "refactor, solid, performance, slow, endpoint"],
  ["tdd-design", "tests, tdd, oracle, test-design"],
  ["skill-advisor", "skill-advisor, skills, shortlist, propón skills, which skills"],
] as const) {
  mkdirSync(join(fixtures, name), { recursive: true });
  writeFileSync(
    join(fixtures, name, "SKILL.md"),
    ["---", `name: ${name}`, "description: |", `  ${name} fixture.`, `  Keywords - ${kw}`, "---", "", `# ${name}`].join("\n"),
  );
}
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

  test("/flow is skipped — it self-routes its phase skills", () => {
    expect(processPayload(JSON.stringify({ prompt: "/flow valida este plan" }), skills)).toBe("");
  });
});

describe("processPayload — shortlist + skill-advisor (feature 023)", () => {
  test("T2.1 non-trivial prompt → shortlist con motivo + skill-advisor", () => {
    const out = processPayload(JSON.stringify({ prompt: "refactoriza el módulo de pagos aplicando SOLID" }), skills);
    expect(out).toContain("Skill(review-patterns)");
    expect(out).toContain("matched");
    expect(out).toContain("Skill(skill-advisor)");
  });

  test("T2.2 '/goal <task>' se procesa (no se salta)", () => {
    const out = processPayload(JSON.stringify({ prompt: "/goal escribe tests para el parser" }), skills);
    expect(out).toContain("Skill(skill-advisor)");
    expect(out).not.toBe("");
  });

  test("T2.2b '/goal' tarea de trabajo sin match → skill-advisor sí o sí", () => {
    const out = processPayload(JSON.stringify({ prompt: "/goal añade un botón al formulario de login" }), skills);
    expect(out).toContain("Skill(skill-advisor)");
  });

  test("T2.3 '/flow' y '/role' siguen saltándose", () => {
    expect(processPayload(JSON.stringify({ prompt: "/flow valida este plan" }), skills)).toBe("");
    expect(processPayload(JSON.stringify({ prompt: "/role security" }), skills)).toBe("");
  });

  test("T2.4 prompt trivial → vacío (sin ruido)", () => {
    expect(processPayload(JSON.stringify({ prompt: "gracias" }), skills)).toBe("");
  });

  test("T2.5 presupuesto de líneas respetado (≤6)", () => {
    const out = processPayload(JSON.stringify({ prompt: "refactor solid performance slow endpoint tests tdd" }), skills);
    expect(out.split("\n").length).toBeLessThanOrEqual(6);
    expect(out).toContain("Skill(skill-advisor)");
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
