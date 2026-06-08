---
us: US3
title: decision.template.html — layout decisión (opciones + scoring ponderado + recomendación)
wave: W2
depends_on: [US1, US2]
tdd_mode: optional
estimate: M
status: closed
absorbs_decision: OQ2-layout-decision
---

# US3 — decision.template.html

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W2 |
| **Depends on** | [US1, US2] |
| **Blocks** | [US4, US5] |
| **Files touched** | `.claude/skills/html-report/templates/decision.template.html` (nuevo) |
| **TDD-mode** | optional |
| **Estimate** | M |
| **Cómo arrancar** | Reusar el token block + lenguaje de US1 (glance) + componente matriz/chart de US2; estructurar para "decisión" |
| **Decisión absorbida** | OQ2 — nuevo layout decision (no generalizar dashboard) |

## User story

- **As a**: Oriol tomando una decisión (dev o no-dev: monitor, PC, zapatos)
- **I want**: un documento que compare opciones con criterios ponderados y dé una recomendación clara
- **So that**: pueda decidir de un vistazo y/o enseñárselo a alguien

## Acceptance criteria

- **AC1**: Given N opciones y M criterios, when se genera, then muestra una **matriz comparativa** (opciones × criterios) + **scoring ponderado** + **recomendación destacada** above-the-fold (spec AC3).
- **AC2**: Given el documento, when se inspecciona, then **reusa el token block dark canónico de US1 verbatim** y el componente matriz/chart de US2 (Cmd X — no re-autorar).
- **AC3**: Given pros/contras por opción, when se listan, then usan el lenguaje visual aprobado (cards/chips, color=info), legible de un vistazo.
- **AC4**: Given el archivo, when se abre, then es self-contained (SVG-first para la matriz visual; sin JS salvo opt-in declarado).

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/skills/html-report/templates/decision.template.html` | Nuevo template: masthead + recomendación destacada + matriz opciones×criterios (scoring ponderado, SVG/CSS) + pros/contras por opción + criterios y pesos |

## Workflow detallado

1. Inlinar el token block dark canónico de US1 (verbatim) + cargar el componente matriz/chart de US2.
2. Estructurar: (a) recomendación + confianza arriba, (b) matriz opciones×criterios con score ponderado por celda + total, (c) detalle por opción (pros/contras), (d) criterios + pesos.
3. Parametrizar con `{{PLACEHOLDERS}}` (QUESTION, OPTIONS, CRITERIA, WEIGHTS, SCORES, RECOMMENDATION, CONFIDENCE).
4. Validar pre-flight + anti-slop; comprobar que un caso no-dev (ej. monitores) se lee de un vistazo.

## Drillme (Socratic check)

1. `[location]` ¿Layout nuevo o variante del dashboard? → nuevo (OQ2): la decisión tiene estructura propia (matriz ponderada) que el dashboard no encaja.
2. `[approach]` ¿Scoring ponderado cómo se visualiza sin chartjunk? → matriz + barras SVG por criterio, color=info, no gradientes.
3. `[context]` ¿Cómo lo consume `decide` (US4)? → `decide` rellena este template con sus 3 perspectivas/síntesis.

## Commandments cubiertos

| # | Cómo |
|---|---|
| III | Reusa tokens/componentes; no duplica |
| V | Estructura el "qué decidir" antes del cómo presentarlo |
| X | Token block + componente matriz reusados verbatim |

## Reutiliza

- US1 token block dark; US2 componente matriz/chart.

## Verificación post-implementación

- Smoke: rellenar con un caso real (ej. 3 monitores × 5 criterios) → recomendación clara de un vistazo, self-contained.
- `bun test ./.claude/hooks/` sigue verde.
