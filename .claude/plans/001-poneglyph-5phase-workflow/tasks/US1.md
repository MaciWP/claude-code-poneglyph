---
us: US1
title: Foundation — estructura `.claude/plans/{NNN}-{slug}/` + 6 templates IA-friendly
wave: W1
depends_on: []
tdd_mode: optional
estimate: M
status: approved
approved: 2026-05-28
---

# US1 — Foundation: estructura + templates

## User story

- **As a**: cualquier skill del workflow que produce un artefacto
- **I want**: una estructura de directorio canónica + templates con campos mínimos IA-friendly
- **So that**: los artefactos son consistentes, parseables, sin decoración burocrática, y todas las skills tienen una base común sin acoplamiento

## Acceptance criteria

- **AC1**: Given una nueva tarea, when una skill crea su directorio, then sigue convención `.claude/plans/{NNN}-{slug}/` con NNN = siguiente número secuencial de 3 dígitos libre.
- **AC2**: Given el directorio creado, when se inspecciona, then el ciclo de vida queda documentado en `.claude/plans/README.md` (qué archivos opcionales, qué obligatorios por modo, cuándo se cierra).
- **AC3**: Given los 6 templates (`spec`, `tasks`, `tests`, `review`, `retro`, `state`), when están en disco, then cada uno tiene frontmatter YAML válido + secciones canónicas del modelo conceptual V2 del spec.md.
- **AC4**: Given el test IA-friendly ("si borras una sección, ¿el modelo decide peor en fases posteriores?"), when se aplica a cada sección/campo, then ninguna sobrevive el borrado sin pérdida de señal (= ninguna es decorativa).
- **AC5**: Given el principio self-contained (Principio 5), when una skill lee un template, then NO necesita leer otros archivos para entenderlo (frontmatter incluye instrucciones inline si las hay).
- **AC6**: Given una skill US2-US7 referencia un template, when intenta leerlo via `Read .claude/plans/templates/<name>.template.md`, then el archivo existe y es parseable.

## Files a crear

| Path | Contenido |
|---|---|
| `.claude/plans/README.md` | Doc de la convención de naming (NNN-slug), ciclo de vida, qué archivos por modo, links a templates |
| `.claude/plans/templates/spec.template.md` | Template Fase 1 — frontmatter + Problema/Resultado/Success/Out-of-scope/Constraints/Stakeholders/Open questions |
| `.claude/plans/templates/tasks.template.md` | Template Fase 2 — frontmatter + **Quick reference table arriba** (estado/wave/deps/files/cómo-arrancar) + User story + AC + Workflow + Drillme + Casos edge + Smell signals |
| `.claude/plans/templates/tasks-index.template.md` | Template del `index.md` de la carpeta tasks — frontmatter + Resumen ejecutivo + DAG mermaid + Tabla resumen de HUs + Cross-cutting decisions + Open questions |
| `.claude/plans/templates/tests.template.md` | Template Fase 2.5 (modo TDD) — frontmatter + Test specs por HU (Pre/Action/Assert + falla red esperada). Usar cuando hay código ejecutable nuevo |
| `.claude/plans/templates/validations.template.md` | Template Fase 2.5 (modo validation) — frontmatter + Validaciones declarativas por HU (Pre-conditions / Post-conditions / Structural assertions / Smoke checks / Cross-validations). Usar cuando la HU produce markdown/skills/docs/configs (sin lógica unit-testable) |
| `.claude/plans/templates/review.template.md` | Template Fase 4 — frontmatter + Checklist 5 secciones (Correctness/Quality/Security/Performance/Mantenibilidad) + Findings con severidad + Veredicto |
| `.claude/plans/templates/retro.template.md` | Template Fase 5 — frontmatter + Resumen/Lecciones/Proceso/Promociones/Living-spec deltas/Commandments check/Action items |
| `.claude/plans/templates/state.template.json` | Template tracking — schema mínimo |

## Decisión clave: templates como archivos vs embebidos

**Decisión**: archivos separados en `.claude/plans/templates/` (NO embebidos en SKILL.md).

**Razones**:
1. DRY — cambios al template no requieren editar 6 skills.
2. Visibilidad — el usuario ve los templates como artefactos versionable.
3. Composabilidad — cualquier proyecto que use poneglyph puede sobrescribir templates locales (`.claude/plans/templates/` del proyecto local) si quiere.

**Riesgo**: skill puede fallar si template no existe → mitigación: cada skill verifica con `Glob .claude/plans/templates/<name>.template.md` al inicio de su workflow (anti-hallucination).

## Test IA-friendly aplicado (ejemplo verificación AC4)

Para `spec.template.md`:

| Sección | ¿Sobrevive al borrado sin pérdida? | Decisión |
|---|---|---|
| `# Problema` | ❌ — Fase 2 no sabe qué planificar sin esto | Mantener (obligatorio) |
| `# Resultado esperado` | ❌ — Fase 4 no puede verificar sin esto | Mantener (obligatorio) |
| `# Success criteria` | ❌ — Fase 2.5 no genera tests sin estos | Mantener (obligatorio) |
| `# Out of scope` | ❌ — Fase 3 puede implementar de más sin esto | Mantener (obligatorio) |
| `# Constraints` | ⚠️ — solo si hay constraints reales | Opcional |
| `# Stakeholders` | ⚠️ — solo si hay >1 stakeholder | Opcional |
| `# Open questions` | ✅ — los gaps quedan visibles, no se ignoran | Mantener (puede estar vacío) |

