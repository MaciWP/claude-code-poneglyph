---
spec: 007-report-template-v2
tasks: tasks/index.md
phase: 2.5
validation_mode: validation
test_policy: auxiliary
---

# Validations — 007 report-template-v2

> **Clasificación**: 5/5 HUs validation-mode (templates HTML + markdown/docs, sin lógica de negocio ejecutable). 0 untestable. `tests.md` NO se produce (sería ceremonia — anti-pattern). Oráculo = Pre/Post/Structural/Smoke/Cross por HU. test-policy=auxiliary → validación post-impl, no red→green.

## US1 — glance.template.html

### Pre
- Existe `.claude/plans/006-cc-release-feature-audit/report-glance-v2.html` (base de diseño aprobada).
- Corpus taste 004 disponible (`taste-hard-rules.md`, `anti-slop.md`).

### Post
- Existe `.claude/skills/html-report/templates/glance.template.html` con placeholders parametrizados.

### Structural assertions
- Cabecera documenta el contrato de `{{PLACEHOLDERS}}` (TITLE/LEDE/NOW_ACTION/KPI_CARDS/SEVBAR/FINDING_CARDS/DRAWER_ROWS/RECO).
- Exactamente 1 `<style>`; 1 `<link>` Google Fonts; **0** `<script>`.
- Define el bloque de design-tokens dark inline (declarado "canónico para US3").

### Smoke
- Rellenar con datos de muestra → la acción/conclusión + KPIs + distribución se ven **sin scroll** (above-the-fold).
- Filtro de categorías y expand de cards funcionan **sin JS** (radio-hack + `<details>`).
- `Grep '<script'` → 0; `Grep '\{\{'` tras rellenar → 0.
- Render con red desactivada → todo salvo webfonts (degradan a system stack).

### Cross-validations
- El bloque de tokens dark queda como fuente única para US3 (mismo contrato `tokens.css`↔report.template).

## US2 — visualizaciones SVG-first

### Pre
- Ninguna (W1, paralela a US1).

### Post
- Existe `.claude/skills/html-report/references/visuals-svg-first.md` con ≥1 ejemplo SVG inline por tipo (flujo, comparativa, barras/score, matriz).

### Structural assertions
- Documenta la **regla de decisión** SVG-a-mano vs JS opt-in (mermaid.js), con el trade-off self-contained explícito.
- Cada SVG de ejemplo lleva `role="img"` + `aria-label` (a11y, no color-alone).
- Registra el hecho verificado: `mmdc/npx/bunx/node` ausentes → sin auto-render.

### Smoke
- Los SVG de ejemplo renderizan con **red desactivada**.
- Anti-slop 0 fallos: sin gradientes purple, sin chartjunk, color=información.

### Cross-validations
- El componente matriz/chart es consumible por US3 (decision) sin duplicarlo (Cmd X).

## US3 — decision.template.html

### Pre
- US1 cerrada (token block dark canónico disponible) y US2 cerrada (componente matriz/chart).

### Post
- Existe `.claude/skills/html-report/templates/decision.template.html` con placeholders (QUESTION/OPTIONS/CRITERIA/WEIGHTS/SCORES/RECOMMENDATION/CONFIDENCE).

### Structural assertions
- El bloque de tokens dark es **idéntico verbatim** al de US1 (verificable por diff — Cmd X, no re-autorar).
- Contiene matriz opciones×criterios con scoring ponderado + recomendación destacada arriba.
- 0 `<script>` salvo ruta opt-in declarada en cabecera.

### Smoke
- Rellenar caso **no-dev** (ej. 3 monitores × 5 criterios) → recomendación clara **de un vistazo**, self-contained offline.

### Cross-validations
- Diff del token block contra `glance.template.html` (US1) = 0 diferencias.
- Reusa el componente de US2 (no redefine matriz/chart propio).

## US4 — decide reusa el sistema

### Pre
- US3 cerrada (`decision.template.html` existe).

