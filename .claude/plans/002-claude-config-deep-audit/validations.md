---
spec: 002-claude-config-deep-audit
tasks: tasks/
created: 2026-05-28
phase: 2.5
status: draft
validation_mode: validation
test_policy: auxiliary
feature_type: atypical-research
hus_validation_mode: [US1, US2, US3, US4, US5, US6, US7]
hus_tdd_mode: []
untestable_count: 0
---

# Validations per HU (validation-mode)

## ¿Por qué validation-mode y no TDD?

Esta feature es ATÍPICA: deliverable = report markdown, 0% código ejecutable. Las 7 HUs producen artefactos `.md` (inventory, corpus, rubric, scoring, cross-analysis, findings, report). Aplicar TDD aquí sería ceremonia: no hay binario red→green natural sobre markdown. Las validaciones declarativas (Grep/Read/structure check/manual LLM review) son el oracle honesto. Repo policy = `auxiliary` (test-policy.md) confirma la decisión.

## Categorías de validación

| Categoría | Significado |
|---|---|
| **Pre-conditions** | Qué debe existir ANTES de empezar la HU |
| **Post-conditions** | Qué debe existir/ser cierto TRAS cerrarla |
| **Structural assertions** | Secciones/campos obligatorios en el artefacto |
| **Smoke checks** | Verificación ejecutable — Glob/Grep/Read/manual |
| **Cross-validations** | Refs entre archivos coherentes; nada huérfano |

---

## US1 — Inventario interno exhaustivo

### Pre

- spec.md status `approved` ✅ (2026-05-28)
- tasks/index.md aprobado preliminarmente (gate 2→3 pendiente)
- Repo en commit HEAD estable (no merges activos)

### Post

- `build/inventory.md` existe
- Frontmatter incluye `commit_sha` HEAD (anti-drift)
- Counts por categoría declarados explícitamente

### Structural assertions

- Sección por categoría: skills (19), commands (4), agents (3), hooks (4), rules (4), output-styles (1), templates (7), meta-componentes
- Tabla `# | Path | Categoría asignada | Propósito | Última mod`
- Sección "Meta-componentes" con: frontmatter conventions, state.json schema, drillme integration, hard gates protocol
- Word count ≤2000 (AC5)

### Smoke

- `Glob .claude/skills/*/SKILL.md` reproduces el count documentado (19)
- `Glob .claude/commands/*.md` → 4
- `Glob .claude/agents/*.md` → 3
- `Glob .claude/hooks/**/*.ts` → 9 (4 main + lib + validators + __tests__)
- `Glob .claude/plans/templates/*.md` → 7
- Cada path listado en inventory.md → `Read` succeeds

### Cross-validations

- Counts inventory.md ≥ counts CLAUDE.md (CLAUDE.md menciona 19/4/3/4/4/1 — inventory.md NO debe inventar más sin verificación)
- Cada categoría asignada en inventory.md existe en rubric.md (US3 — verificable solo tras W1 completa)

### Edge cases

- ⚠️ Si Glob skill count ≠ 19 → discrepancia con CLAUDE.md → flag en OQ-impl, no silenciar
- ⚠️ Si `scripts/` existe y contiene utilidades poneglyph → decidir inclusión en implementación
- ⚠️ Hook tests (`__tests__/`) cuentan como sub-componente, no categoría separada

---

## US2 — Corpus externo 12-20 fuentes

### Pre

- US1 NO requerido (paralelo en W1)
- WebFetch tool disponible y operativo
- spec.md aprobado (gate 1→2 closed)

### Post

- `build/corpus.md` existe con N fuentes ∈ [12, 20]
- Frontmatter `research_date` + `total_sources: N`
- Sección "compare-context distribution" con counts personal vs enterprise vs library

### Structural assertions

- Por cada fuente, OBLIGATORIO 6 campos: URL directa, WebFetch result (status + 1-line evidence), star-count si aplica, compare-context label, "qué es" 1 párrafo, "qué nos enseña" 1 párrafo
- Distribución entre 4 sub-categorías: Repos GitHub (6-8), Anthropic docs (3-5), Estudios empíricos (3-5), GitHub issues (1-2)
- Sección "Apéndice: fuentes consideradas no incluidas" si pool > 20

### Smoke

- Cada URL en corpus.md → WebFetch reproducible (200 OK o documentado `[URL-DEAD]`)
- Total count entre 12 y 20 inclusive (no menos, no más sin justificación)
- Ningún `compare-context` vacío

