---
us: US5
title: Cross-analysis gaps/oportunidades/anti-patterns interno vs corpus externo
wave: W2
depends_on: [US1, US2]
tdd_mode: skip
estimate: M
status: closed
---

# US5 — Cross-analysis gaps/oportunidades/anti-patterns interno vs corpus externo

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W2 |
| **Depends on** | [US1, US2] |
| **Blocks** | [US6, US7] |
| **Files touched** | `build/cross-analysis.md` (crear) |
| **TDD-mode** | skip: validations.md = oracle |
| **Estimate** | M (1 sesión) |
| **Cómo arrancar** | Read `build/inventory.md` (interno) + `build/corpus.md` (externo); iterar comparaciones |
| **Decisión absorbida** | — |

## User story

- **As a**: Oriol
- **I want**: identificación honesta de gaps (lo que falta), oportunidades (lo que existe en corpus pero no aquí) e innovations (lo que tenemos único)
- **So that**: el top-10 (US6) tiene base empírica para priorizar; ni vanity ni omisiones

## Acceptance criteria

- **AC1**: Given `inventory.md` + `corpus.md`, when se ejecuta cross-analysis, then produce 3 listas:
   - (a) **Gaps**: patterns/features presentes en ≥2 fuentes del corpus PERO ausentes en poneglyph
   - (b) **Oportunidades**: patterns en 1 fuente con evidencia empírica de valor
   - (c) **Innovations**: patterns en poneglyph que NO aparecen en corpus (potencial diferencial O potencial reinvento)
- **AC2**: Given el BLOCKER "apples-to-oranges" (corpus enterprise vs personal), when un gap proviene de fuente `compare-context: enterprise-multi-user`, then se marca explícitamente `[CONTEXT-MISMATCH]` y se evalúa "¿aplica a personal-use?" antes de incluir en gaps real.
- **AC3**: Given cada gap/oportunidad/innovation, when se documenta, then incluye: (a) descripción, (b) ≥1 fuente externa citada (path inventory si comparación interna), (c) compare-context label, (d) "aplicabilidad a poneglyph: HIGH | MEDIUM | LOW" con justificación 1-2 líneas.
- **AC4**: Given AC1 (3 listas), when se cierra, then cuenta:
   - Gaps: 0-20 items realistas
   - Oportunidades: 0-15 items
   - Innovations: 0-10 items
   Si Gaps + Oportunidades >30 → re-priorizar (US6 solo tomará top-10 entre todos)
- **AC5**: Given honestidad radical, when innovations >=5, then ≥1 debe ser revisada críticamente: ¿es innovation genuina o reinvento mal hecho? Documentar verdict.

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/plans/002-claude-config-deep-audit/build/cross-analysis.md` | 3 listas + verdicts |

## Workflow detallado

1. Read `build/inventory.md` (US1) y `build/corpus.md` (US2). Verificar completos.
2. **Pasada Gaps**: para cada componente del corpus (12-20 fuentes), identificar patterns/features mencionados. Cross-check contra inventory:
   - Pattern presente en ≥2 fuentes corpus + ausente en inventory → candidate gap.
   - Aplicar label `[CONTEXT-MISMATCH]` si todas las fuentes son `compare-context: enterprise-multi-user`.
3. **Pasada Oportunidades**: patterns presentes en 1 fuente corpus pero con evidencia empírica fuerte (métrica citada, study) → candidate oportunidad.
4. **Pasada Innovations**: componentes de inventory NO presentes en ningún corpus item.
   - Distinguir genuine innovation vs reinvention. Buscar en corpus si pattern equivalente existe con otro nombre (`drillme` vs "Socratic check", `validations.md` vs "non-code acceptance", etc.).
5. Para cada item de las 3 listas: asignar aplicabilidad HIGH/MEDIUM/LOW para poneglyph (personal-use system).
   - HIGH: directamente aplicable, ROI claro
   - MEDIUM: aplicable con adaptación
   - LOW: requeriría refactor mayor O context-mismatch dominante
6. **AC5 honestidad check**: revisar innovations. Si ≥5, seleccionar 1+ para auditoría crítica: ¿reinvento? Documentar.
7. Generar `build/cross-analysis.md` con 3 tablas (gaps/oportunidades/innovations) + sección verdicts.

## Drillme (Socratic check)

| Categoría | Pregunta |
|---|---|
| `[location]` | ¿Gaps se buscan exhaustivamente o solo en categorías con score bajo? Exhaustivo — gaps en categorías score alto pueden revelar blind spots. |
| `[approach]` | ¿Cómo evitar confirmation bias? Aplicar inversión: por cada innovation, buscar activamente equivalente en corpus aunque inicial scan diga "no existe". |
| `[context]` | ¿Cómo manejar la asimetría volumen (corpus 12-20 fuentes vs inventory 40+ componentes)? Comparación NO es 1-a-1; busca patterns/features, no componentes idénticos. |
| `[failure]` | ¿Qué pasa si el corpus tiene poca señal aplicable (mucho apples-to-oranges)? Documentar como meta-finding: "60% del corpus es enterprise mismatch — comparación tiene grano fino limitado". Honestidad por design. |

## Commandments cubiertos

| # | Cómo |
|---|---|
| I | AC5 honestidad check sobre innovations evita auto-felicitación |
| II | Cada gap/oportunidad cita fuente verificable; cada innovation crítica grep contra corpus |
| III | Filtro aplicabilidad HIGH/MEDIUM/LOW evita over-engineering por importar todo |
| V | Comparación informada precede recomendación (US6) |

## Reutiliza

- `anti-hallucination` skill — per claim de presencia/ausencia
- Pattern de análisis de retro 001 (`retro.md` formato para findings)

## Adaptación intra-fase

| Señal | Adaptación |
|---|---|
| Gaps >20 | Re-priorizar antes de pasar a US6; mantener top-15 con mayor aplicabilidad HIGH |
| Innovations 0 | Suspect: ¿poneglyph realmente no tiene nada único? Re-pass inventory con más detalle |
| Todos gaps `[CONTEXT-MISMATCH]` | Meta-finding crítico para report: corpus mal seleccionado; documentar en US7 |

## Smell signals

- ⚠️ Cross-analysis declara "todo presente, sin gaps" → confirmation bias; re-pass con escepticismo
- ⚠️ Innovation citada sin verificar que NO existe en corpus → riesgo de hallucination
- ⚠️ Aplicabilidad HIGH en >70% de items → criterio demasiado laxo

## Verificación post-implementación

- Smoke: 3 listas presentes con counts dentro de rangos AC4.
- Cada gap/opp tiene ≥1 cita corpus verificable.
- Cada innovation tiene grep-against-corpus declarado.
- AC5 verdict presente si innovations ≥5.

## Open questions (a resolver en implementación)

- ¿Compatibilidad cross-language relevante (la mayoría del corpus es Python/JS)? Decidir en implementación si poneglyph (TypeScript+markdown) tiene patterns únicos del stack.
- ¿Gaps de tooling (e.g., dashboards de coste) son out-of-scope por Commandment IX o son finding válido? Decisión sugerida: documentar pero marcar aplicabilidad LOW por design choice.
