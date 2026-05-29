---
us: US6
title: Top-10 hallazgos accionables priorizados + Quick-wins separados
wave: W3
depends_on: [US4, US5]
tdd_mode: skip
estimate: M
status: closed
---

# US6 — Top-10 hallazgos accionables priorizados + Quick-wins separados

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W3 |
| **Depends on** | [US4, US5] |
| **Blocks** | [US7] |
| **Files touched** | `build/findings.md` (crear) |
| **TDD-mode** | skip: validations.md = oracle |
| **Estimate** | M (1 sesión) |
| **Cómo arrancar** | Read `build/scoring.md` + `build/cross-analysis.md`; consolidar a top-10 |
| **Decisión absorbida** | AC4 spec — formato canónico de hallazgo accionable |

## User story

- **As a**: Oriol
- **I want**: top-10 hallazgos accionables priorizados con formato directo a `/flow`
- **So that**: el report (US7) facilita decidir próximos sprints sin re-análisis adicional

## Acceptance criteria

- **AC1**: Given `scoring.md` + `cross-analysis.md`, when se consolida, then se produce un top-10 hallazgos seleccionados de fuente mixta: (a) scores bajos (puntos débiles internos), (b) gaps HIGH-applicability, (c) oportunidades HIGH-applicability, (d) innovations con verdict "reinvento mal hecho".
- **AC2**: Given cada hallazgo en el top-10, when se documenta, then tiene formato canónico OBLIGATORIO en tabla:
   - `# | Hallazgo (descriptivo ≤80 chars) | Tipo (gap|opp|anti-pattern|low-score|reinvent) | Severity (BLOCKER|MAJOR|MINOR|NIT) | Acción (verb-first, ≤80 chars) | Effort (S|M|L) | /flow command sugerido`
- **AC3**: Given AC2, when se prioriza, then orden es por: (1) Severity (BLOCKER > MAJOR > MINOR > NIT), (2) Effort (S preferido sobre L a igual severity), (3) Aplicabilidad HIGH inheritada de US5 si aplica.
- **AC4**: Given Quick-wins separados (spec AC4), when se identifican, then tabla aparte con criterio: `Effort = S AND Severity ∈ {MAJOR, MINOR}`. Quick-wins máximo 5; pueden solapar con top-10 (no duplicar).
- **AC5**: Given AC8 spec (honestidad radical), when el top-10 carece de ≥1 BLOCKER o MAJOR negativo legítimo, then re-evaluar: ¿estamos suavizando? Documentar verdict.
- **AC6**: Given cada `/flow command sugerido`, when se redacta, then es ejecutable literalmente (e.g., `/flow --standard "CUT meta-create skill por solapamiento con orchestrator-protocol — validar primero con drillme"`).

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/plans/002-claude-config-deep-audit/build/findings.md` | Top-10 + Quick-wins en formato canónico |

## Workflow detallado

1. Read `build/scoring.md` + `build/cross-analysis.md`. Verificar AC5 cumplido en US4 (no self-congratulation).
2. **Candidate pool**: extraer candidates:
   - Scores ≤5 en US4 → low-score candidates
   - Gaps HIGH-applicability en US5 → gap candidates
   - Oportunidades HIGH-applicability en US5 → opp candidates
   - Innovations verdict "reinvento" → anti-pattern candidates
3. Asignar Severity a cada candidate:
   - **BLOCKER**: rompe Commandments o blocking workflow (e.g., skill no funciona, hook security gap)
   - **MAJOR**: degrade significativo de quality/cost (e.g., score 4 en Critic phase)
   - **MINOR**: friction tangible (e.g., template missing field)
   - **NIT**: polish, no funcional
4. Asignar Effort:
   - **S**: ≤2 archivos, ≤1h
   - **M**: 3-5 archivos, 1-4h
   - **L**: >5 archivos OR architectural change
5. Ordenar por (Severity, Effort, Aplicabilidad). Tomar top-10.
6. Para cada top-10: redactar Acción verb-first (CUT, ADD, REFACTOR, DOCUMENT, VALIDATE, MEASURE, etc.) + `/flow command sugerido` ejecutable.
7. Identificar Quick-wins (criterio AC4) — max 5, pueden ser subset del top-10.
8. **AC5 honestidad check**: si top-10 carece de BLOCKER/MAJOR negativo, escalar: ¿se está suavizando? Documentar.
9. Generar `build/findings.md` con 2 tablas (top-10 + quick-wins) + sección verdicts.

## Drillme (Socratic check)

| Categoría | Pregunta |
|---|---|
| `[location]` | ¿El top-10 debe priorizar gaps externos o low-scores internos? Mixto — gaps con HIGH-applicability tienen prioridad sobre low-scores en categorías de baja importancia. |
| `[approach]` | ¿Por qué 10 y no 5 o 15? 10 = decisión drillme D4 usuario. 5 muy selectivo (puede omitir hallazgos relevantes); 15 excede capacidad de implementación realista (action items reales por sprint). |
| `[context]` | ¿Cómo manejar hallazgos interdependientes (uno bloquea otro)? Documentar `depends_on: [hallazgo-id]` en columna extra si aplica; orden top-10 honra dependencias. |
| `[failure]` | ¿Qué pasa si Quick-wins resultan ser todos NIT (irrelevantes)? Reducir Quick-wins a <5 o vacío; mejor honesto que inflar. |

## Commandments cubiertos

| # | Cómo |
|---|---|
| I | AC5 honestidad check vs suavización |
| III | Quick-wins separados = "no siempre más es más"; los pequeños se atacan primero |
| IV | Formato canónico (AC2) = gate de calidad del hallazgo |
| VII | `/flow command sugerido` = pre-loaded para próximo sprint, sin re-analysis |

## Smell signals

- ⚠️ Top-10 todos MINOR/NIT → re-evaluar pool (probablemente low-score candidates ignorados)
- ⚠️ Top-10 todos BLOCKER → suspect inflation; valida severity con drillme
- ⚠️ `/flow command sugerido` genérico ("revisar X") → no es ejecutable; reformular concreto

## Verificación post-implementación

- Smoke: exactamente 10 hallazgos en top (o documentar honestamente <10 si pool insuficiente).
- Cada uno con 7 columnas del formato AC2.
- Quick-wins ≤5.
- AC5 verdict presente.

## Open questions (a resolver en implementación)

- ¿Si BLOCKER finding aparece, debe interrumpir el audit y triggear /flow inmediato? Decisión sugerida: NO — completa audit + report; el BLOCKER tendrá prioridad 1 en post-report decisions.
- ¿Innovation "reinvento mal hecho" tiene severity especial? Decisión sugerida: típicamente MAJOR (architectural debt) pero depende del componente.
