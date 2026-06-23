---
us: US4
title: Reforzar invocación de skill de fase en /flow + orchestrator-protocol
wave: W1
depends_on: []
tdd_mode: optional
estimate: S
status: closed
approved: 2026-06-23
---

# US4 — Reforzar invocación de skill de fase

## Execution prompt (Phase 3 input)

**Task**: Hacer más directiva la instrucción de que cada fase de `/flow` INVOCA de verdad su skill (build/critic/etc.), en `.claude/commands/flow.md` y `.claude/skills/orchestrator-protocol/SKILL.md`, para que el Lead no salte la invocación.
**Context**: El cableado por-fase ya existe en `flow.md` (Phase 1→scope, 2→tech-plan, 2.5→tdd-design, 3→build, 4→critic, 5→retro) pero la instrucción es enunciativa; el problema observado es que el Lead a veces no invoca la skill. El usuario pidió "instar más a usar build/critic/etc." `/flow` ES el lever determinista (research). orchestrator-protocol §1 Triage ya menciona "Feature-scope → suggest /flow".
**Constraints**: Markdown only, no código. NO añadir peso always-loaded (memoria: always-loaded vs on-demand). Refuerzo = phrasing directivo + checkpoint explícito por fase, no un bloque nuevo enorme. Inglés. No re-introducir mecanismos de "forzar" inexistentes.
**Deliverable**: ediciones en `flow.md` (cada fase: instrucción directiva "INVOKE Skill(<phase>) — do not inline the phase work without it") + nota en `orchestrator-protocol` SKILL.md reforzando que en un `/flow` la skill de fase se invoca, no se improvisa.
**Verify**: lectura del diff confirma instrucción directiva por fase; `bun test ./.claude/hooks/` verde (markdown, sin impacto); coherencia con la doctrina inline-first (la skill de fase se invoca; el trabajo sigue inline).
**Ask first**: nada.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W1 |
| **Depends on** | none |
| **Blocks** | none |
| **Files touched** | `.claude/commands/flow.md`, `.claude/skills/orchestrator-protocol/SKILL.md` |
| **TDD-mode** | optional (markdown) |
| **Estimate** | S |
| **Cómo arrancar** | Releer las secciones de fase de flow.md; reforzar phrasing |
| **Decisión absorbida** | — |

## User story

- **As a**: usuario que corre /flow
- **I want**: que cada fase invoque de verdad su skill
- **So that**: build/critic/etc. no se salten por discreción del Lead

## Acceptance criteria

- **AC1**: Given flow.md, when se lee cada fase, then la instrucción de invocar `Skill(<fase>)` es directiva (imperativa), no meramente enunciativa.
- **AC2**: Given orchestrator-protocol, when se lee, then refuerza que en un /flow la skill de fase se invoca (no se improvisa), sin contradecir inline-first (el trabajo sigue inline; la skill aporta el procedimiento).
- **AC3**: `bun test ./.claude/hooks/` verde.

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/commands/flow.md` | Instrucción directiva de invocación por fase |
| `.claude/skills/orchestrator-protocol/SKILL.md` | Nota de refuerzo (sin bloat) |

## Workflow detallado

1. Releer secciones Phase 1-5 de flow.md.
2. Reforzar el phrasing de invocación por fase (imperativo + checkpoint).
3. Nota en orchestrator-protocol coherente con inline-first.
4. `bun test ./.claude/hooks/` verde.

## Drillme (Socratic check)

1. `[approach]` ¿refuerzo markdown sirve si el Lead ya ignora hints? → es el lever determinista (command step), no un nudge; + coherente con research.
2. `[failure]` ¿contradice inline-first? → no: invocar la skill de fase ≠ delegar el trabajo; el trabajo sigue inline.

## Commandments cubiertos

| # | Cómo |
|---|---|
| III | Refuerzo mínimo (phrasing), sin bloque nuevo |
| IV | La invocación de fase es parte del gate determinista |

## Verificación post-implementación

- Diff legible confirma instrucción directiva por fase.
- `bun test ./.claude/hooks/` verde.
