---
us: US2
title: Visualizaciones SVG-first (diagram + chart) + ruta JS opt-in para complejos
wave: W1
depends_on: []
tdd_mode: optional
estimate: M
status: closed
absorbs_decision: diagramas-hibrido-svg-first
---

# US2 — Visualizaciones SVG-first

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W1 |
| **Depends on** | none |
| **Blocks** | [US3, US5] |
| **Files touched** | `.claude/skills/html-report/references/visuals-svg-first.md` (nuevo) |
| **TDD-mode** | optional |
| **Estimate** | M |
| **Cómo arrancar** | Catalogar los patrones de diagrama/chart que un reporte/decisión necesita y componer SVG inline de ejemplo |
| **Decisión absorbida** | híbrido SVG-a-mano-first; JS opt-in declarado |

## User story

- **As a**: Oriol presentando reportes/decisiones
- **I want**: poder embeber diagramas (flujo, comparativa) y charts de datos en el documento
- **So that**: la información se entiende visualmente de un vistazo, manteniéndose self-contained

## Acceptance criteria

- **AC1**: Given un flujo o comparativa simple, when se genera, then se embebe como **SVG inline compuesto a mano** (sin runtime, sin red) — patrón reproducible documentado.
- **AC2**: Given datos cuantitativos, when se grafican, then se usan barras/comparación en **SVG/CSS** (estilo de gauge/sevbar existentes), color=información.
- **AC3**: Given un diagrama **complejo** que no es razonable a mano, when se decide, then se documenta la ruta **JS opt-in** (`mermaid.js`) con su trade-off (rompe self-contained: CDN=red o bundle inline) y cuándo es aceptable.
- **AC4**: Given el entorno (mmdc/npx/node ausentes — verificado), when se planifica el pipeline, then NO se asume auto-render; el generador compone el SVG.

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/skills/html-report/references/visuals-svg-first.md` | Patrones + ejemplos SVG inline (flowchart simple, comparativa, barras), CSS, y la regla de decisión SVG-a-mano vs JS opt-in |

## Workflow detallado

1. Inventariar tipos de visual necesarios: flujo (pasos→), comparativa (A vs B), barras/score, matriz (para decisión — la consume US3).
2. Componer 1 ejemplo SVG inline por tipo (viewBox + geometría literal, tokens para color), accesible (`role="img"` + `aria-label`).
3. Escribir la **regla de decisión**: SVG-a-mano si ≤N nodos/aristas simples; JS opt-in (mermaid.js) si complejo — declarar dependencia.
4. Validar contra anti-slop (no chartjunk, no gradientes, color=info).

## Drillme (Socratic check)

1. `[approach]` ¿Por qué SVG-a-mano y no siempre mermaid.js? → self-contained/cliente-ready/offline (Cmd III + spec AC2/AC4); mmdc ausente.
2. `[failure]` ¿Qué pasa con un diagrama de 30 nodos? → supera el SVG-a-mano razonable → ruta JS opt-in declarada (Open question #2 calibra el límite).
3. `[context]` ¿Cómo lo consume US3 (decision)? → la matriz de scoring reusa el componente chart de aquí (cross-cutting, evita duplicar — Cmd X).

## Commandments cubiertos

| # | Cómo |
|---|---|
| II | Decisión basada en verificación real del entorno (mmdc ausente), no suposición |
| III | SVG-a-mano self-contained antes que dependencia JS pesada |
| VII | Reusa el patrón SVG/CSS ya probado (gauge/sevbar) |

## Verificación post-implementación

- Smoke: los SVG de ejemplo renderizan offline (red desactivada) y pasan anti-slop.
- `bun test ./.claude/hooks/` sigue verde.

## Open questions (a resolver en implementación)

- Límite práctico de complejidad SVG-a-mano vs salto a JS (calibrar con ejemplos).
