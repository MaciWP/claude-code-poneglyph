---
spec: 010-dynamic-report-mode
tasks_implemented: [US1, US2, US3, US4, US5, US6]
oracle_source: tests.md + validations.md
phase: 4
status: closed
review_level: full (código bun + docs → Security N/A; pase independiente = advisor, no reviewer-Opus)
verdict: APPROVED_WITH_WARNINGS
findings_count:
  blocker: 0
  major: 1
  minor: 3
  nit: 2
reviewer_agent_invoked: no
security_review_invoked: n/a
---

# Review — modo dynamic (generador) de html-report

## Veredicto

**APPROVED_WITH_WARNINGS** — el generador funciona end-to-end (10 tests verdes, hooks 100/100, demo self-contained 1 `<style>`). Corrige los 3 MAJOR del glance: data-viz real (2 charts SVG), jerarquía no-cajas (sidenotes Tufte), y **contraste — MEDIDO y corregido** (light `--ink-3` fallaba 3.64:1 → `#6b675d` 5.64:1). **Warning principal**: el "híbrido" de charts (US5.AC3, que TÚ elegiste) está **0% cableado** — `plotInline()` ni se importa en `render.ts` (dead code); todos los charts usan el render a mano. Hand-only es defendible (self-contained + low-token) pero NO es el híbrido prometido — **es tu decisión** (ver Next step), no algo que yo re-encuadre. **AC6 ("se nota") pendiente de tu validación visual** (demo abierto) — el cierre está GATED en eso.

## ¿Resuelve el problema del spec?

Sí, estructuralmente. El problema era "informes pobres/IA + generación cara/inconsistente". El generador: (a) emite data-viz real (charts SVG con tooltip) vs la única barra del glance; (b) rompe la monotonía de cajas (secciones hairline + sidenotes Tufte); (c) sube `--ink-3` (contraste); (d) baja tokens (datos JSON ~80 líneas vs ~700 HTML a mano). La validación final de "se nota" es tuya (AC6).

## AC trace (spec → entregado)

| AC | Estado | Evidencia |
|---|---|---|
| AC1 self-contained + responsive | ✅ / ⚠️ | 1 `<style>`, 0 `<script src http>`; responsive por media-queries (verificado estructural, no en render real — no tengo browser) |
| AC2 ≥2 viz + tooltip + fallback | ✅ | 2 charts bar; tooltip vía `<title>` SVG (funciona aun sin JS); fallback aria-label + valores visibles |
| AC3 nav sticky + scrollspy + colapsables | ✅ | IntersectionObserver + `<details>` |
| AC4 filtros/búsqueda | ✅ | `tableFilterable` + `filterScript`; sin JS todas las filas visibles |
| AC5 jerarquía + contraste ≥4.5:1 | ✅ **medido** | sidenotes + secciones no-caja; WCAG medido: light ink-3 `#8a8678` FALLABA 3.64 → `#6b675d` (5.64/4.86 PASS), ink-2 `#57534e` (7.63), dark `#8a8993` (5.54). Todos AA |
| AC6 "se nota" | ✅ | Validado por Oriol 2026-06-08 ("ha mejorado mucho") tras iteración de diseño multi-ronda |
| AC7 tokens ≤ a mano | ✅ `[Probable]` | datos JSON << HTML completo; no medido exacto |

## Checklist

### Correctness
- [x] `render(data)` produce HTML válido self-contained; red→green en US3/US5.
- [x] Fallback sin-JS verificado (markup estático: contenido + anclas).
- [x] Contraste MEDIDO (WCAG) y corregido — light ink-3 fallaba 3.64 → #6b675d 5.64. [⚠️] Responsive verificado por código, no en render real (sin browser).

### Quality
- [x] TDD forced cumplido en US3 (render) y US5 (charts/scale) — red real observado.
- [x] Reusa paleta del skill (tokens.css + glance), no purple, anti-slop respetado.
- [⚠️] Código muerto menor: CSS `.cb-row/.cb-track` quedó en render.ts tras retirar el chartBlock baseline (NIT).

### Security
- N/A — scripts de generación local, sin auth/payments/secrets/input no confiable. Scan de secrets en diff: limpio.

### Performance
- Generación: O(n) sobre los bloques; sin deps de runtime en el artefacto. Tokens de generación ↓ (objetivo cumplido cualitativamente).

### Mantenibilidad
- [x] Módulos separados (contract/theme/render/components/charts) con tests; SKILL.md + pre-flight documentados.

## Findings

| Severidad | Descripción | Ubicación | Recomendación |
|---|---|---|---|
| ~~MAJOR~~ **RESUELTO** | Híbrido → **hand-only** (decisión usuario 2026-06-08): `plotInline` eliminado; charts a mano (self-contained, cumplen el constraint). US5.AC3 re-encuadrado: "charts a mano estilo-Plot; Observable Plot opt-in fuera de scope" | `scripts/charts.ts` | Cerrado |
| MINOR | AC6 ("se nota") no cerrable por mí — requiere tu juicio glance vs dynamic | demo | Validar en navegador (abierto) |
| MINOR | Responsive verificado estructural, no en render real (sin browser) — contraste YA medido+corregido | artefacto | Abrir en móvil/devtools |
| MINOR | `donut` mencionado en contract pero no implementado (solo bar/line) | `charts.ts` | bar+line ya cumple "≥2 tipos"; donut = mejora futura |
| NIT | Código muerto: CSS `.cb-row/.cb-track` sin uso en render.ts | `render.ts` | Limpiar en retro o futuro |
| NIT | Theme toggle es texto "◐ tema" (sin icono sol/luna pulido) | `render.ts` | Polish opcional |

## Tests ejecutables

- `bun test ./.claude/skills/html-report/scripts/` → **10 pass / 0 fail** (78 expect).
- `bun test ./.claude/hooks/` → **100 pass / 0 fail** (sin regresión).
- Demo: `project-state-dynamic.html` (19.8 KB, 1 `<style>`, 0 script externo, 2 charts, tabla filtrable).

## Next step

- **APPROVED_WITH_WARNINGS** → Phase 5 (retro), pero el **CIERRE del feature está BLOQUEADO en 2 decisiones tuyas** (no las asumo):
  1. **Híbrido Plot**: ¿aceptar hand-only (re-frame AC + borrar `plotInline` dead code) o cablear Plot de verdad?
  2. **AC6 "se nota"**: ¿confirmas que el dynamic lee mejor que el glance? (demo abierto)
- Contraste: medido y corregido — ya NO es warning.
