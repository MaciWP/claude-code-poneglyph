---
spec: 010-dynamic-report-mode
closed_at: 2026-06-08
phase: 5
status: approved
retro_level: full
verdict_phase4: APPROVED_WITH_WARNINGS
spec_drift: resolved (US5.AC3 → hand-only, 2026-06-08)
promotions_proposed: 2
promotions_approved: 1
commandment_violations: 1
living_spec_delta: applied (hand-only re-frame)
action_items: 6
---

# Retro — modo dynamic (generador) de html-report

## Resumen

Construido un generador determinista (`scripts/`: contract/theme/render/components/charts) que emite informes HTML dynamic self-contained desde datos JSON. 6 HUs, 10 tests verdes, hooks 100/100. Verdict Phase 4: **APPROVED_WITH_WARNINGS**. Dos defectos reales los pilló el `advisor` (pase independiente), no mi propio review.

## Lecciones técnicas

### ✅ Funcionó
- **TDD red→green real** en US3 (render) y US5 (scale/bar): vi el red ("Cannot find module") antes del green.
- **Stress-test inline** (5 lentes, no 12 agentes spawneados): respetó tu prioridad low-token + el spawn-tree de 008 (<4 → inline).
- **Generador baja tokens**: emitir un informe = ~80 líneas JSON vs ~700 de HTML a mano. Consistencia: el diseño vive una vez.
- **`advisor` como pase independiente** > self-review: pilló el contraste que fallaba y el híbrido dead-code. Mejor coste que reviewer-Opus en código+docs.

### ❌ No funcionó
- **Afirmé contraste "lifted for AA" sin medir** → light `--ink-3` fallaba (3.64 < 4.5). Commandment II lapse. Corregido a `#6b675d` (5.64) tras medir con la función WCAG. Lección: medir, no estimar, cuando es trivial medir.
- **`plotInline` construido pero NUNCA cableado** (0 imports en render.ts) → el "híbrido" que elegiste es dead code / aspiracional. No entregué la opción que pediste; o se cabla o se re-encuadra (tu decisión).
- **Charts emitían `<style>` por SVG** (×3) → violaba "1 `<style>`". Cogido y movido al style global.

## Commandments check

| # | Cumplido? | Notas |
|---|---|---|
| I | ✅ | Surfaco las 2 decisiones de cierre, no las asumo; review honesto del híbrido |
| II | ⚠️ | **Lapse**: contraste afirmado sin medir + híbrido descrito como "conservador" cuando era dead code. Ambos corregidos tras advisor |
| III | ✅/⚠️ | Generador defendible, pero NO pagó tokens esta sesión (paga a N informes futuros). Flow full 5-fases fue pesado para "terminarla de una vez" |
| IV | ✅ | TDD forced red→green; gates 1→2 y 2→3; verdict AWW honesto (no inflado) |
| V | ✅ | scope + tech-plan antes de código |
| VI | ✅ | Sin secrets; sin operaciones destructivas |
| VII | ✅/⚠️ | Stress-test inline ahorró; pero la ceremonia 5-fases es pesada para esta escala |
| VIII | ✅ | Skills encadenadas (scope/tech-plan/tdd-design/critic); prompts ricos |
| IX | ✅ | Advisor = medición independiente; contraste MEDIDO (no afirmado) |
| X | ✅ | Corrige env-fact obsoleto; documenta dynamic en SKILL.md+pre-flight; queda limpiar plotInline dead code |

## Promociones candidatas

| Candidate | Scope | Razón |
|---|---|---|
| `feedback-measure-dont-estimate-contrast` | memory | Afirmé AA sin medir; la función WCAG es 6 líneas. "Cuando un AC es medible (contraste, tokens), MIDE antes de afirmar — no estimes" |
| El generador (`scripts/`) | ya aplicado | No es promoción — es el feature, ya en el skill. Pendiente solo tu ratificación + las 2 decisiones |

## Living-spec delta (RESUELTO 2026-06-08)

- **US5.AC3** (híbrido Plot): Oriol eligió **hand-only**. Re-encuadrado a "charts a mano estilo-Plot; Observable Plot opt-in fuera de scope"; `plotInline` eliminado (`charts.ts`). No queda dead code de Plot.

## Pregunta Cmd III (honesta, del pase independiente)

¿Fue el generador (9 ficheros + framework) lo más simple que cumple el spec? **Defendible** dados tus constraints (low-token a futuro + consistencia + "que se note"), pero honestamente **no amortizó su coste ESTA sesión** — lo amortiza a partir del 2º-3er informe. Si solo fueras a hacer 1 informe más, HTML a mano habría sido más simple.

## Action items

- [x] **[Oriol]** Decidir híbrido Plot → **hand-only** (2026-06-08).
- [x] **[Oriol]** Validar AC6 → **validado** 2026-06-08 ("ha mejorado mucho").
- [x] **[Lead]** Hand-only: `plotInline` (dead code) borrado + US5.AC3 re-encuadrado.
- [x] **[Lead]** Limpiar CSS muerto `.cb-row/.cb-track/.cb-v` en `render.ts` (2026-06-09).
- [x] **[Lead]** Guardar memoria → `measure-dont-estimate-measurable-acs`.
- [x] **[Lead|Oriol]** 010 commiteado en `b5edddc`.

## Cierre del feature (verification gate)

- [x] Tests 010 verdes (10/0) + hooks 100/100.
- [x] review.md verdict AWW (honesto).
- [x] `feature_closed` — las 2 decisiones de Oriol tomadas (hand-only + AC6 validado, 2026-06-08).
- [x] `spec.md` → `status: closed`; dead code (plotInline + CSS .cb-*) eliminado.

> Lifecycle cerrado. Único drift residual del retro original (frontmatter/secciones "pending") des-staleado el 2026-06-09.
