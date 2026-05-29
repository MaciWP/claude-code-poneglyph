---
spec: 002-claude-config-deep-audit
phase: 5
retro_level: full
verdict_phase4: APPROVED_WITH_WARNINGS
spec_drift: legitimate
promotions_proposed: 5
promotions_approved: 0
commandment_violations: 2
living_spec_delta: yes
action_items: 6
created: 2026-05-29
status: open
---

# Retro — 002 Audit profundo Claude Code Poneglyph

## 1. Executive summary

**Problema original** (spec.md): "no sabemos qué ignoramos" — sospecha de gaps invisibles frente al state-of-the-art tras el refactor 5-phase, sin baseline empírico.

**Entregado**: report.md (9 secciones, 2699 palabras, progressive disclosure) con scoring 0-10 de 14 categorías (mean 7.57), 17 fuentes externas verificadas, top-10 hallazgos accionables, 7 items compose poneglyph+dynamic workflows. 6 artefactos build/ de soporte.

**Verdict del proceso**: completó las 6 fases con 2 hard gates humanos, PERO con fricción real — el usuario tuvo que intervenir 2 veces para corregir el rumbo (exceso de protocolo pre-sustancia) y un evento externo (dynamic workflows release) forzó un reframe mid-flight que el sistema absorbió bien. El audit confirmó empíricamente su propia hipótesis BLOCKER: el sistema nunca se había probado a sí mismo end-to-end.

## 2. Technical lessons

### ✅ Patterns that worked

- **Mitigación meta-circular en capas FUNCIONÓ**: el reviewer Opus (Phase 4) cambió el resultado real — rebajó Rules 9→8 (descuento off-rubric), detectó inconsistencia stale Critic 5-vs-3, midió word count bajo. NO fue rubber-stamp. Evidencia de que el patrón reviewer-independiente + advisor vale su coste. Reusar en cualquier feature donde el autor del deliverable es también su evaluador.
- **Artefactos persistentes + state.json salvaron el reframe mid-flight**: dynamic workflows salió DURANTE el /flow. Patchear `spec.md §Post-spec event` + `US2` en caliente + registrar en state.json permitió absorber el cambio sin perder coherencia. La resumabilidad funcionó en la práctica (no solo en teoría).
- **Lead-direct recovery ante fallo de agente**: cuando el builder US6 murió, el Lead escribió findings.md + report.md directamente (markdown no-sensitive, default-allow). El workflow no se bloqueó por un fallo de tooling de un subagente.
- **Pre-commit honesty anchor en scoring**: comprometer Critic=≤6 ANTES de puntuar el resto previno optimism creep. Patrón replicable en cualquier self-assessment.
- **compare-context labels en el corpus**: etiquetar cada fuente (personal/enterprise/library/paper) neutralizó el BLOCKER apples-to-oranges — permitió medir que solo 25% era enterprise (<50% threshold).

### ❌ Patterns that didn't work

- **Builder + bash heredoc con backticks = KILL**: el builder US6 intentó escribir findings.md (markdown con backticks y code fences) vía heredoc bash → se atascó en el delimiter. Tooling failure, no de contenido. El análisis estaba completo (frontmatter escrito) pero el cuerpo se perdió. LECCIÓN: agentes que producen markdown con backticks/fences DEBEN usar Write tool, nunca heredoc. Candidato a promotion.
- **Exceso de protocolo pre-sustancia (over-engineering del proceso)**: el Lead invirtió ~15K tokens en spec/tasks/validations/perspectives ANTES de producir un solo hallazgo. El usuario paró 2 veces ("¿realmente no has investigado nada?", "revisa esto"). Coincide con el BLOCKER del Outsider perspective (procrastinación pre-investigación) y es una violación parcial de Commandment III (simplicidad). LECCIÓN: features de research necesitan menos ceremonia upfront — sustancia temprana, formalización incremental.
- **Auto-scoring inicial ligeramente generoso**: Rules salió 9 con un descuento por un criterio (activación manual del output-style) que NO estaba en la rúbrica. Solo el reviewer independiente lo cazó. Confirma que el self-scoring sin revisor tiende a inconsistencia, aunque sea menor.
- **Status-closure gap RECURRENTE (US2)**: el agent que cerró US2 (corpus) NO actualizó su frontmatter a `status: closed` — quedó en `draft` hasta que esta retro lo cerró residualmente. Es EXACTAMENTE el incidente documentado en memory `feedback_status_close_verification.md` (incidente 2026-05-28, feature 001, 5 frontmatters sin cerrar). REINCIDENCIA: el fix Step 8b del build skill (commit c2eb838) no cubre agentes general-purpose que cierran HUs fuera del build skill. LECCIÓN: la verificación de cierre del Lead en Phase 5 sigue siendo necesaria — el gap no está resuelto a nivel de proceso, solo parcheado en build skill.

## 3. Process audit

