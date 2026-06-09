---
us: US1
title: Corregir el env-fact obsoleto en visuals-svg-first.md
wave: W1
depends_on: []
tdd_mode: skip
estimate: S
status: closed
approved:
---

# US1 — Corregir el env-fact obsoleto en visuals-svg-first.md

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W1 |
| **Depends on** | `none` |
| **Blocks** | `none` (independiente) |
| **Files touched** | `.claude/skills/html-report/references/visuals-svg-first.md` |
| **TDD-mode** | skip: doc-only change, no testable behavior |
| **Estimate** | S |
| **Cómo arrancar** | Editar el bloque "Environment fact" con lo verificado 2026-06-08 |
| **Decisión absorbida** | — |

## User story

- **As a**: generador de informes (y el skill)
- **I want**: que el fact del entorno en `visuals-svg-first.md` sea verídico
- **So that**: la decisión SVG-by-hand vs JS-opt-in se tome sobre realidad, no sobre un dato caducado

## Acceptance criteria

- **AC1**: Given `references/visuals-svg-first.md`, when se lee el bloque "Environment fact", then refleja que `node`/`npx`/`bunx`/`bun`/`pandoc` ESTÁN presentes (verificado 2026-06-08) y `typst`/`weasyprint`/`chromium` ausentes.
- **AC2**: Given la "Decision rule", when se consulta, then el JS-opt-in deja de justificarse en "no hay runtime" y pasa a justificarse en self-containment/simplicidad (Cmd III); SVG-by-hand sigue siendo el default por self-containment, no por ausencia de node.

## Files a crear / a modificar

| Path | Cambio |
|---|---|
| `.claude/skills/html-report/references/visuals-svg-first.md` | Reescribir el bloque "Environment fact" + ajustar la justificación de la decision rule |

## Workflow detallado

1. Leer el bloque actual (línea ~11) y la tabla de decisión.
2. Sustituir el fact por el verificado (con fecha 2026-06-08) + nota de que ahora existe la opción "generador en gen-time".
3. Ajustar la decision rule: el default SVG-a-mano persiste por self-containment del artefacto, no por carencia de runtime.

## Commandments cubiertos

| # | Cómo |
|---|---|
| II | Corrige un fact falso con verificación directa (gh-less, `command -v`) |
| X | Mantiene el skill sin datos obsoletos (no rota) |

## Verificación post-implementación

- Smoke: `grep "NOT available" visuals-svg-first.md` ya no afirma node/npx ausentes.
- `bun test ./.claude/hooks/` sigue 100/100 (no toca hooks).