### Post
- `.claude/skills/decide/SKILL.md` Step 4 genera vía `html-report/templates/decision.template.html`.
- `.claude/skills/decide/templates/memo.html` lleva nota de destino (deprecado→pointer o fallback).

### Structural assertions
- `decide/SKILL.md` NO redefine tokens ni corpus de taste (reuso, no duplicación).
- El pointer a `decision.template.html` es un path válido existente.

### Smoke
- `/decide "<pregunta de prueba>"` → produce HTML vía decision.template; el flujo de 3 perspectivas → síntesis sigue intacto (sin regresión).

### Cross-validations
- `Grep` de definiciones de tokens/taste en `decide/` → no se redefinen (doctrina única; Cmd X).

## US5 — integración (SKILL + pre-flight + components)

### Pre
- US1, US2, US3 cerradas.

### Post
- `html-report/SKILL.md` documenta 4 layouts (report·dashboard·glance·decision) + flujo diagramas híbrido.
- `references/pre-flight-checklist.md` incluye ítems cliente-ready (vistazo, diagrama, self-contained).
- `templates/components.html` añade los componentes nuevos (filtro CSS, card expandible, diagram, chart/matriz).

### Structural assertions
- `SKILL.md` < 500 líneas (detalle en references — finding A7).
- `report` y `dashboard` siguen documentados (no-regresión).
- pre-flight NO reformula el corpus 004 (solo añade — Cmd X).

### Smoke
- `Grep 'report|dashboard|glance|decision'` en SKILL.md → los 4 presentes.
- pre-flight corre sobre un render glance/decision → 0 fallos.

### Cross-validations
- Los componentes añadidos a `components.html` referencian su origen (US1/US2/US3); nada huérfano.

## US6 — galería componentes shadcn (scope-extra)

### Pre
- US1 (token block dark) disponible.

### Post
- `smoke-components-shadcn.html` renderiza badges/alert/separator/progress/skeleton/empty-state.

### Structural / Smoke / Cross
- Componentes usan tokens dark + anti-slop (0 gradientes purple, color=info). Skeleton shimmer tras `prefers-reduced-motion`.
- Smoke: render offline OK. Cross: deliverable = showcase (referencia canónica); hornear a components.html = evolución futura.

## US7 — interactividad shadcn (scope-extra)

### Pre
- US1 disponible.

### Post
- `smoke-components-shadcn.html`: tabs + tooltips + command + focus-ring funcionando.

### Structural / Smoke / Cross
- Tabs y tooltips **0 JS** (CSS radio-hack / `:hover`/`:focus-visible`). Command = único `<script>` (≤10 líneas vanilla, declarado).
- Smoke: tabs/tooltips con red desactivada OK; command filtra al teclear; `esc` limpia. Focus-ring visible por teclado.
- Cross: JS opt-in declarado en el fichero (rompe 0-JS puro, autorizado).

## Validaciones globales (toda la feature)

- **No-regresión**: `report.template.html` y `dashboard.template.html` renderizan igual que antes (spec AC5).
- `bun test ./.claude/hooks/` sigue verde (ninguna HU toca hooks).
- Cada template nuevo (glance, decision) pasa el **pre-flight checklist** 004 con 0 fallos (cliente-ready — spec AC4).

## Drillme — Phase 2.5

1. `[failure]` **Happy + edge / 5 categorías?** — Cada HU tiene las 5 categorías (Pre/Post/Structural/Smoke/Cross); los smokes cubren caso normal (render) + edge (red desactivada / caso no-dev / no-regresión). ✓
2. `[approach]` **HU untestable?** — Ninguna: cada una tiene smoke verificable (render offline, Grep, /decide). 0% untestable → decomposición Phase 2 sana. ✓
3. `[approach]` **Property-based fit?** — N/A: no hay parsers/transforms con invariantes; son templates HTML. No se fuerza property-based (sería ceremonia, Cmd III). ✓

Coverage: 2/4 categorías Socráticas (fase enfocada en oráculo; location/context cubiertas por tech-plan en Phase 2).