| Phase | Effort | Friction observada | Improvement candidate |
|---|---|---|---|
| Phase 1 (scope) | L | Cuestionario + 3 perspectives + 4 refinamientos antes de cualquier dato. Heavy para una feature de research | "research-mode" con scope ligero: problema+corpus+rúbrica, perspectives opcionales |
| Phase 2 (tech-plan) | M | DAG de 7 HUs correcto; sin fricción real | — |
| Phase 2.5 (tdd-design) | S | validations.md fluido (dual-mode acertó: 0% código → validation-mode) | — |
| Phase 3 (build) | XL | **Heaviest**. W1-W4 paralelos, pero US6 killed (heredoc) → Lead recovery manual. ~270K tokens en research+scoring+síntesis | Regla anti-heredoc para builders; considerar dynamic workflows para waves |
| Phase 4 (critic) | M | reviewer Opus 167K tokens; encontró 1 MAJOR + 3 MINOR reales | Funcionó como diseñado — esta es la fricción que SÍ aporta valor |

**Phase más pesada**: Phase 3 (build) — XL. Diagnóstico: research externo (17 WebFetch) + scoring de 14 categorías + síntesis + el fallo del heredoc que forzó recovery. La carga es inherente a un audit, pero el heredoc bug fue evitable.

## 4. Drillme — Phase 5 (retrospective)

1. **`[approach]` Phase too heavy?** — Phase 1 (scope) pesó más de lo necesario para research. 3 perspectives + 4 refinamientos + drillme antes de un solo dato. Para audit/research, un scope ligero (problema + corpus + rúbrica) habría llegado a la sustancia 15K tokens antes.

2. **`[approach]` Avoidable friction?** — Sí, dos: (a) el heredoc bug del builder US6 (evitable con regla Write-tool-para-markdown); (b) la ceremonia upfront que provocó las 2 interrupciones del usuario. La fricción del reviewer Opus (Phase 4) NO era evitable — era valor.

3. **`[approach]` Reusable pattern?** — Tres: (a) reviewer-independiente cuando autor=evaluador; (b) compare-context labels para neutralizar apples-to-oranges en cualquier comparación; (c) pre-commit honesty anchor antes de self-scoring. Reusables más allá de esta feature.

4. **`[context]` Global vs local vs memory?** — Anti-heredoc → global (afecta builder en todos los proyectos). Research-mode ceremonia → global (adaptación de /flow). compare-context + honesty-anchor → memory (técnicas de audit, no config). Hallazgos del audit (top-10) → backlog de features, NO promotions.

5. **`[failure]` Commandment violated silently?** — Sí, 2: **Commandment III** (over-engineering del proceso — protocolo > sustancia, el usuario lo señaló) y **Commandment VII** (eficiencia — ~15K tokens de ceremonia antes del primer dato, evitable). Ninguno crítico pero ambos reales.

## 5. Promotion candidates

> **Distinción clave**: estas son promotions del PROCESO (mejoras de config). Los top-10 hallazgos del audit (findings.md) son BACKLOG DE FEATURES (próximos /flow), NO promotions de config — listados aparte en §8 Action items.

| Candidate | Scope | Type | Why (evidencia) | Concrete proposal |
|---|---|---|---|---|
| **anti-heredoc-markdown** | global | rule O feedback-memory | US6 builder killed por heredoc con backticks (§2 ❌) | Memory `feedback_builder_no_heredoc_markdown.md` + nota en builder.md: "markdown con backticks/fences → Write tool, NUNCA heredoc bash" |
| **research-mode ceremonia ligera** | global | skill-adaptation | Phase 1 heavy + 2 interrupciones usuario (§3, §4.1) | Añadir a `scope` skill + `/flow`: triage "research/audit feature" → scope ligero (problema+corpus+rúbrica), perspectives opcionales, sustancia temprana |
| **reviewer-independiente cuando autor=evaluador** | memory | technique | Mitigación meta-circular funcionó, cambió resultado (§2 ✅) | Memory `feedback_independent_reviewer_when_self_assessing.md` |
| **compare-context labels** | memory | technique | Neutralizó BLOCKER apples-to-oranges (§2 ✅) | Memory: técnica de audit — etiquetar fuentes por contexto antes de comparar |
| **pre-commit honesty anchor** | memory | technique | Previno optimism creep en scoring (§2 ✅) | Memory: comprometer la categoría más débil ANTES de puntuar el resto |

## 6. Living-spec deltas

**spec_drift: legitimate** — cumple los 3 criterios:
1. **Real edge case**: descubierto en Phase 3/4 — el spec.md de 002 no anticipó que una feature de research necesita ceremonia adaptada (lo descubrimos por la fricción real, no por cambio de opinión).
2. **No contradiction**: el delta no contradice el intent del spec (auditar poneglyph) — solo ajusta CÓMO se ejecuta una research-feature.
3. **Documented why**: las 2 interrupciones del usuario + el over-engineering de Commandment III lo motivan.

