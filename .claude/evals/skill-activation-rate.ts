#!/usr/bin/env bun
// AC2 measurement (feature 023) — deterministic surfacing-rate, before vs after.
// Measures the part that IS testable headless: does the hook SURFACE skill
// consideration (shortlist / skill-advisor) on work prompts, and stay silent on
// trivial ones? The behavioral half (does the model then INVOKE) is next-session.
//
// "before" = the pre-023 logic (skip every slash command; matchSkills→buildInjection,
//             no skill-advisor). "after" = current processPayload.
//
// Also a listing-budget check substituting for the interactive `/doctor` (AC4).
//
// Run: bun .claude/evals/skill-activation-rate.ts

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadSkills, matchSkills, buildInjection, processPayload } from "../hooks/skill-activation";

const skills = loadSkills([".claude/skills"]);

// "before": pre-023 behavior — slash always skipped, no skill-advisor surfacing.
function beforeSurface(prompt: string): boolean {
  if (!prompt.trim() || prompt.trimStart().startsWith("/")) return false;
  return buildInjection(matchSkills(prompt, skills)).length > 0;
}
function afterSurface(prompt: string): boolean {
  return processPayload(JSON.stringify({ prompt }), skills).length > 0;
}

// Work prompts the Lead SHOULD get skill consideration on (ES + EN, incl. /goal).
const WORK = [
  "/goal arregla el bug de autenticación con jwt",
  "/goal añade un botón al formulario de login",
  "/goal documenta la API nueva",
  "optimiza el endpoint lento, hay un problema de performance",
  "refactoriza el módulo de pagos aplicando SOLID",
  "escribe tests para el parser",
  "necesito planificar esta feature nueva",
  "revisa la seguridad de este login",
  "depura por qué se cae en producción",
  "refactor this slow endpoint",
  "review the security of this auth flow",
  "/goal implement the new feature end to end",
];
// Trivial prompts that should stay SILENT (no noise).
const TRIVIAL = ["gracias", "hola", "ok perfecto", "/clear"];

let beforeWork = 0, afterWork = 0;
for (const p of WORK) { if (beforeSurface(p)) beforeWork++; if (afterSurface(p)) afterWork++; }
let beforeNoise = 0, afterNoise = 0;
for (const p of TRIVIAL) { if (beforeSurface(p)) beforeNoise++; if (afterSurface(p)) afterNoise++; }

const pct = (n: number, d: number) => `${Math.round((100 * n) / d)}%`;
console.log("# Skill-surfacing rate (deterministic half of AC2)");
console.log(`work prompts (n=${WORK.length}):    before ${beforeWork}/${WORK.length} (${pct(beforeWork, WORK.length)})  →  after ${afterWork}/${WORK.length} (${pct(afterWork, WORK.length)})`);
console.log(`trivial prompts (n=${TRIVIAL.length}): before ${beforeNoise}/${TRIVIAL.length} surfaced  →  after ${afterNoise}/${TRIVIAL.length} surfaced (lower=less noise)`);

// Listing-budget proxy for /doctor (AC4): combined description+when_to_use per skill.
console.log("\n# Listing-budget check (proxy for /doctor, AC4)");
const CAP = 1536;
let maxCombined = 0, over = 0, total = 0;
for (const d of readdirSync(".claude/skills")) {
  const f = join(".claude/skills", d, "SKILL.md");
  if (!existsSync(f)) continue;
  const fm = readFileSync(f, "utf8").match(/^---\n([\s\S]*?)\n---/);
  if (!fm) continue;
  // description block + when_to_use block lengths (approx — body of each scalar)
  const desc = fm[1].match(/description:[\s\S]*?(?=\nwhen_to_use:|\n[a-z_-]+:|$)/i)?.[0] ?? "";
  const wtu = fm[1].match(/when_to_use:[\s\S]*?(?=\n[a-z_-]+:|$)/i)?.[0] ?? "";
  const combined = desc.length + wtu.length;
  total += combined;
  if (combined > maxCombined) maxCombined = combined;
  if (combined > CAP) over++;
}
console.log(`skills: ${skills.length} | max combined: ${maxCombined} (cap ${CAP}) | over cap: ${over} | total listing chars: ${total}`);

const ok = afterWork > beforeWork && afterNoise <= beforeNoise && over === 0;
console.log(`\nRESULT: ${ok ? "PASS" : "REVIEW"} — after surfaces more work prompts, no added noise, no skill over cap.`);
process.exit(ok ? 0 : 1);
