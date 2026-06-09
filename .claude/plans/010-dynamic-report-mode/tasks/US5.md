---
us: US5
title: Charts híbridos — SVG estilo-Plot + tooltip + fallback (Plot opcional)
wave: W3
depends_on: [US3]
tdd_mode: forced
estimate: M
status: closed
approved:
absorbs_decision: charts-hibrido
---

# US5 — Charts híbridos

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W3 |
| **Depends on** | [US3] |
| **Blocks** | US6 |
| **Files touched** | `.claude/skills/html-report/scripts/charts.ts`, `.claude/skills/html-report/scripts/charts.test.ts` |
| **TDD-mode** | forced (lógica de escala/proyección de datos) |
| **Estimate** | M |
| **Cómo arrancar** | Test: `scale(domain,range,v)` mapea correctamente; `bar(series)` emite `<svg>` con barras proporcionales |
| **Decisión absorbida** | charts-híbrido |

## User story

- **As a**: autor del informe
- **I want**: ≥2 tipos de gráfico reales con tooltip, self-contained
- **So that**: el informe muestra datos (no solo una barra) y deja de "verse pobre"

## Acceptance criteria

- **AC1**: Given `bar(series)` y `line(series)` (o `donut`), when se renderizan, then emiten **SVG inline** con escalas/ticks/paleta estilo Observable Plot (tokens del theme), `role="img"` + `aria-label`, tabular-nums.
- **AC2**: Given un chart con JS, when el usuario hace **hover**, then aparece **tooltip** con el valor exacto; **sin JS**, el valor es accesible (aria-label + tabla/etiquetas visibles) — fallback.
- **AC3 (híbrido)**: Given `npx`/Observable Plot disponible, when se invoca con `--plot`, then usa Plot en gen-time e inlina el SVG; por defecto (sin flag o sin red) usa el render a mano — **el artefacto final no depende de Plot**.
- **AC4 (TDD)**: `charts.test.ts` cubre la función de escala (dominio→rango) y que `bar()` produce N rects para N puntos con anchos proporcionales.

## Files a crear / a modificar

| Path | Contenido |
|---|---|
| `.claude/skills/html-report/scripts/charts.ts` | `scale()`, `bar()`, `line()`/`donut()` (SVG a mano) + hook opcional `plotInline()` si `npx` disponible |
| `.claude/skills/html-report/scripts/charts.test.ts` | Tests red→green de AC4 |

## Workflow detallado

1. **Red**: `charts.test.ts` con asserts de escala + nº de rects → falla.
2. **Green**: `scale()` + `bar()`/`line()` SVG con defaults estilo-Plot (ticks, gridlines sutiles, paleta tokens).
3. Tooltip JS (delegación de eventos) + fallback (aria-label + valores).
4. Hook `--plot`: si `command -v npx` y red, correr Observable Plot y capturar el SVG; si falla → fallback a mano (nunca romper).

## Drillme (Socratic check)

1. `[approach]` ¿SVG a mano por defecto y Plot opcional? → constraint dura exige self-contained garantizado; Plot es mejora, no dependencia.
2. `[failure]` ¿Y si `npx` falla a mitad? → try/catch → fallback a mano; el artefacto nunca queda roto.
3. `[context]` ¿Los charts heredan la paleta? → sí, desde `theme.ts` (US2), no hex crudos (anti-slop).

## Commandments cubiertos

| # | Cómo |
|---|---|
| II | Fallback determinista; Plot solo si verificablemente disponible |
| III | A mano = simple y suficiente; Plot opt-in evita dependencia dura |
| IV | TDD forced en la lógica de escala |

## Verificación post-implementación

- Smoke: `bar([...])` abre en navegador con tooltip al hover; sin JS, valores legibles.
- `bun test .claude/skills/html-report/scripts/charts.test.ts` verde.
