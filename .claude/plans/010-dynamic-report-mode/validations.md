---
spec: 010-dynamic-report-mode
tasks: tasks/index.md
phase: 2.5
validation_mode: validation
test_policy: auxiliary
notes: "US1 doc, US2 contrato/tokens, US4 componentes (smoke), US6 integración. US3/US5 viven en tests.md."
---

# Validations (validation-mode) — US1, US2, US4, US6

## US1 — Fix env-fact en visuals-svg-first.md

### Pre
- `references/visuals-svg-first.md` existe y contiene "NOT available in this environment".

### Post
- El bloque "Environment fact" refleja node/npx/bunx/bun/pandoc PRESENTES (2026-06-08), typst/weasyprint/chromium ausentes.

### Structural
- Aparece una fecha de re-verificación 2026-06-08.
- La decision rule ya no justifica JS-opt-in en "no hay runtime".

### Smoke
- `grep -c "NOT available" visuals-svg-first.md` no afirma node/npx ausentes (el texto cambió).
- `grep "2026-06-08" visuals-svg-first.md` → ≥1.

### Cross
- Coherente con la realidad verificada por `command -v` (node/npx/pandoc presentes).

## US2 — Contrato de datos + tokens

### Pre
- `scripts/` no existe aún (o vacío).

### Post
- `contract.ts` exporta `ReportData` + sub-tipos; `theme.ts` exporta el bloque CSS (light+dark).

### Structural
- `ReportData` cubre meta, sections, callouts, tables, charts, sidenotes, kpis (campos opcionales explícitos).
- `theme.ts` define tokens en ambos esquemas (light + dark) con jerarquía (serif display + sans + mono).

### Smoke
- `bun -e "await import('./.claude/skills/html-report/scripts/contract.ts')"` sin error de tipos.
- `theme.ts` output contiene tokens de ambos esquemas (toggle-class o `prefers-color-scheme`).

### Cross
- La paleta reusa `templates/tokens.css` + glance dark (no inventa; no purple).

## US4 — Componentes (callouts/tablas/sidenotes)

### Pre
- `render.ts` (US3) existe con slots.

### Post
- `components.ts` exporta `callout()`, `table()`, `sidenote()`.

### Structural
- `table({filterable:true})` emite input de búsqueda + `data-*` attrs por fila.
- `callout()` produce 4 variantes semánticas sin eyebrow mono-uppercase por bloque.
- `sidenote()` CSS responsive (margin desktop / inline móvil).

### Smoke
- Render con tabla filtrable: todas las filas presentes en el markup (fallback sin-JS).
- En navegador: escribir en el buscador oculta filas no coincidentes.

### Cross
- Satisface spec.AC5 (no toda la página son cajas idénticas).

## US6 — Integración + demo + docs

### Pre
- US3+US4+US5 cerradas; `render.ts` cableado.

### Post
- `project-state-dynamic.html` generado vía `render.ts`; `SKILL.md` + pre-flight actualizados.

### Structural
- El demo incluye ≥2 charts, ≥1 tabla filtrable, nav sticky, theme toggle, sidenotes.
- `SKILL.md` documenta el modo dynamic + contrato + comando `bun run render.ts`.

### Smoke
- Abrir el demo con red desactivada → renderiza (salvo webfonts).
- Viewport ≤400px → sin overflow horizontal, nav usable.
- Deshabilitar JS → documento legible (fallback).
- `bun test ./.claude/hooks/` → 100/100.

### Cross
- Cumple spec.AC1-AC6; AC6 (el "se nota") = validación humana de Oriol comparando glance vs dynamic.