### Cross-validations

- Fuentes citadas en cross-analysis.md (US5) existen en corpus.md
- Fuentes citadas en report.md (US7) existen en corpus.md
- Star-counts citadas en findings.md (US6) consistentes con corpus.md

### Edge cases

- ⚠️ `[URL-DEAD]` documentado y se busca alternativa O se registra como finding US6
- ⚠️ Repo target archived/deprecated → finding US6 + sucesor documentado
- ⚠️ Si pool >50% enterprise (apples-to-oranges dominante) → meta-finding crítico para US5+US7

---

## US3 — Rúbrica scoring 0-10 anchors literales

### Pre

- spec.md aprobado (gate 1→2 closed) — define las 14 categorías
- US1+US2 NO requeridos (paralelo en W1)

### Post

- `build/rubric.md` existe con 14 categorías × 3 anchors = 42 anchors literales
- Sección "Cómo puntuar" presente (≤5 pasos)
- Sección "Anti-patterns de scoring" presente

### Structural assertions

- 14 categorías declaradas (no 13, no 15): 6 fases (Scope, Tech-plan, TDD-design, Build, Critic, Retro) + 8 transversales (Skills system, Agent strategy, Hooks reliability, Rules & output-styles, Templates & state persistence, Anti-hallucination + security, Observability, Meta-system maintenance)
- Cada categoría con 3 anchors `0 / 5 / 10` operativos (no "excelente/bueno/malo")
- Word count ≤1500 (legibilidad)
- Cada anchor ≤2 líneas

### Smoke

- Aplicar rúbrica a 1 categoría de muestra DURANTE el diseño — anchors funcionan en práctica
- Sección "Cómo puntuar" tiene ≤5 pasos

### Cross-validations

- Las 14 categorías aparecen literalmente en scoring.md (US4)
- Las 14 categorías cubren TODOS los componentes del inventory.md (US1) — ningún componente huérfano
- Anchors citados en scoring.md (US4) existen literalmente en rubric.md

### Edge cases

- ⚠️ Si combinar critic+retro en 1 cat → ajustar 14 ↔ 13; decidir antes de cerrar
- ⚠️ Categorías con poco material (e.g., output-styles=1 archivo) → anchors igual aplicables pero scoring corto, aceptable
- ⚠️ Anchor 0 ≈ anchor 5 en >2 cat → diseño defectuoso, retry

---

## US4 — Scoring 0-10 a las 14 categorías con evidencia trazable

### Pre

- US1 completed → inventory.md existe
- US3 completed → rubric.md existe
- US2 NO requerido (paralelo)

### Post

- `build/scoring.md` existe con 14 scores (o 13 + 1 N/A justificado)
- Sección "Distribución" con mean/median/min/max/count(N/A)
- Sección "Honestidad check (AC5)" si mean >8.0 — verdict presente

### Structural assertions

- Por cada categoría: score 0-10 (o N/A), ≥2 evidencias citadas (≥3 si score ≥9), justificación ≥3 líneas, anchor usado (`anchor:0|5|10|interp-N`)
- Tabla `# | Categoría | Score | Anchor used | Evidence-1 | Evidence-2 | Justificación`
- N/A con ≥2 líneas justificación (no penalizar ausencia legítima)

### Smoke

- Count(scores) + count(N/A) = 14
- Cada evidencia citada → path interno re-checkable (`Read` succeeds) O URL externa verified
- Cada anchor citado existe literalmente en rubric.md (US3)
- Cada categoría con score ≥9 → ≥3 evidencias

### Cross-validations

- Categorías scoring.md ↔ categorías rubric.md (1:1)
- Componentes citados como evidencia ↔ existen en inventory.md (US1)
- Anchor usado ↔ existe en rubric.md anchors literales

### Edge cases

- ⚠️ Mean >8.0 sin hallazgo negativo → AC5 honestidad check obligatorio, verdict en sección dedicada
- ⚠️ Todos scores ≥7 → suspect self-congratulation, trigger AC5 con prioridad
- ⚠️ Score ≥9 sin 3ª evidencia → invalida, retry

---

## US5 — Cross-analysis gaps/oportunidades/anti-patterns

### Pre

- US1 completed → inventory.md existe
- US2 completed → corpus.md existe
- US3+US4 NO requeridos (paralelo)

### Post

- `build/cross-analysis.md` existe con 3 listas (Gaps, Oportunidades, Innovations)
- AC5 verdict presente si innovations ≥5