**Diff propuesto** (NO auto-aplicado — requiere tu aprobación):

```diff
--- spec.md §Naturaleza atípica
+++ spec.md §Naturaleza atípica
@@ tabla de adaptación atípica @@
+ | upfront | research-features: scope LIGERO (problema+corpus+rúbrica). Perspectives
+ |         | opcionales. Producir sustancia temprano; formalizar incremental.
+ |         | Evita over-engineering del proceso (Commandment III). |
```

Rationale: este /flow gastó ~15K tokens en ceremonia antes del primer hallazgo; el usuario lo señaló 2 veces. El delta formaliza que research-features arrancan ligeras. NO es scope creep — es un edge case real del propio modelo de fases aplicado a research.

## 7. Commandments audit

| # | Commandment | Cumplido? | Evidencia / Violación |
|---|---|---|---|
| I | Honest symbiosis | ✅ | Perspectives presentadas honestamente al usuario; BLOCKER negativo (Critic=3) no suavizado; reviewer confirmó sin auto-indulgencia |
| II | Factual truth | ✅ | 17 fuentes WebFetch verificadas; 3 URLs dead resueltas; grounding validado por reviewer (spec-kit 106,797★, METR literal) |
| III | Code quality / simple by default | ⚠️ | **VIOLACIÓN PARCIAL**: over-engineering del proceso — protocolo pesado pre-sustancia. Usuario interrumpió 2 veces. Ver forensics abajo |
| IV | Blocking quality gates | ✅ | 2 hard gates humanos; reviewer Opus APPROVED_WITH_WARNINGS bloqueante; AC8 honestidad chain en 4 HUs |
| V | Understand before acting | ✅ | Phase 1 scope + drillme antes de tocar nada; advisor consultado pre-spec |
| VI | Security without ambiguity | ✅ | Audit READ-ONLY del sistema; sin edits a paths sensibles; sin operaciones destructivas |
| VII | Performance and efficiency | ⚠️ | **VIOLACIÓN PARCIAL**: ~15K tokens de ceremonia antes del primer dato. Paralelismo W1-W4 sí eficiente (71% parallel score). Neto: mejorable en upfront |
| VIII | Optimal meta-prompting | ✅ | Prompts a builders con contexto completo + Read instructions (Arch H); reviewer Opus con encargo explícito anti-complacencia |
| IX | Observability and self-improvement | ✅ | Esta retro + el audit mismo SON el loop de self-improvement; living-spec delta + promotions producidos |
| X | Poneglyph maintainability | ✅ | El audit formaliza el proceso de "qué sobrevive post-DW"; report es input directo a mantenibilidad |

**8/10 ✅ · 2/10 ⚠️ · 0/10 ❌**

### Commandment violations forensics

**Commandment III + VII (over-engineering del proceso)** — están acopladas:
- **Momento**: Phase 1-2.5. Spec + tasks (7 US) + validations + 3 perspectives + 4 refinamientos antes de cualquier hallazgo.
- **Alternativa**: para research-features, scope ligero (problema+corpus+rúbrica) → arrancar research → formalizar incremental. La sustancia debió llegar ~15K tokens antes.
- **Action item**: research-mode ceremonia ligera (promotion §5) + living-spec delta §6.
- **Nota honesta**: el usuario pidió `/flow --full` explícitamente y "trabajo detallado y profesional" — parte de la ceremonia era lo solicitado. Pero el equilibrio protocolo/sustancia se inclinó demasiado a protocolo, y las 2 interrupciones lo confirman. No es excusa: el Lead debió producir señal antes.

## 8. Action items

| Action | Owner | Trigger | Due |
|---|---|---|---|
| Aprobar/rechazar las 5 promotions de §5 | Usuario | Revisión de esta retro | Ahora |
| Aprobar/rechazar living-spec delta §6 | Usuario | Revisión de esta retro | Ahora |
| Aplicar promotions aprobadas (Lead escribe memory/rules) | Lead | Tras aprobación | Esta sesión |
| Decidir cuáles de los top-10 findings (findings.md) se convierten en próximos /flow | Usuario | Post-retro | Próximo sprint |
| Priorizar finding #1 (Critic dogfooding) — el BLOCKER del propio sistema | Usuario | — | Antes de añadir capacidades nuevas |
| Considerar finding #2+#3 (workflows-integration + compose layer doc) dado el reframe DW | Usuario | — | Próximo sprint |

## Resumen de cierre

Feature 002 entregó un audit honesto que confirmó su propia hipótesis: poneglyph es fuerte en diseño, débil en evidencia de uso. El proceso tuvo fricción real (heredoc bug, over-engineering upfront) capturada sin suavizar. La mitigación meta-circular funcionó. El trabajo NO es obsoleto frente a dynamic workflows — es governance layer. Próximo paso natural: dogfood real (finding #1) antes de añadir capacidades.
