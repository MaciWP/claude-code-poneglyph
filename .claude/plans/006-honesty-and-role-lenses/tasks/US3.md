---
us: US3
title: /role command — 13-role catalog + persona-framing composing existing skills
wave: W1
depends_on: []
tdd_mode: optional
estimate: M
status: closed
approved: 2026-06-08
closed: 2026-06-08
absorbs_decision: roles-as-one-command-not-N-skills
---

# US3 — `/role` command: catalog + persona-framing

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W1 |
| **Depends on** | `none` |
| **Blocks** | `none` (US2 inventory referencia `/role` por nombre canónico) |
| **Files touched** | `.claude/commands/role.md` (nuevo) |
| **TDD-mode** | optional (validation-mode: lectura + smoke `/role`) |
| **Estimate** | M |
| **Cómo arrancar** | `Read .claude/commands/flow.md` (formato de comando) + invocar `prompt-engineer` Context 2 para los persona-prompts; crear `commands/role.md` |
| **Decisión absorbida** | Goal 2: 1 comando con catálogo, NO N skills |

## User story

- **As a**: Oriol (90% programación + decisiones + tareas ad-hoc)
- **I want**: un comando `/role <name>` que me ponga en un rol senior especializado, componiendo skills existentes
- **So that**: Claude opere a profundidad senior en el dominio pedido sin proliferar N skills

## Acceptance criteria

- **AC1 (catálogo, 13 roles agrupados)**: Given `commands/role.md`, then define los roles en 2 grupos:
  - **Engineering (9)**: `backend`, `frontend`, `devops`, `security`, `performance`, `debugging`, `architect`, `data`, `testing`.
  - **General / decisión (4)**: `advisor`, `research`, `shopping`, `pc-optimizer`. (spec AC7; confirmado en gate 2→3)
- **AC2 (compone, no duplica)**: Given cada rol, then se define como persona-framing que **compone skills existentes**: `security`→`security-review`; `debugging`→`diagnostic-patterns`; `performance`→`review-patterns` perf; `architect`→`decision-stress-test`+`tech-plan`+`scope`; `frontend`→`frontend-design`+`html-report`; `backend`→`tech-plan`+`build`+`review-patterns`; `advisor`→`decision-stress-test`+`drillme`; `testing`→`tdd-design`+`review-patterns`+`critic`; `research`→`deep-research`+WebSearch/WebFetch; `shopping`→`deep-research`+`decision-stress-test`. **Gaps sin skill** (lente propia): `devops` (deploy/CI-CD/infra/observabilidad), `data` (modelado/SQL/pipelines/ETL), `pc-optimizer` (hardware/OS/perf tuning + `diagnostic-patterns` para troubleshooting). (spec AC7, Commandment X)
- **AC3 (persona-prompt ≥80, prompt-engineer)**: Given cada rol, when se redacta su prompt, then sigue el patrón "Act as senior X → deep analysis before acting → compose <skills> → structured deliverable" y puntúa ≥80 en la rúbrica de `prompt-engineer` (Clarity/Context/Structure/Success/Actionable).
- **AC4 (no-args lista)**: Given `/role` sin argumentos, then lista los 13 roles agrupados + 1 línea de qué hace cada uno; `/role <desconocido>` degrada a esta lista (sin inventar rol). (spec AC7)
- **AC5 (frontmatter de comando)**: Given `commands/role.md`, then usa frontmatter de **comando** (`description` + `argument-hint`), NO el formato 3-líneas de skill (meta-create canon: comandos se invocan explícitos, no auto-match). Sigue el patrón de `flow.md`/`decide.md`.
- **AC6 (compatibilidad honestidad)**: Given un rol activo, then la capa de honestidad (US1/US2) sigue aplicando — el rol cambia dominio/profundidad, no desactiva anti-pelota/labels.
- **AC7 (sin auto-activación)**: Given el comando, then NO se auto-activa; la sugerencia proactiva vive en CLAUDE.md (US2). `/role` es invocación explícita. (spec AC7, Commandment I)

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/commands/role.md` | Comando nuevo: frontmatter comando + tabla catálogo 13 roles (grupo → rol → skills compuestas + lente) + patrón persona-framing + manejo no-args |

## Workflow detallado

1. `Read .claude/commands/flow.md` para el formato canónico de comando.
2. Invocar `prompt-engineer` (Context 2) para diseñar el **patrón persona-prompt** reutilizable (≥80) y validar 2-3 roles representativos.
3. Crear `commands/role.md`: frontmatter (`description`, `argument-hint`) + tabla catálogo agrupada (Engineering / General) + patrón persona-framing por rol citando skills a invocar + manejo de `/role` sin args.
4. Cada rol: NO reimplementar lo que la skill ya hace; el rol es el framing + la composición.
5. Nota explícita: la capa de honestidad sigue activa bajo cualquier rol; poneglyph sigue co-programmer-first (los roles General son extensión ad-hoc).

## Drillme (Socratic check)

1. `[location]` ¿Comando vs skill vs N skills? — Comando único: el usuario lo pidió explícito; N skills viola Commandment X.
2. `[approach]` ¿Persona-framing aporta sobre invocar la skill directa? — Sí (advisor lo confirmó): el framing eleva a profundidad senior y combina varias skills bajo un rol.
3. `[context]` ¿`shopping`/`pc-optimizer` coherentes con misión co-programmer? — Tensión real (flagged): resolución = poneglyph co-programmer-first, `/role` extensión generalista ad-hoc. Confirmar en gate.
4. `[failure]` ¿Rol inexistente o `/role` con typo? — Degradar a lista (no-args). Sin inventar.

## Commandments cubiertos

| # | Cómo |
|---|---|
| III | 1 comando, no N componentes |
| VIII | Persona-framing diseñado con `prompt-engineer` (meta-prompting) |
| X | Compone skills existentes, no las duplica |

## Reutiliza

- `prompt-engineer` (Context 2) — diseño de los persona-prompts ≥80.
- `meta-settings-cookbook` — convención de comando (meta-create no templatea comandos).
- Skills compuestas: `security-review`, `diagnostic-patterns`, `review-patterns`, `decision-stress-test`, `tech-plan`, `scope`, `build`, `frontend-design`, `html-report`, `drillme`, `tdd-design`, `critic`, `deep-research`.

## Verificación post-implementación

- Smoke: `/role` (sin args) → lista 13 roles agrupados.
- Smoke: `/role backend` → asume rol + cita skills compuestas.
- `grep -c "backend\|frontend\|devops\|security\|performance\|debugging\|architect\|advisor\|data\|testing\|research\|shopping\|pc-optimizer" .claude/commands/role.md` → ≥13.
- Cada skill citada existe en `.claude/skills/` (anti-hallucination).
- `bun test ./.claude/hooks/` sigue pasando.

## Open questions (a resolver en implementación)

- Si el catálogo de 13 hace `role.md` muy largo → mover persona-prompts a `commands/role/` references o tabla compacta. Decidir al redactar (preferir compacto).
- Coherencia misión (co-programmer vs generalista) — **confirmar framing en gate 2→3**.