### Structural assertions

- Lista Gaps: 0-20 items, cada uno con compare-context label + aplicabilidad HIGH/MEDIUM/LOW
- Lista Oportunidades: 0-15 items
- Lista Innovations: 0-10 items
- Tabla por cada lista con cols `Item | Descripción | Fuente externa | Compare-context | Aplicabilidad | Justificación 1-2 líneas`
- Si Gaps+Oportunidades >30 → re-priorización documentada

### Smoke

- Cada gap/oportunidad tiene ≥1 cita corpus verificable
- Cada innovation tiene declaración grep-against-corpus (verificado NO existe en corpus)
- Aplicabilidad HIGH en ≤70% de items (criterio no laxo)

### Cross-validations

- Fuentes citadas en cross-analysis.md ↔ existen en corpus.md (US2)
- Innovations cited como "presente solo aquí" ↔ existen en inventory.md (US1)
- Gaps con `[CONTEXT-MISMATCH]` ↔ fuente origen tiene `compare-context: enterprise-multi-user`

### Edge cases

- ⚠️ "Todo presente, sin gaps" → confirmation bias, re-pass con escepticismo
- ⚠️ Innovations 0 → re-pass inventory con más detalle
- ⚠️ Todos gaps `[CONTEXT-MISMATCH]` → meta-finding crítico para US7

---

## US6 — Top-10 hallazgos accionables + Quick-wins

### Pre

- US4 completed → scoring.md existe
- US5 completed → cross-analysis.md existe

### Post

- `build/findings.md` existe con top-10 + quick-wins ≤5
- AC5 verdict presente (suavización check)

### Structural assertions

- Tabla top-10 con 7 cols OBLIGATORIAS: `# | Hallazgo | Tipo | Severity | Acción verb-first | Effort S/M/L | /flow command sugerido`
- Tabla quick-wins con misma estructura (subset, ≤5)
- Ordenamiento por (Severity, Effort, Aplicabilidad)
- Sección verdicts AC5

### Smoke

- Exactamente 10 hallazgos en top (o <10 honestamente documentado si pool insuficiente)
- Quick-wins ≤5
- Cada `/flow command sugerido` es ejecutable literalmente (sintaxis: `/flow [--mode] "<descripción>"`)
- Cada Severity ∈ {BLOCKER, MAJOR, MINOR, NIT}
- Cada Effort ∈ {S, M, L}
- Cada Tipo ∈ {gap, opp, anti-pattern, low-score, reinvent}

### Cross-validations

- Hallazgos referencian categorías ↔ categorías existen en scoring.md
- Quick-wins son subset O disjuntos del top-10 (no duplicar literalmente)
- Hallazgos con tipo `gap`/`opp` citan fuente del cross-analysis.md
- Hallazgos con tipo `low-score` citan categoría con score ≤5 en scoring.md
- Hallazgos con tipo `reinvent` citan innovation con verdict "reinvento" en cross-analysis.md

### Edge cases

- ⚠️ Top-10 todos MINOR/NIT → re-evaluate pool (probable low-score candidates ignorados)
- ⚠️ Top-10 todos BLOCKER → suspect inflation, valida con drillme
- ⚠️ `/flow command sugerido` genérico ("revisar X") → no ejecutable, reformular
- ⚠️ BLOCKER detectado → NO interrumpir audit; completar + priorizar post-report

---

## US7 — Report final progressive disclosure

### Pre

- US4, US5, US6 completed → scoring/cross-analysis/findings existen
- US1, US2, US3 también requeridos para sub-secciones (inventario, corpus, rúbrica)

### Post

- `.claude/plans/002-claude-config-deep-audit/report.md` existe (DELIVERABLE FINAL)
- Frontmatter completo con 7 campos AC7
- AC3 verdict (honestidad radical): hallazgo negativo concreto O declaración explícita

### Structural assertions

- 9 secciones en orden AC1: Executive summary → Top-10 → Quick-wins → Scoring → Cross-analysis → Rúbrica → Inventario → Corpus → Apéndice limitaciones
- Executive summary ≤5 bullets, ≤200 palabras
- Word count total 2500-4500 palabras
- Frontmatter: `audit_date`, `commit_sha`, `mean_score`, `findings_count`, `corpus_size`, `disputed: []` (vacío inicial), `meta_circular_limitations_declared: true`

### Smoke

