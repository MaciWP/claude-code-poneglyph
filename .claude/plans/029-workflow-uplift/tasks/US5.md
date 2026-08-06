---
us: US5
title: Skill verify (fix ref muerta) + gate pre-done en plantilla de capa proyecto
wave: WA
depends_on: []
tdd_mode: optional
estimate: M
status: closed
closed: 2026-08-05
note: Root cause del dead-ref descubierta al construir — 028/US5 cableó Skill(verify) creyendo que era skill NATIVA del harness ("verificada en listado de sesión", jul-08); el builtin ya no aparece en agosto. La skill propia elimina la dependencia. AC3 plantilla — sección Verification extendida (impact sweep + drive flow + residual risk) + línea de brevedad en ## Conduct. AC4 sweep proactivo — paso 2 del protocolo. Keyword-row del hook innecesaria (lee de disco — misma corrección que US1).
---

# US5 — Skill `verify` + gate pre-done para repos de trabajo

## Execution prompt (Phase 3 input)

**Task**: (a) Create the `verify` skill that CLAUDE.md already references but does not exist (dead reference confirmed by Glob — Commandment IX violation), and (b) extend `project-onboard`'s templates so every Bjumper work-repo layer ships a mandatory pre-done gate.
**Context**: Evidence — friction #1 across both work corpora: 15 reassurance asks/13 sessions ("estas 100% seguro?", "No hemos roto nada?", "has hecho una prueba manual?") + ≥6/5 sessions backend + 2 sessions where tsc/CI broke AFTER Claude said done (`error TS2307` post-"done"). CLAUDE.md (§The dev loop REVIEW stage + §Verification in this repo, post-refactor 2026-08-05) mandates `Skill(verify)` for changes with a runtime surface — the skill was specified (028/US5) but never created. Also folds in brevity evidence (19 "breve pls" msgs/12 sessions): the project template gets a hard brevity default line.
**Constraints**: The skill encodes the PROTOCOL (stack-agnostic): (1) run the project's check command (tsc/tests/lint — read from project CLAUDE.md); (2) impact sweep — enumerate what else uses the touched symbols/components (LSP references or Grep) and state what could break elsewhere; (3) drive the affected flow end-to-end when it has a runtime surface (run, don't predict — model-uplift #2); (4) report residual risk explicitly, with per-claim status. It must make the "¿estás 100% seguro?" turn unnecessary, not add ceremony to doc-only diffs (proportionality clause). Project-onboard template additions: verification command wiring per stack (binora-frontend: `tsc && vitest`; backend: pytest) as mandatory pre-done + one brevity line (BLUF, respuestas mínimas, sin tablas no pedidas) — honest note: global style alone has not held in work repos. Activation: es-ES surface + keyword row in skill-activation.ts ("verifica", "estás seguro", "no hemos roto") + referenced from before-implementing/US3 step 6.
**Deliverable**: `.claude/skills/verify/SKILL.md` · project-onboard template edit · skill-activation keyword row + test.
**Verify**: Glob resolves the CLAUDE.md reference (dead ref fixed); `bun test ./.claude/hooks/` green; smoke: after a code edit in this repo, invoking the skill runs `bun test` + impact sweep + residual-risk report.
**Ask first**: nothing — the skill was already specified in CLAUDE.md (028/US5); this materializes it.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W1 |
| **Depends on** | none |
| **Blocks** | none (US3 lo referencia por nombre, no bloquea) |
| **Files touched** | `.claude/skills/verify/SKILL.md` · `.claude/skills/project-onboard/` (template) · `.claude/hooks/skill-activation.ts` (+ test) |
| **TDD-mode** | optional (hook row con test) |
| **Estimate** | M |
| **Cómo arrancar** | Read CLAUDE.md §Dev workflow (dev loop REVIEW + Verification in this repo) + 028/US5 spec para honrar el contrato ya escrito |

## User story

- **As a**: Oriol
- **I want**: que "hecho" signifique verificado (checks + barrido de impacto + flujo probado + riesgo residual declarado)
- **So that**: dejo de preguntar "¿estás 100% seguro?" en cada cierre y la CI deja de romper después de un "done"

## Acceptance criteria

- **AC1**: Given CLAUDE.md's `Skill(verify)` reference, when Glob runs, then the skill exists (dead ref resolved).
- **AC2**: Given the skill, when read, then the 4-step protocol is present (check command · impact sweep · end-to-end flow · residual risk) with the proportionality clause (doc-only diffs exempt).
- **AC3**: Given project-onboard templates, when a work-repo layer is generated, then it wires the stack's check command as mandatory pre-done AND the brevity default line.
- **AC4**: Given the impact sweep, when a shared symbol was touched, then the report names its other usages (the "dodne se usan mas estos badge?" sweep, ahora proactivo).

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/skills/verify/SKILL.md` | Skill nueva — protocolo 4 pasos |
| `.claude/skills/project-onboard/references/*` o template | Gate pre-done + línea brevedad por stack |
| `.claude/hooks/skill-activation.ts` + test | Keyword row — `sensitive: hook global de activación` |

## Workflow detallado

1. Read 028 plan US5 (contrato original de verify) + CLAUDE.md section.
2. Write skill honoring that contract; meta-create canon.
3. Project-onboard template edit; keyword row + test.

## Commandments cubiertos

| # | Cómo |
|---|---|
| IV | El gate pre-done convierte "intención de estar bien" en verificación mecánica |
| IX | Repara referencia muerta detectada (Skill(verify) citado, inexistente) |

## Smell signals

- ⚠️ Si el protocolo se ejecuta entero en diffs doc-only → falta la cláusula de proporcionalidad.

## Verificación post-implementación

- Smoke: edición de código en este repo → skill corre `bun test` + sweep + informe.
- `bun test ./.claude/hooks/` green.
