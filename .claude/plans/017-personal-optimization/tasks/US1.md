---
us: US1
title: Orchestration doctrine rewrite — inline-first, agents only for parallel read-only work
wave: W1
depends_on: []
tdd_mode: optional
estimate: M
status: closed
closed: 2026-06-10
absorbs_decision: agents = parallelization-only tool
---

# US1 — Doctrina de orquestación inline-first

## Execution prompt (Phase 3 input)

**Task**: Rewrite the delegation doctrine across orchestrator-protocol (SKILL.md + references 03/04/05/06): inline-first for ALL build/write work; agents exist ONLY to parallelize independent read-heavy units (research/exploration); document the three costs (token multiplication, summary degradation, context loss).
**Context**: User's lived evidence (2026-06-10): agents never worked for building; the proven-good mode is parallel read-only fan-out. Phantom refs to fix in the same files: 05-skill-matching.md:73,77 and 06-context-arch-h.md:33,67,142 (builder/reviewer/scout in present tense).
**Constraints**: Do NOT touch CLAUDE.md (US2) or flow.md (US7). Keep the ≥4 rule but constrain it to read-only units or explicit opt-in (ultracode). English. Cite CC 2.1.133 from `_research-skill-activation-2026-06-09.md`.
**Deliverable**: 5 edited files + a 5-10 line doctrine anchor handed to US2.
**Verify**: `grep -rn "builder\|reviewer\|scout" .claude/skills/orchestrator-protocol/` → historical-with-disclaimer only; spawn tree answers "inline" for any write work without opt-in.
**Ask first**: nothing — decisions locked.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W1 |
| **Depends on** | none |
| **Blocks** | [US2] |
| **Files touched** | `.claude/skills/orchestrator-protocol/SKILL.md`, `references/{03-complexity-routing,04-agent-selection,05-skill-matching,06-context-arch-h}.md` |
| **TDD-mode** | optional |
| **Estimate** | M |
| **Cómo arrancar** | Read the 5 orchestrator-protocol files; map every statement that frames delegation as default or quality-improving |
| **Decisión absorbida** | agents = parallelization-only; inline-first for ALL build work |

## User story

- **As a**: Oriol (single user)
- **I want**: the orchestration protocol to encode my lived evidence — building via agents costs tokens and degrades quality; agents serve ONLY to parallelize independent read-heavy work
- **So that**: every session defaults to inline execution and never wastes tokens on delegation that produces worse summaries

## Acceptance criteria

- **AC1**: Given orchestrator-protocol after the rewrite, when reading SKILL.md + 4 references, then the doctrine states inline-first for ALL build/write work, frames agents exclusively as parallelization of independent read-only units (research/exploration fan-out), and documents the three known costs: token multiplication, summary degradation back to the Lead, context loss. (spec AC5)
- **AC2**: Given the references, when grepping for `builder|reviewer|scout` as live entities, then 0 present-tense references remain (05-skill-matching.md:73,77 and 06-context-arch-h.md:33,67,142 rewritten or removed). (spec AC1 partial)
- **AC3**: Given the spawn decision tree, when a task has ≥4 independent WRITE units, then the tree no longer recommends Workflow fan-out by default — it requires the units to be read-only OR explicit user opt-in (ultracode), and says why.
- **AC4**: Given references/06-context-arch-h.md, when reading the CC ≥2.1.133 claim, then it carries a citation (changelog/_research file link).

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/skills/orchestrator-protocol/SKILL.md` | Rewrite delegation doctrine; per-turn checklist updated |
| `references/03-complexity-routing.md` | Routing biased inline; Workflow = read-only parallel or opt-in |
| `references/04-agent-selection.md` | Reframe as "when parallelizing reads, which agent type" |
| `references/05-skill-matching.md` | Remove live builder/reviewer/scout baseline rows |
| `references/06-context-arch-h.md` | Past-tense the agent tables; cite 2.1.133 |

## Workflow detallado

1. Read the 5 files; inventory every delegation-positive statement.
2. Draft the new doctrine block (single source): inline-first, agents = parallel reads only, costs documented, ≥4 rule retained but constrained to read-only units.
3. Rewrite the 5 files consistently; keep what already agrees (the ≥4 rule, "1 agent forbidden").
4. Output for US2: the 5-10 line doctrine summary that CLAUDE.md will carry.

## Drillme (Socratic check)

1. `[location]` ¿La doctrina vive en orchestrator-protocol y CLAUDE.md solo lleva el ancla corta? (sí — CLAUDE.md es siempre-cargado, mínimo)
2. `[approach]` ¿Prohibir Workflow para writes o exigir opt-in? → opt-in explícito (ultracode ya lo es); prohibición rompería casos legítimos de migración masiva.
3. `[context]` ¿Cómo interactúa con /flow Fase 3 (≥4 HUs → Workflow)? → flow.md se ajusta en US7 si el wording contradice.
4. `[failure]` ¿Qué pasa si un día los agentes mejoran? → la doctrina cita la evidencia (fecha + experiencia); revisable por retro, no dogma.

## Commandments cubiertos

| # | Cómo |
|---|---|
| VII | Tokens dejan de quemarse en delegación que empeora el producto |
| II | La doctrina se basa en evidencia vivida + citada, no en moda |
| X | Elimina referencias fantasma en los mismos ficheros (mismo locus) |

## Smell signals

- ⚠️ Si el rewrite empieza a tocar flow.md o CLAUDE.md → parar; eso es US7/US2.

## Verificación post-implementación

- `grep -rn "builder\|reviewer\|scout" .claude/skills/orchestrator-protocol/` → solo menciones históricas con disclaimer.
- Lectura: el spawn tree responde "inline" para 3 unidades de escritura y para 6 unidades de escritura sin opt-in.
