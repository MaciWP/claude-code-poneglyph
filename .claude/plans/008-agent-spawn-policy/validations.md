---
spec: 008-agent-spawn-policy
tasks: tasks/
created: 2026-06-05
phase: 2.5
status: draft
validation_mode: validation
test_policy: auxiliary
---

# Validations per HU (validation-mode)

## ¿Por qué validation-mode y no TDD?

Feature markdown/config del meta-sistema + 1 hook `.ts` y su test. test-policy = `auxiliary`. El único oracle ejecutable es `bun test ./.claude/hooks/` (no-regresión + el assert actualizado de `post-compact.test.ts` en US7). El resto se valida vía Grep/Glob/Read. TDD-first sería ceremonia.

## Categorías

| Categoría | Significado |
|---|---|
| Pre / Post | Estado antes / después de la HU |
| Structural | Contenido obligatorio en los artefactos |
| Smoke | Verificación ejecutable (Grep/Glob/`bun test`) |
| Cross | Coherencia de refs entre archivos |

## Por HU (resumen — detalle de AC en cada `tasks/US{N}.md`)

| HU | Post clave | Smoke |
|---|---|---|
| US1 | Árbol 2-ejes único en `orchestrator-protocol/SKILL.md`; 0 refs internas a agentes | `Grep -i "context isolation\|subagent_type=.(builder\|reviewer\|scout)" SKILL.md` → 0 |
| US2 | 3 agents borrados + memorias archivadas; build/critic inline | `Glob agents/{builder,reviewer,scout}.md` → vacío; `Grep "context isolation" build,critic` → 0 |
| US3 | scope/decide sin spawn de 3 perspectives | `Grep "3 parallel Agent\|3 perspectives"` → reformulado |
| US4 | 5 docs apuntan al árbol; CLAUDE.md inventario Agents=0 | `Grep "→ builder\|delegates to .builder"` → 0 vivas |
| US5 | matrices sin builder/reviewer/scout spawn-target; exploración=`Explore` | `Grep "context isolation"` en los 3 → 0 |
| US6 | doc-wiring (Workflow-vs-Team + panel-≥4) existe; team-mode sin `planner` | `Grep "planner" 05-team-mode` → 0; `Grep "panel de review"` → existe |
| US7 🩻 | reminder+test+config sin agentes muertos | **`bun test ./.claude/hooks/` → verde** |
| US8 | memoria `independent-reviewer` reconciliada (panel-≥4); version "v2.1.154+" | `Grep "MUST delegate to .reviewer"` memoria → 0 |
| US9 | 7 skills auxiliares sin refs a agentes muertos | `Grep "builder agent\|reviewer agent"` los 7 → 0 |
| US10 | matriz AC1-AC9 toda ✅ | (todos los anteriores + lectura cruzada) |

## Cross-cutting validations (las que cierran el feature)

- **X1** (spec AC1): `Grep -ri "context isolation|for isolation"` en `skills/ commands/ docs/ CLAUDE.md hooks/` → **0** como justificación de spawn (`plans/` exento).
- **X2** (spec AC2): toda ref al criterio de spawn apunta al árbol (US1); 0 umbrales divergentes.
- **X3** (spec AC3): `Glob agents/{builder,reviewer,scout}.md` → vacío.
- **X4** (spec AC8): **`bun test ./.claude/hooks/` → verde** (no-regresión; US7 actualiza hook+test juntos).
- **X5** (condición dura): patrón panel-review ≥4 documentado (US6) ANTES de aceptar el corte de `reviewer` (US2/US8).
- **X6** (censo): `Grep "\b(builder|reviewer|scout)\b"` repo-wide → 0 hits vivos fuera de la **tabla de falsos positivos exentos** (`index.md`).
- **X7** (orden): US7 ejecutada en el mismo tramo que US2 → ningún estado intermedio deja el reminder mintiendo + `bun test` rojo simultáneamente.
