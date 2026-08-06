import { describe, test, expect } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadSkills,
  matchSkills,
  buildInjection,
  processPayload,
  detectFeatureShape,
  analyzePayload,
  appendHintLog,
} from "../skill-activation";
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
// Multi-line Keywords block (SK-01): continuation lines indented inside
// `description: |`, terminated by the next top-level frontmatter key.
mkdirSync(join(fixtures, "wrapped-kw"), { recursive: true });
writeFileSync(
  join(fixtures, "wrapped-kw", "SKILL.md"),
  [
    "---",
    "name: wrapped-kw",
    "description: |",
    "  Fixture with wrapped keywords.",
    "  Keywords - primero, segundo,",
    "  continuación, tercera-línea, wrapped-match,",
    '  último - "frase de ejemplo entre comillas"',
    "disable-model-invocation: false",
    "---",
    "",
    "# wrapped-kw",
  ].join("\n"),
);

const skills = loadSkills([fixtures]);

describe("loadSkills — multi-line Keywords block (SK-01)", () => {
  const wrapped = skills.find((s) => s.name === "wrapped-kw");
  test("continuation-line keywords are parsed, next YAML key is not swallowed", () => {
    expect(wrapped).toBeDefined();
    expect(wrapped!.keywords).toContain("continuación");
    expect(wrapped!.keywords).toContain("wrapped-match");
    expect(wrapped!.keywords).toContain("frase de ejemplo entre comillas");
    expect(wrapped!.keywords.some((k) => k.includes("disable-model-invocation"))).toBe(false);
  });
  test("a continuation-line keyword now matches a prompt", () => {
    expect(matchSkills("necesito el wrapped-match aquí", skills)).toContain("wrapped-kw");
  });
});

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

