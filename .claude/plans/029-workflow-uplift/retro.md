---
spec: 029-workflow-uplift
phase: 5
retro_level: full
verdict_phase4: APPROVED_WITH_WARNINGS
spec_drift: legitimate
promotions_proposed: 3
promotions_approved: 3
commandment_violations: 3
living_spec_delta: yes
action_items: 5
created: 2026-08-18
status: approved
---

# Retro — 029-workflow-uplift

## Resumen

El problema (mini-spec en `tasks/index.md`, **sin** `spec.md`): el sistema no aportaba lo suficiente — back-half de `/flow` moría (10/14 lifecycles abiertos), el turno ad-hoc no tenía disciplina, skills infrautilizadas, capas de proyecto caras.

Se entregaron 18 HUs (dev loop obligatorio, verify, no-modes, spawn gate, security-gate, skill-activation, flow slim-down, census, etc.). Critic: `APPROVED_WITH_WARNINGS` (4 MAJOR + 9 MINOR arreglados; 258/258 entonces). Esta retro llega **13 días tarde** — el síntoma que 029 decía curar (back-half muere sin retro) se reprodujo en el propio 029.

## Lecciones técnicas

### ✅ Patterns that worked

- **Desviaciones declaradas, no silenciosas**: sin spec + tdd-design deferred escritos en `tasks/index.md`. Reutilizable: si se salta una fase, el artefacto siguiente lo dice en la primera línea.
- **Errata log en el index**: corregir “flow 3×” vs 14 lifecycles evitó planificar sobre un censo falso (Cmd II).
- **No-modes (siempre FULL, skip justificado)**: restó superficie (`--minimal/--full`) en vez de añadir toggles. Reutilizar cuando un flag de intensidad no se cumple.
- **US10 absorbió commands existentes** (`commit-message`, `pr-description`) en lugar de `/commit-text` nuevo.
- **Critic + re-entrada**: 4 MAJOR reales (keywords JRV, GIT_MUTATION_RE, /goal docs, commandments renumber) se arreglaron antes del verdict, no se bancaron.

### ❌ Patterns that didn't work

- **Phase 1 saltada → no hay `spec.md`**: el critic “resuelve spec.md” no tiene primario. Living-spec ahora tiene que *inventar* el documento que debió existir el 2026-08-05.
- **El paciente se murió del mismo mal**: 029 endureció `retro-status`/`close-feature` y luego dejó `retro_status: null` hasta 2026-08-18. El gate impide `close-feature`; no impide el olvido.
- **ACs conductuales diferidos y no cobrados**: `instructions-loaded.log` + evals live + honor-rate a 1-2 semanas. No hay evidencia en este retro de que se cobraran.
- **US15 = docs, no deploy**: racionalización de capas Binora sin tocar esos repos (by design). Valor no realizado hasta ratificación fila a fila.
- **US7 / US8 / US18**: el propio usuario las marcó como las más débiles (~60% meta-trabajo). No hay métrica post-hoc de que el advisor de modelo/effort o frontend-craft pagaran.
- **`project-onboard` citado en US5/US10** y luego cortado en 031 — promoción prematura / superficie que no aguantó.

## Proceso

| Phase | Effort | Friction | Improvement |
|---|---|---|---|
| 1 Scope | — (saltada) | Mini-spec en el index. Barato ahora, caro en retro. | No saltar Phase 1. Mini-spec ≠ spec.md. |
| 2 Tech-plan | XL (18 HUs, 3 waves) | Erratas de censo en v1; Wave C en tablas hasta tarde. | Censo de skills/comandos desde artefactos, no memoria. |
| 2.5 Oracle | deferred | Validations/tests por HU, no un tdd-design de feature. | Si se defiere, fecha de cobro o skip justificado en state. |
| 3 Build | XL (18 HUs, un día) | Fusión US1–US3; gates “implícitos”. | Un `approve-gate` real aunque el usuario diga `/build` en draft. |
| 4 Critic | L | Fresh reviewer útil; 13 findings. | Keep. |
| 5 Retro | 0 hasta hoy | 13 días en `current_phase: 5` sin `retro.md`. | `flow-state status` en el ritual de “qué está abierto”. |

- **Fase que pesó más**: Phase 2+3 (18 HUs / un calendario).
- **Fricción evitable**: abrir 18 HUs y saltar spec; el back-half quedó como “next step” en review.md y nadie lo ejecutó.

## Drillme — Phase 5

1. `[approach]` **Phase too heavy?** Phase 2/3. 18 HUs en un feature “forma de trabajar” es un programa, no una historia. Un spec habría recortado US7/US8/US18 o las habría hecho follow-up.
2. `[approach]` **Avoidable friction?** Sí: retro no lanzada el 2026-08-05 cuando el critic ya apuntaba a Fase 5. El helper existía; faltó el turno.
3. `[approach]` **Reusable pattern?** “El gate que impide close-feature no sustituye un recordatorio accionable de `flow-state status`.” Ya se cortó el SessionStart open-plans (follow-through 1/9). El patrón reusable es **status on demand al empezar sesión en poneglyph**, no otro hook.
4. `[context]` **Global vs local vs memory?** El recordatorio es local (solo este repo tiene `plans/`). Las lecciones de proceso (no saltar spec, cobrar ACs diferidos) → `lessons` global.
5. `[failure]` **Commandment silent?** **I** (no spec), **VII** (lifecycle invisible 13 días), **IV** (ACs conductuales no medidos y verdict igual).

