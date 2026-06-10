---
us: US9
title: Phase skills — disable-model-invocation + extract retro/critic references
wave: W3
depends_on: []
tdd_mode: optional
estimate: M
status: closed
closed: 2026-06-10
implemented: 2026-06-10
absorbs_decision: verify disable-model-invocation frontmatter field exists first
---

# US9 — Phase skills: control de activación + extracción de references

## Execution prompt (Phase 3 input)

**Task**: (1) Verify `disable-model-invocation: true` in current skill docs; smoke-test on ONE phase skill that explicit Skill-tool invocation still works with the field set; if OK, apply to the 6 phase skills (scope, tech-plan, tdd-design, build, critic, retro). (2) Extract references from `retro` (478 lines) and `critic` (438) to bodies ≤350 with one-level-deep references (ToC if >100 lines).
**Context**: Phase skills only ever fire via /flow or explicit command — their auto-activation descriptions are pure context cost. Official ceiling: 500-line SKILL.md.
**Constraints**: Mechanical extraction — no content redesign (spec out-of-scope). drillme/skill-advisor keep auto-activation (they depend on it). If the field blocks explicit invocation, REVERT and record — that finding changes the approach, not the goal.
**Deliverable**: 6 skills with the field (or documented revert) + restructured retro/critic.
**Verify**: /flow-style `Skill('critic')` smoke passes; `wc -l .claude/skills/{retro,critic}/SKILL.md` ≤350.
**Ask first**: nothing — the smoke test is the gate.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W3 |
| **Depends on** | none |
| **Blocks** | none |
| **Files touched** | `.claude/skills/{scope,tech-plan,tdd-design,build,critic,retro}/SKILL.md` + new `critic/references/`, `retro/references/` |
| **TDD-mode** | optional |
| **Estimate** | M |
| **Cómo arrancar** | Verify `disable-model-invocation` in current skill docs; then apply to the 6 phase skills |
| **Decisión absorbida** | phase skills only fire via /flow or explicit command — zero auto-trigger cost |

## User story

- **As a**: Oriol
- **I want**: phase skills invisible to auto-activation (they're deterministic, /flow-invoked) and the two near-limit skills decomposed
- **So that**: no startup context is spent on 6 descriptions that never need matching, and no skill crosses the official 500-line ceiling

## Acceptance criteria

- **AC1**: Given the field verification, when `disable-model-invocation: true` exists, then the 6 phase skills carry it AND `/flow`'s Skill() invocations still work (smoke test required — if the field also blocks explicit Skill-tool invocation, record and revert; that nuance decides scope). (spec AC7)
- **AC2**: Given `retro` (478 lines) and `critic` (438), when restructured, then bodies ≤350 lines with detail moved to one-level-deep references, each >100-line reference carrying a ToC. (spec AC8)
- **AC3**: Given the restructure, when /flow invokes critic/retro, then behavior is unchanged (references loaded on demand per skill body instructions).

## Workflow detallado

1. Verify the frontmatter field in official docs (code.claude.com skills reference).
2. Smoke-test on ONE skill first (e.g. tdd-design): add field → verify /flow-style Skill() invocation still loads it.
3. Roll out to the 6; extract critic/retro references (mechanical move, no content redesign — spec out-of-scope).

## Drillme (Socratic check)

1. `[failure]` ¿Y si disable-model-invocation también bloquea la invocación explícita? → por eso el smoke en 1 skill ANTES del rollout; si bloquea, se revierte y queda documentado.
2. `[approach]` ¿drillme/skill-advisor también? → no: esos SÍ dependen de auto-activación + invocación de usuario; solo las 6 de fase.

## Commandments cubiertos

| # | Cómo |
|---|---|
| VII | Contexto de arranque sin 6 descripciones inertes |
| X | Skills bajo el techo oficial de 500 líneas |

## Verificación post-implementación

- `/flow` smoke: Skill('critic') carga y produce el flujo esperado.
- `wc -l .claude/skills/{retro,critic}/SKILL.md` ≤ 350 cada una.
