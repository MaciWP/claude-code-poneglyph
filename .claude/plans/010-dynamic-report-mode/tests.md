---
spec: 010-dynamic-report-mode
tasks: tasks/index.md
phase: 2.5
test_mode: tdd
tdd_policy: optional
notes: "test-policy=auxiliary → optional; US3/US5 override forced (lógica no trivial). Ejecutor: bun:test."
---

# Tests (TDD-mode) — US3, US5

## US3 — render.ts (forced)

### T3.1 — happy: render produce HTML self-contained
- **Type**: unit
- **Pre-condition**: `ReportData` mínimo válido con 2 `sections` (ids `a`, `b`).
- **Action**: `render(data)`
- **Assert**: el string contiene exactamente un `<style>`; NO contiene `<script src="http`; incluye `id="a"` y `id="b"`; incluye `<!DOCTYPE html>`.
- **Must fail before impl (red)**: `ReferenceError: render is not defined` (módulo aún no existe).

### T3.2 — fallback: el documento es legible sin JS
- **Type**: unit
- **Pre-condition**: misma data.
- **Action**: `render(data)` + extraer el markup fuera de `<script>`.
- **Assert**: cada `section` aparece con su contenido en el markup estático (no inyectado por JS); el nav existe como anclas `<a href="#...">`.
- **Must fail before impl (red)**: `expected substring "#a" not found` (no hay shell todavía).

### T3.3 — edge: data sin secciones no rompe
- **Type**: unit
- **Pre-condition**: `data.sections = []`.
- **Action**: `render(data)`
- **Assert**: no lanza; devuelve HTML válido con header+footer y sin `<section>`.
- **Must fail before impl (red)**: `TypeError: Cannot read properties of undefined` (sin guard).

> Cobertura US3: happy + fallback + edge. AC trazables → US3.AC1/AC2/AC5.

## US5 — charts.ts (forced)

### T5.1 — scale(): mapeo dominio→rango
- **Type**: unit
- **Pre-condition**: `scale([0,10],[0,200])`.
- **Action**: `s(0)`, `s(10)`, `s(5)`
- **Assert**: `0`, `200`, `100` respectivamente.
- **Must fail before impl (red)**: `ReferenceError: scale is not defined`.

### T5.2 — bar(): N rects proporcionales
- **Type**: unit
- **Pre-condition**: `series = [{label:'a',value:2},{label:'b',value:8}]`.
- **Action**: `bar(series)`
- **Assert**: el SVG contiene 2 `<rect` de datos; el ancho/alto del de valor 8 es 4× el de valor 2 (proporcional); incluye `role="img"` + `aria-label`.
- **Must fail before impl (red)**: `expected 2 rects, got 0`.

### T5.3 — edge: serie de 1 punto / vacía
- **Type**: unit
- **Pre-condition**: `bar([])` y `bar([{label:'x',value:5}])`.
- **Action**: invocar ambas.
- **Assert**: `bar([])` no lanza y produce SVG sin rects de datos; `bar([1 punto])` produce 1 rect a escala completa.
- **Must fail before impl (red)**: `TypeError` (sin guard de longitud).

### T5.4 — property-based (opt-in): scale es monótona
- **Type**: property-based
- **Invariant**: para `a < b` en el dominio, `scale(a) <= scale(b)` (rango ascendente).
- **Generator**: pares aleatorios de dominio/rango + valores.
- **Must fail before impl (red)**: invariante no evaluable (sin `scale`).

> Cobertura US5: happy + edge + property-based. AC trazables → US5.AC1/AC4.
