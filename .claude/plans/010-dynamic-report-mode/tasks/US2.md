---
us: US2
title: Contrato de datos JSON + tokens de diseño (jerarquía editorial)
wave: W1
depends_on: []
tdd_mode: optional
estimate: M
status: draft
approved:
---

# US2 — Contrato de datos JSON + tokens de diseño

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W1 |
| **Depends on** | `none` |
| **Blocks** | US3 |
| **Files touched** | `.claude/skills/html-report/scripts/contract.ts`, `.claude/skills/html-report/scripts/theme.ts` |
| **TDD-mode** | optional |
| **Estimate** | M |
| **Cómo arrancar** | Definir el tipo `ReportData` con los bloques que un informe necesita |
| **Decisión absorbida** | — |

## User story

- **As a**: Claude (productor de datos) y el generador (consumidor)
- **I want**: un contrato de datos tipado + un sistema de tokens de diseño con jerarquía editorial
- **So that**: emitir un informe = rellenar un JSON; el diseño (no-IA, Tufte-like) vive una sola vez

## Acceptance criteria

- **AC1**: Given `contract.ts`, when se define `ReportData`, then cubre: `meta` (título, kicker, fecha, verdict), `sections[]`, `callouts[]`, `tables[]` (con flag filtrable), `charts[]` (series), `sidenotes[]` y `kpis[]` — suficiente para un informe de estado/audit/retro.
- **AC2**: Given `theme.ts`, when se exportan los tokens CSS, then hay set **light Y dark** con contraste body ≥4.5:1 en ambos, jerarquía tipográfica diferenciada (display serif + sans + mono), y NO la monotonía de "todo cajas iguales" (define superficies con pesos distintos).
- **AC3**: Given el contrato, when falta un campo opcional, then el generador puede omitir ese bloque sin romper (campos opcionales explícitos).

## Files a crear / a modificar

| Path | Contenido |
|---|---|
| `.claude/skills/html-report/scripts/contract.ts` | Tipos TS de `ReportData` + sub-tipos (Section, Callout, Table, Chart, Sidenote, Kpi) |
| `.claude/skills/html-report/scripts/theme.ts` | Función que devuelve el bloque CSS de tokens (light+dark) — reusa la paleta editorial del skill (warm paper / deep teal) y la dark de glance, sin purple |

## Workflow detallado

1. Glob/Read `templates/tokens.css` + glance dark tokens → reusar valores (no reinventar paleta).
2. Definir `contract.ts` con tipos opcionales claros.
3. Definir `theme.ts` con tokens light+dark + escala tipográfica + superficies con jerarquía (no uniforme).

## Drillme (Socratic check)

1. `[approach]` ¿Por qué TS y no JSON-schema puro? → tipos dan autocompletado + el generador es bun/TS (coherencia).
2. `[context]` ¿Reusa la paleta existente o inventa? → reusa `tokens.css` + glance (Cmd II/X).
3. `[failure]` ¿Qué pasa si el JSON trae un chart sin datos? → tipo obliga series no vacías o el generador lo omite (US5).

## Commandments cubiertos

| # | Cómo |
|---|---|
| III | Contrato mínimo cubre lo común; campos opcionales evitan sobre-modelar |
| X | Reusa tokens del skill; no duplica paleta |

## Verificación post-implementación

- Smoke: `bun -e "import('./.claude/skills/html-report/scripts/contract.ts')"` compila sin error de tipos.
- `theme.ts` devuelve CSS con ambos esquemas (grep `prefers-color-scheme` o toggle-class).