## Promociones candidatas

| Candidate | Scope | Type | Why | Concrete proposal |
|---|---|---|---|---|
| G8 — no Phase-1 skip without a dated spec stub | lessons (global) | lessons row | 029 no tiene spec.md y el critic tuvo que mentir “resuelve spec.md” | Append to `lessons/SKILL.md`: evidence = 029; rule = if Phase 1 is skipped, write `spec.md` stub the same day or `retro-status skipped` is forbidden later |
| Cobrar ACs diferidos | local | action / eval | Warnings del critic nunca se ejecutaron | Run `bun .claude/evals/run.ts` fuera de sandbox; grep `instructions-loaded.log` por CLAUDE.md/dev. One eval case only if a **new** live failure appears (evals README growth rule) |
| `flow-state status` en el mapa de sync | local | docs | 029 abierto y nadie lo vio | One line in `harness-adapters.md` / README install verify: `bun .claude/scripts/flow-state.ts status` |

Zero hook promotions (open-plans already cut for cause).

## Living-spec deltas

**No hay `spec.md` que parchear.** El drift `legitimate` del critic (renumber Commandments, no-modes, `dev` 5 etapas) vive en `CLAUDE.md` y en el index.

Propuesta (no aplicada):

- **Crear** `.claude/plans/029-workflow-uplift/spec.md` *ahora* como registro residual: copiar la mini-spec del index + las tres decisiones (renumber, no-modes, dev loop). Frontmatter `status: closed`, nota `v1 — residual spec written at retro 2026-08-18; Phase 1 was skipped 2026-08-05`.
- **No** reescribir historia como si Phase 1 hubiera existido.

Razón: edge case real (critic/retro sin primario). No contradice el intent. Why documentado aquí.

## Commandments check

| # | ¿Cumplido? | Evidencia / violación |
|---|---|---|
| I | ⚠️ | Phase 1 saltada. Mini-spec ≠ entender antes en un artefacto de producto. |
| II | ✅ | Errata log; census vs “0 drillme”; critic sobre ficheros. |
| III | ✅ | Desviaciones y warnings del critic sin maquillar. |
| IV | ⚠️ | Suite hooks/scripts verde. ACs conductuales **no** medidos; verdict igual. |
| V | ✅ | No-modes restó flags; US10 reutilizó commands. |
| VI | ✅ | Security-gate endurecido; sin secrets. |
| VII | ❌ | 13 días en fase 5 sin retro. El sistema no se observó a sí mismo. |
| VIII | ✅ | Spawn gate US9; advisor wiring US13. |
| IX | ⚠️ | US14 poda; luego 031 cortó `project-onboard` — superficie inestable. |
| X | ✅ | Workflow en `ask`; inline default. |

### Commandment violations forensics

- **VII**: momento = post-critic 2026-08-05 (“Next step: /retro”) → nadie lo corrió. Alternativa: `flow-state status` el siguiente turno en este repo. Acción: candidato 3 + no `close-feature` hasta que apruebes esta retro.
- **I**: momento = arranque (usuario pidió saltar spec). Alternativa: stub de spec.md el mismo día. Acción: candidato 1 + living-spec residual.
- **IV**: momento = warnings 1 del critic. Alternativa: no dar APPROVED_WITH_WARNINGS sin owner+fecha de cobro. Acción: candidato 2.

## Action items

| Action | Owner | Trigger | Due |
|---|---|---|---|
| Ratificar o rechazar las 3 promotions | tú | este retro | esta sesión o la siguiente |
| ¿Escribir spec.md residual? | Lead, si apruebas el living-spec | tu sí | mismo turno que el sí |
| `evals/run.ts` live + log de instructions-loaded | tú / Lead | fuera de sandbox | before next /flow |
| `close-feature` + frontmatters US* | Lead | después de `retro-status approved` | no antes |
| A15 consult Grok 1.0.5 (fuera de 029) | Lead | siguiente grupo higiene | no este retro |

## Cierre del feature (verification gate — no ejecutado)

- [ ] `spec.md` — no existe; solo si apruebas el residual
- [ ] `tasks/index.md` frontmatter `status: draft` → closed **después** de tu OK
- [ ] US{N}.md frontmatters — residual close **después** de tu OK (si alguno no está `closed`, lección Phase 3)
- [ ] `state.json` — `retro_status: pending` (este paso). `feature_closed` sigue false
- [ ] este retro `status: open` hasta que revises
- [ ] no commit de cierre de feature en este paso

Pending your approval:

- ⚪ Promotions (G8 lessons / evals live / flow-state status docs)
- ⚪ Living-spec residual `spec.md`
- ⚪ Commandment actions (solo las de la tabla)
