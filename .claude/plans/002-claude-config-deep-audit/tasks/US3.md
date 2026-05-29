---
us: US3
title: Rúbrica scoring 0-10 con anchors literales por las 14 categorías
wave: W1
depends_on: []
tdd_mode: skip
estimate: M
status: closed
absorbs_decision: 14-categorias-hibridas-ratificadas-usuario
---

# US3 — Rúbrica scoring 0-10 con anchors literales por las 14 categorías

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W1 |
| **Depends on** | none |
| **Blocks** | [US4] |
| **Files touched** | `build/rubric.md` (crear) |
| **TDD-mode** | skip: validations.md = oracle |
| **Estimate** | M (1 sesión — diseño de criterios) |
| **Cómo arrancar** | Definir las 14 categorías + para cada una, anchors literales 0/5/10 |
| **Decisión absorbida** | 14 categorías híbridas ratificado usuario (BLOCKER perspectives asumido como score paralysis risk) |

## User story

- **As a**: Oriol
- **I want**: una rúbrica explícita 0-10 con anchors literales por categoría
- **So that**: el scoring (US4) es trazable, re-ejecutable en futuros audits (AC7), y discrepable con evidencia (no intuición)

## Acceptance criteria

- **AC1**: Given las 14 categorías declaradas en spec, when se diseña la rúbrica, then cada categoría tiene 3 anchors literales: `0 = <qué hace un 0 concreto>`, `5 = <qué hace un 5 concreto>`, `10 = <qué hace un 10 concreto>`. Cada anchor en ≤2 líneas.
- **AC2**: Given los anchors, when se redactan, then son **operativos** (testeable contra evidencia concreta), no aspiracionales ("excelente / bueno / malo" NO sirve).
- **AC3**: Given que la rúbrica debe ser re-ejecutable (AC7 spec), when un segundo audit aplique la misma rúbrica en 3 meses, then los anchors deben ser interpretable sin contexto adicional del primer audit.
- **AC4**: Given las 14 categorías, when se redactan, then se ordenan por importancia (workflow > skills > agents > hooks > rules > output-styles > meta-system).
- **AC5**: Given la rúbrica, when se cierra, then incluye sección "Cómo puntuar" con protocolo: (a) listar evidencias, (b) mapear a anchor más cercano, (c) interpolar entre anchors si necesario (1-4, 6-9 calibrar).

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/plans/002-claude-config-deep-audit/build/rubric.md` | Rúbrica 14 categorías con anchors literales 0/5/10 |

## Workflow detallado

1. Listar las **14 categorías** definitivas:
   - **Workflow (5 fases)**: 1. Scope, 2. Tech-plan, 3. TDD-design, 4. Build, 5. Critic, 6. Retro (= 6 sub, contado como 1 categoría con sub-scores) — DECISIÓN ALT: contar como 1 con sub o 6 separadas. Spec dice 14 = 5 fases + 9 transversales → cada fase es 1 categoría → 5 + 9 = 14 ✓.
   - **Workflow phases (5)**: Scope, Tech-plan, TDD-design, Build, Critic+Retro (combinado para llegar a 5 dado el spec dice 5 fases incluyendo retro como parte de critic-retro pair). RECONSIDERAR: spec dice "5 fases" implícitamente incluyendo retro como 6ª. Decisión: usar 6 fases (scope/tech-plan/tdd-design/build/critic/retro) como 6 categorías + 8 transversales = 14. Alineado con CLAUDE.md §Mental model.
   - **Transversales (8)**: 7. Skills system (cobertura+overlap+freshness), 8. Agent strategy (KEEP-cond+model assign+delegation), 9. Hooks reliability, 10. Rules & output-styles, 11. Templates & state persistence, 12. Anti-hallucination + security, 13. Observability (reactive ad-hoc per Commandment IX), 14. Meta-system maintenance (Commandment X).

2. Para cada categoría, redactar anchors literales:
   - **0 = falla total** (concreto: e.g., "skill no existe / no se invoca / falla 100% de las veces")
   - **5 = funcional pero con gaps** (concreto: e.g., "skill existe, funciona en happy path, pero N edge cases sin manejar")
   - **10 = excelencia** (concreto: e.g., "skill existe, funciona, edge cases manejados, documentada, drillme-compliant, sin solapamiento con otras")

3. Redactar sección "Cómo puntuar":
   - Paso 1: listar 2-3 evidencias concretas del componente.
   - Paso 2: mapear evidencias contra anchors 0/5/10.
   - Paso 3: ubicar en escala (si entre 5 y 10 → 6/7/8/9 según proximidad).
   - Paso 4: justificar en ≥3 líneas. Cita anchors usados.

4. Anti-pattern protección: redactar sección "Anti-patterns de scoring a evitar":
   - Score sin anchor referenciado → invalida
   - Evidencia subjetiva ("se siente bien") → invalida
   - Score 10 sin ≥3 evidencias concretas → review obligatorio

5. Verificar que la rúbrica completa sea ≤1500 palabras (legibilidad).

## Drillme (Socratic check)

| Categoría | Pregunta |
|---|---|
| `[location]` | ¿Algunas categorías solapan (e.g., "Skills system" vs sub-fase "Scope skill")? Resolución: la fase puntúa la skill desde su rol en workflow; "Skills system" puntúa cobertura+overlap+freshness agregado. Eje distinto. |
| `[approach]` | ¿Por qué 0/5/10 y no 0/3/7/10? 0/5/10 es el mínimo viable para anchors literales; 4 anchors duplica trabajo sin proporcional señal. Interpolación 1-4 y 6-9 cubre matiz. |
| `[context]` | ¿La rúbrica debe ponderar categorías (e.g., Build vale 20% del total)? Decisión: NO pesar — el score por categoría es lo accionable; promedio agregado se reporta SI no oculta variabilidad. |
| `[failure]` | ¿Qué pasa si una categoría no aplica (e.g., "Templates" si no hay templates)? Marcar `N/A` con justificación, NO puntuar 0 (sería penalizar ausencia legítima). |

## Commandments cubiertos

| # | Cómo |
|---|---|
| III | Anchors literales evitan "score paralysis" alegado por perspectives (rúbrica clara → decisión clara) |
| IV | Rúbrica = gate funcional (sin ella el scoring AC3 no se puede cerrar) |
| IX | Re-ejecutabilidad = observability del propio sistema (segunda medición comparable) |
| X | Mantenibilidad del audit-protocol: rúbrica como artefacto reutilizable |

## Smell signals

- ⚠️ Anchor 0 idéntico a anchor 5 en >2 categorías → diseño defectuoso
- ⚠️ Categoría con anchor 10 inalcanzable por design → ajustar a "máxima realista" o eliminar categoría
- ⚠️ Sección "Cómo puntuar" tiene >5 pasos → simplificar

## Verificación post-implementación

- Smoke: 14 categorías × 3 anchors = 42 anchors literales. Contar.
- Cada anchor ≤2 líneas (legibilidad).
- Sección "Cómo puntuar" en ≤5 pasos.
- Aplicar a 1 categoría de muestra durante el diseño para validar anchors funcionan.

## Open questions (a resolver en implementación)

- ¿Combinar critic+retro en 1 categoría o 2? Decisión sugerida: 2 separadas para mantener 14 = 6+8. Re-confirmar en implementación.
- ¿Cómo manejar categorías con poco material (e.g., output-styles = 1 archivo)? Anchors igual aplicables pero scoring será corto. Aceptable.
