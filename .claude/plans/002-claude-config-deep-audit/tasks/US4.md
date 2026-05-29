---
us: US4
title: Aplicar scoring 0-10 a las 14 categorías con evidencia trazable
wave: W2
depends_on: [US1, US3]
tdd_mode: skip
estimate: L
status: closed
---

# US4 — Aplicar scoring 0-10 a las 14 categorías con evidencia trazable

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W2 |
| **Depends on** | [US1, US3] |
| **Blocks** | [US6, US7] |
| **Files touched** | `build/scoring.md` (crear) |
| **TDD-mode** | skip: validations.md = oracle |
| **Estimate** | L (1 sesión larga — 14 cat × ≥2 evidencias) |
| **Cómo arrancar** | Read `build/inventory.md` + `build/rubric.md`; iterar las 14 categorías aplicando protocolo "Cómo puntuar" |
| **Decisión absorbida** | — |

## User story

- **As a**: Oriol
- **I want**: scores 0-10 por cada categoría con evidencia trazable y justificación ≥3 líneas
- **So that**: el report final (US7) puede exponer scoring detallado y re-ejecutable (AC7)

## Acceptance criteria

- **AC1**: Given las 14 categorías del rubric, when se puntúa cada una, then el score tiene OBLIGATORIO: (a) score numérico 0-10, (b) ≥2 evidencias citadas con path interno (formato `.claude/...#linea`) O URL externa, (c) justificación ≥3 líneas mapeando evidencias a anchors, (d) anchor literal usado citado (`anchor:0|5|10|interp-N`).
- **AC2**: Given Commandment I (radical honesty), when un score sería ≥9, then requiere ≥3 evidencias (no 2) — el 9-10 exige fundamentación adicional.
- **AC3**: Given que la rúbrica permite N/A (US3 AC drillme failure), when una categoría no aplica, then se marca `N/A` con ≥2 líneas justificando porqué (no penalizar 0).
- **AC4**: Given scoring completo, when se cierra, then incluye sección "Distribución" con (a) mean score, (b) median, (c) min/max, (d) count de N/A.
- **AC5**: Given AC8 spec (honestidad radical), when scoring promedio >8.0 sin ≥1 hallazgo crítico negativo, then se reabre review obligatorio: ¿es realmente excelente o estamos auto-felicitando? Documentar verdict.

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/plans/002-claude-config-deep-audit/build/scoring.md` | 14 categorías scored con evidencias |

## Workflow detallado

1. Read `build/inventory.md` (US1) + `build/rubric.md` (US3). Verificar ambos approved/completos.
2. Para cada una de las 14 categorías (en orden de rubric):
   a. Recoger 2-3+ evidencias del inventario / del código fuente vía Read directo.
   b. Mapear evidencias contra anchors 0/5/10 del rubric.
   c. Asignar score (interpolar 1-4 o 6-9 si necesario).
   d. Justificar ≥3 líneas: "Evidencia X muestra Y → mapea a Z anchor → score N porque ...".
   e. Si score ≥9 → añadir 3ª evidencia.
   f. Si N/A → justificar.
3. Compute distribución: mean, median, min, max, count(N/A).
4. **Honestidad check (AC5)**: si mean >8.0 y todos los scores ≥7 → re-evaluate. ¿Hay categoría infraevaluada? ¿Hay hallazgo crítico que el optimismo ocultó? Documentar verdict en sección dedicada.
5. Generar `build/scoring.md` con tabla por categoría (`# | Categoría | Score | Anchor used | Evidence-1 | Evidence-2 | Justificación`).

## Drillme (Socratic check)

| Categoría | Pregunta |
|---|---|
| `[location]` | ¿Una evidencia debe ser de path interno O URL externa O ambas? Decisión: al menos 1 path interno (es scoring DEL sistema); URLs solo cuando se compara con corpus externo. |
| `[approach]` | ¿Aplicar rúbrica linealmente o iterar (puntuar todas, revisar, ajustar)? Linear primera pasada + sección "Honestidad check" como segunda pasada — captura sesgos. |
| `[context]` | ¿Cómo manejar categorías que solapan (e.g., Skills system + sub-skills puntuadas en fases)? El score de "Skills system" agrega; el score de fase puntúa la skill EN SU ROL. Citas cruzadas permitidas. |
| `[failure]` | ¿Qué pasa si la evidencia para una categoría no existe (e.g., "Observability" no tiene componente)? Score bajo legítimo (no inventar evidence); o N/A si la ausencia es decisión consciente (Commandment IX = "reactive ad-hoc" justifica scoring no-bajo). |

## Commandments cubiertos

| # | Cómo |
|---|---|
| I | Honestidad check AC5 detecta self-congratulation pattern |
| II | Cada score con evidencia trazable (path interno o URL verified) |
| IV | AC2 hard gate interno: score ≥9 requires ≥3 evidencias |
| IX | Re-ejecutabilidad permite "observability del propio audit-protocol" |

## Reutiliza

- `anti-hallucination` skill — per evidencia cita
- Read tool extensivo (cada categoría requiere lectura de componentes inventoriados)

## Adaptación intra-fase

| Señal | Adaptación |
|---|---|
| Categoría con >5 evidencias disponibles | Seleccionar las 3 más representativas; documentar criterio |
| Mean score >8.0 al primer pass | Activar AC5 honestidad check obligatorio |
| Score ≥9 en >5 categorías | Suspect self-congratulation; trigger AC5 con prioridad |

## Smell signals

- ⚠️ Justificación <3 líneas → invalida score, redo
- ⚠️ Evidencia citada que no existe en inventory (hallucination) → BLOCKER
- ⚠️ Todos los scores ≥8 → AC5 trigger obligatorio

## Verificación post-implementación

- Smoke: contar 14 scores (o 13 + 1 N/A) — no menos, no más.
- Cada score tiene ≥2 evidencias citadas (≥3 si score ≥9).
- Cada anchor usado existe en `build/rubric.md` (cross-reference).
- Justificación ≥3 líneas por score.

## Open questions (a resolver en implementación)

- ¿Si AC5 honestidad check no encuentra hallazgo negativo legítimo, qué hacer? Documentar el non-finding como "sistema genuinamente sólido en esta dimensión" — pero requiere verdict de critic Phase 4.