- 9 secciones presentes verificables por Grep de headers
- Word count en rango (`wc -w` aprox o conteo manual)
- Cada URL externa → verified en corpus.md (US2)
- Cada path interno → verified en inventory.md (US1) o estructura del repo
- Links anchor markdown activos (no broken refs)
- AC6 test: lector externo (Phase 4 reviewer Opus) confirma "leyendo secciones 1-3 entiendo próximos 3 /flow"

### Cross-validations

- Top-10 en report.md ↔ findings.md (US6) (idénticos)
- Scoring en report.md ↔ scoring.md (US4) (consistente)
- Corpus en report.md ↔ corpus.md (US2) (lista 1:1)
- Mean_score frontmatter ↔ calculado en scoring.md (US4)
- Findings_count frontmatter = 10 (o menor honesto)
- Corpus_size frontmatter = N (12-20)

### Edge cases

- ⚠️ Word count <2500 → contenido superficial, expand secciones 4/5/7
- ⚠️ Word count >4500 → mover sub-detalles a `report-appendix.md`
- ⚠️ AC3 no encuentra finding negativo legítimo → NO inventar; declarar explícito + flag verdict Phase 4
- ⚠️ Executive summary >5 bullets o >200 palabras → simplify
- ⚠️ Link interno roto → fix antes de cerrar

---

## Cross-cutting validations

> Validaciones que aplican al feature entero, no por HU.

- **X1 — Honestidad radical chain (AC8 spec)**: cadena de checks consecutivos. US4 AC5 (mean >8.0 → re-eval) → US5 AC5 (innovations ≥5 → critical review) → US6 AC5 (top-10 sin BLOCKER negativo → re-eval) → US7 AC3 (declaración final). Si **ninguno** de los 4 produce un hallazgo negativo legítimo → status final del report = "sistema sin hallazgo crítico identificado tras 4 honestidad checks; verdict de reviewer Opus Phase 4 confirma/refuta". Self-congratulation pattern = failure mode declarado.

- **X2 — Grounding obligatorio (AC2 spec)**: cada cita en TODOS los artefactos build/ + report.md → verifiable mecánicamente. Hallucination detection: random sample 10% de citas externas debe pasar WebFetch; 10% de paths internos debe pasar Glob. Si falla >5% → BLOCKER, retry HU origen.

- **X3 — Re-ejecutabilidad (AC7 spec)**: en 3 meses, un segundo audit aplicando rubric.md (US3) + corpus.md (US2 actualizado) → scores comparables. Anchors literales US3 son la garantía técnica.

- **X4 — Sesgo meta-circular declarado (AC5 spec)**: report.md Sección 9 (Apéndice limitaciones) lista las 5 capas de mitigación + declaración honesta de lo no mitigable (mismo modelo familia Claude → fuera de scope del audit). Verificable por Grep "meta-circular" en report.md.

- **X5 — Disputa/rebuttal protocol**: frontmatter de report.md incluye `disputed: []` (lista vacía inicial). Oriol puede editar añadiendo hallazgo-id sin re-ejecutar audit. El hallazgo queda marcado "under review" para próximo cycle. Verificable por presencia del campo en frontmatter.

- **X6 — Anti-drift**: `commit_sha` en frontmatter de inventory.md (US1) + report.md (US7). Si `git rev-parse HEAD` durante Phase 3 ≠ snapshot → audit corrupto, retry. Sistema NO debe modificarse durante audit (declarado en spec Constraints).

- **X7 — Scope creep prevention**: total tokens del Phase 3 build ≤ budget razonable (estimado ~150-200K tokens entre research externo + síntesis interna + composición). Si excede 250K → STOP, escalate.

## Verificación final pre-gate 2→3

Antes de presentar al usuario para APPROVE:

| Check | Status |
|---|---|
| validations.md frontmatter completo (incluye hus_validation_mode/hus_tdd_mode/untestable_count) | ✅ |
| 7 secciones US{N} presentes (1:1 con tasks/USX.md) | ✅ |
| 5 categorías por HU presentes (Pre/Post/Structural/Smoke/Cross) — skips honestos cuando N/A | ✅ |
| Cross-cutting validations X1-X7 declaradas | ✅ |
| Drillme Phase 2.5 auto-resuelto (D1/D2/D3 documentados arriba) | ✅ |
| Untestable rate = 0/7 = 0% (<30% smell threshold) | ✅ |
| Adaptation declared (100% validation-mode by nature atypical) | ✅ |

Listo para hard gate 2→3.