Aplicar mismo análisis a los otros 5 templates en la implementación.

## Frontmatter canónico (compartido entre templates)

```yaml
---
id: {NNN}-{slug}       # ID del feature
created: ISO-date      # Cuándo se creó
status: approved
approved: 2026-05-28|approved|implementing|closed
mode: minimal|standard|full
phase: 1|2|2.5|3|4|5   # Solo en tasks/tests/review/retro
---
```

## Quick reference obligatorio en cada US{N}.md

Inmediatamente después del título `# US{N} — <título>`, el template `tasks.template.md` exige una tabla **Quick reference** que permita al lector entender en 3 segundos: estado, dependencias, lo que cambia, cómo arrancar.

Formato canónico (literal):

```markdown
# US{N} — <título>

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft / 🟢 approved / 🔵 implementing / ✅ closed / 🔴 blocked |
| **Wave** | W{N} |
| **Depends on** | [US{ids}] o `none` |
| **Blocks** | [US{ids}] (qué HUs me están esperando) |
| **Files touched** | resumen 1 línea (paths exactos) |
| **TDD-mode** | forced \| optional \| skip:<reason> |
| **Estimate** | S \| M \| L |
| **Cómo arrancar** | 1-2 líneas literales del paso 1 del workflow |
| **Decisión absorbida** | si aplica (ej. "decide CUT planner-protocol") |

## User story
...
```

**Razón** (feedback usuario 2026-05-28): un lector que abre US{N}.md debe poder, sin scroll, decidir en 3 segundos si esta HU es la siguiente que puede ejecutar (deps cumplidas) y qué va a tocar. El frontmatter YAML lo tiene pero **no se renderiza visualmente** en lectores markdown — la tabla sí.

## Definición canónica: cómo `tech-planner` produce cada US{N}.md

Esta sección no implementa la skill (eso es US3) — pero define **el contrato del template que la skill debe cumplir**:

1. Cada US{N}.md empieza con `# US{N} — <título descriptivo>` (≤80 chars).
2. Inmediatamente después: la tabla `⚡ Quick reference` con TODOS los campos del bloque anterior. Sin campos vacíos — si no aplica, escribir `—`.
3. Después: `## User story` con formato `As a [role], I want [action], so that [benefit]`.
4. `## Acceptance criteria` numerados (AC1, AC2, ...) en Given/When/Then.
5. `## Files a crear` y/o `## Files a modificar` con tabla path × contenido/cambio.
6. `## Workflow detallado` paso a paso (numerado).
7. `## Drillme` block reusable si la HU implementa una fase del workflow.
8. `## SIEMPRE rules implementadas` (opcional, si la HU es una skill).
9. `## Commandments cubiertos` tabla.
10. `## Reutiliza` lista de skills/agents/scripts existentes reusados.
11. `## Adaptación intra-fase` tabla señal × adaptación.
12. `## Casos edge` lista de edge cases conocidos.
13. `## Smell signals` cuándo la HU se está volviendo no-atómica.
14. `## Verificación post-implementación` checks ejecutables.
15. `## Open questions` (a resolver en implementación) — puede estar vacía.

Secciones 4-15 son **modulares**: se omiten si no aplican (Principio 3 — IA-friendly, no decorativo). Pero 1-3 + Quick reference son **obligatorias**.

## Casos edge a manejar

- **Edge 1**: Dos features con mismo slug → NNN incremental los diferencia (`002-foo`, `003-foo`).
- **Edge 2**: Feature abandonada (status nunca pasa de draft) → README documenta política de garbage collection (¿purga manual? ¿auto si >30d sin updates?). Decidir en US1.
- **Edge 3**: Template actualizado mid-feature → no migrar specs existentes (immutable post-approved); nueva feature usa nuevo template.
- **Edge 4**: Proyecto local sobrescribe template → resolver via path lookup (project-local first, global fallback). Documentar en README.

## Commandments cubiertos

| # | Cómo |
|---|---|
| II | Templates evitan inventar campos; estructura forzada |
| III | Test IA-friendly fuerza minimalismo |
| VIII | Frontmatter + estructura ayudan a meta-prompting estructurado |
| X | Templates centralizados = mantenibilidad |

## Smell signals (cuándo esta HU se está volviendo no-atómica)

- ⚠️ Si necesitas crear >7 templates → revisar; quizás algunos son combinables.
- ⚠️ Si un template tiene >100 líneas → probable over-specification, simplificar.
- ⚠️ Si el README empieza a duplicar contenido del template → mover al template (single source).

## Próximo paso

Cuando esta HU se implemente: las 6 skills US2-US7 ya pueden referenciar los templates con `Read .claude/plans/templates/<name>.template.md` sin riesgo de ambigüedad.