describe("processPayload — silencioso por defecto (031)", () => {
  test("T2.1 match real → shortlist con motivo, SIN línea advisor incondicional", () => {
    const out = processPayload(JSON.stringify({ prompt: "refactoriza el módulo de pagos aplicando SOLID" }), skills);
    expect(out).toContain("Skill(review-patterns)");
    expect(out).toContain("matched");
    expect(out).not.toContain("Skill(skill-advisor)");
  });

  test("T2.2 prompt no-trivial SIN match ni shape → silencio total", () => {
    const out = processPayload(
      JSON.stringify({ prompt: "explícame cómo funciona la autenticación del proyecto por dentro" }),
      skills,
    );
    expect(out).toBe("");
  });

  test("T2.2b '/goal' se procesa: con match emite hint, sin match calla", () => {
    const conMatch = processPayload(JSON.stringify({ prompt: "/goal valida este plan de migración" }), skills);
    expect(conMatch).toContain("Skill(drillme)");
    const sinMatch = processPayload(JSON.stringify({ prompt: "/goal añade un botón al formulario de login" }), skills);
    expect(sinMatch).toBe("");
  });

  test("T2.3 '/flow' y '/role' siguen saltándose", () => {
    expect(processPayload(JSON.stringify({ prompt: "/flow valida este plan" }), skills)).toBe("");
    expect(processPayload(JSON.stringify({ prompt: "/role security" }), skills)).toBe("");
  });

  test("T2.4 prompt trivial → vacío (sin ruido)", () => {
    expect(processPayload(JSON.stringify({ prompt: "gracias" }), skills)).toBe("");
  });

  test("T2.5 presupuesto de líneas respetado (≤5, ya sin línea advisor)", () => {
    const out = processPayload(JSON.stringify({ prompt: "refactor solid performance slow endpoint tests tdd" }), skills);
    expect(out.split("\n").length).toBeLessThanOrEqual(5);
    expect(out).not.toContain("Skill(skill-advisor)");
  });

  test("T2.6 carga perezosa: los pre-gates no tocan disco (getter no invocado)", () => {
    let calls = 0;
    const getter = () => {
      calls++;
      return skills;
    };
    expect(analyzePayload(JSON.stringify({ prompt: "/flow valida" }), getter).injection).toBe("");
    expect(analyzePayload("", getter).injection).toBe("");
    expect(analyzePayload("{not json", getter).injection).toBe("");
    expect(calls).toBe(0);
    analyzePayload(JSON.stringify({ prompt: "valida este plan" }), getter);
    expect(calls).toBe(1);
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

describe("feature-shape flow hint (029/US13)", () => {
  test("detects feature-shaped prompts", () => {
    expect(detectFeatureShape("quiero desarrollar una nueva funcionalidad de notificaciones")).toBe(true);
    expect(detectFeatureShape("nueva feature de informes de proceso")).toBe(true);
    expect(detectFeatureShape("hazlo de principio a fin con todas las fases")).toBe(true);
  });

  test("stays silent on non-feature prompts", () => {
    expect(detectFeatureShape("corrige el typo del README")).toBe(false);
    expect(detectFeatureShape("revisa este ticket y dime qué pide")).toBe(false);
  });

  test("analyzePayload adds the /flow line on feature shape, alongside matched skills", () => {
    const raw = JSON.stringify({ prompt: "valida el plan de esta nueva funcionalidad de informes" });
    const r = analyzePayload(raw, skills);
    expect(r.flowHint).toBe(true);
    expect(r.injection).toContain("/flow");
    expect(r.injection).toContain("skill-activation-hint");
  });

  test("feature shape alone (no skill keyword match) still injects the /flow line", () => {
    const raw = JSON.stringify({ prompt: "desarrolla una nueva funcionalidad de exportación a excel" });
    const r = analyzePayload(raw, skills);
    expect(r.flowHint).toBe(true);
    expect(r.injection).toContain("/flow");
  });

  test("no feature shape → no /flow line (unchanged behavior)", () => {
    const raw = JSON.stringify({ prompt: "valida este plan antes de cerrarlo" });
    const r = analyzePayload(raw, skills);
    expect(r.flowHint).toBe(false);
    expect(r.injection).not.toContain("/flow");
  });
});

describe("hint emission log (029/US13 — honor-rate measurement, emit side)", () => {
  test("appends a JSON line under .claude/learned/skill-hints.log", () => {
    const dir = mkdtempSync(join(tmpdir(), "hintlog-"));
    const ok = appendHintLog(dir, { ts: "2026-08-05T00:00:00Z", skills: ["drillme"], flow: false });
    expect(ok).toBe(true);
    const written = readFileSync(join(dir, ".claude", "learned", "skill-hints.log"), "utf8");
    const entry = JSON.parse(written.trim().split("\n").at(-1)!);
    expect(entry.skills).toEqual(["drillme"]);
    expect(entry.flow).toBe(false);
  });

  test("fail-silent on unwritable destination — never throws (hook contract)", () => {
    let ok = true;
    expect(() => { ok = appendHintLog("/dev/null/nope", { ts: "t", skills: [], flow: false }); }).not.toThrow();
    expect(ok).toBe(false);
  });
});

describe("model/effort routing hint (029/US7 — shape-only, playbook §4)", () => {
  test("bulk/mechanical shape gets the routing line, marked shape-only", () => {
    const raw = JSON.stringify({ prompt: "barre todos los ficheros del repo y renombra el import en masa" });
    const r = analyzePayload(raw, skills);
    expect(r.routingHint).toBe(true);
    expect(r.injection).toContain("/model");
    expect(r.injection.toLowerCase()).toContain("shape-only");
  });

  test("quick-lookup shape also routes cheap", () => {
    const raw = JSON.stringify({ prompt: "pregunta rapida: que hace este flag de git?" });
    const r = analyzePayload(raw, skills);
    expect(r.routingHint).toBe(true);
  });

  test("normal prompts get zero routing mentions (anti-ceremonia, hereda AC4 de 027)", () => {
    const raw = JSON.stringify({ prompt: "valida este plan antes de cerrarlo" });
    const r = analyzePayload(raw, skills);
    expect(r.routingHint).toBe(false);
    expect(r.injection).not.toContain("/model");
  });
});
