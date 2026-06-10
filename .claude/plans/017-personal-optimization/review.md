---
spec: 017-personal-optimization
tasks_implemented: [US1, US2, US3, US4, US5, US6, US7, US8, US9, US10, US11, US12, US13, US14, US15]
oracle_source: both
created: 2026-06-10
phase: 4
status: closed
review_level: full
verdict: APPROVED_WITH_WARNINGS
spec_drift: legitimate
findings_count:
  blocker: 0
  major: 2
  minor: 3
  nit: 1
review_panel_invoked: attempted — FAILED (account session limit killed all 4 agents, ~278K tokens, 0 verdicts returned); fell back to inline per Edge 4
security_review_invoked: no — no auth/payments/credentials code; security checks inline (hooks surface assessed)
review_patterns_modes: [quality]
author_bias: DECLARED — this session built 12/15 HUs and reviewed them; panel was the offset and it failed on infra. Re-runnable post-limit-reset if desired.
---

# Review — 017-personal-optimization

## Veredicto

**APPROVED_WITH_WARNINGS** — the spec problem is solved end-to-end (8/8 ACs delivered or closed via documented findings); the 2 MAJORs found during this review were fixed and re-verified in-loop; warnings: residual author-bias (panel infra-failed), behavioral validation of style/hooks pends next session by spec constraint.

## Oracle ejecutado

| HU | Oracle source | Resultado |
|---|---|---|
| US1/US3/US2 (W1) | validations.md | PASS (closed pre-session, history in state.json) |
| US4 | tests.md §T4.1-3 | PASS — red→green verified live (predicted reds matched); suite green |
| US5/US6/US7 | validations.md | PASS — deletions verified, archive + resume intact, AC greps 0 |
| US8 | validations.md §US8 | PASS — JSON parses, schema-verified fields only, sync regenerated |
| US9 | validations.md §US9 | PASS via documented REVERT (live smoke: field blocks Skill tool) + critic 347 / retro 350 lines |
| US10 | validations.md §US10 | PASS — 21/21 descriptions ≤1024; 51 ToCs; rubric vendored+wired |
| US11 | tests.md §T11.1-3 | PASS — red verified, 7 tests green, binary E2E smoke |
| US12 | tests.md §T12.1-3 | PASS — event verified in docs first; 9 tests green; real-binary smoke injected Skill(drillme) |
| US13/US14/US15 | validations.md | PASS — greps present ×3; rubric pass + dry-run 42 lines; memory 16/16 consistent |

## Checklist

### Correctness
- [x] spec.md problem solved: always-loaded 264→150 lines (AC4), truth debt cleared (AC1 greps = 0), hooks fixed+tested (AC2), repo slim (AC3), inline-first doctrine canonical (AC5), es-ES style spec'd (AC6 — behavioral check next session), settings modernized (AC7 — fallback/disable findings documented), skills health (AC8).
- [x] Happy path E2E: hook binaries smoke-tested end-to-end (auto-approve, learning-inbox, skill-activation); settings parse + sync 9/9; /flow resume intact. TRUE session-start E2E validates next session (spec constraint).
- [x] Edge cases from oracle covered (malformed stdin ×3 hooks, empty inputs, no-match silence).

### Quality
- [x] Coverage respects test-policy `auxiliary`: 3 forced-TDD HUs honored red→green (US4/11/12); suite 102/102.
- [x] Style matches project (new hooks mirror security-gate patterns; readHookStdin shared).
- [x] No duplication introduced — net REMOVED duplication (test mirror killed via lineHasSecret; retro Step 14 dedup).
- [x] No over-engineering: review-patterns thresholds all OK-band (functions <30 lines, params ≤4, nesting <3).
- [x] Naming consistent (lineHasSecret/safeParse/decidePermission/extractCandidates follow existing camelCase verb style).

### Security
- [x] 0 hardcoded secrets in diff (grep clean).
- [x] Inputs validated at boundaries: all 3 new hooks silent-exit on malformed payloads (tested).
- [x] skill-activation injection surface: reads LOCAL skill files only (repo = trust boundary); injection is a fixed template + dir-name interpolation; top-2 cap; slash-prompts skipped. Residual: a compromised local SKILL.md could steer injection — same trust level as the skill auto-activating natively. Accepted.
- [x] learning-inbox persistence: transcript snippets (≤160 chars) written to `.claude/learned/` — F1 (MAJOR) found: dir was NOT gitignored → fixed in-review.
- [x] auto-approve refactor preserves the full block-list (17-command dangerous matrix green).

### Performance
- [x] skill-activation runs per prompt: 2 readdirs + ~30 head-reads (2.5KB cap) — ms-scale, acceptable.
- [x] instructions-loaded registered async (fire-and-forget) — no prompt latency.
- [x] No N² / no I/O-in-loop introduced.

### Mantenibilidad
- [x] Comments only for non-obvious whys (confidence weights, lastIndex gotcha, caps).
- [x] 0 TODOs/FIXMEs in changed files.
- [x] Tests in canonical `__tests__/`; bodies ≤350 (critic 347, retro 350, project-onboard 153).
- [x] F2 (MAJOR) found: error-recovery.md hook table stale post-US12 → fixed in-review.

## Findings (con severidad)

| Severidad | Descripción | Archivo:línea | Estado / Recomendación |
|---|---|---|---|
| MAJOR | `.claude/learned/` no estaba gitignored — learning-inbox persiste snippets de transcript (posibles secretos) que `git add -A` commitearía | `.gitignore:75` | **FIXED in-review** — entrada añadida, `git check-ignore` verificado |
| MAJOR | Tabla Hook Reliability desactualizada tras US12 (decía "UserPromptSubmit: none registered (planned)") — truth-debt contra el propio AC1 | `.claude/rules/error-recovery.md:92-101` | **FIXED in-review** — tabla refleja el registro real (Stop ×2, UserPromptSubmit, InstructionsLoaded) |
| MINOR | 3 ficheros del plan 018 (activo en paralelo) arrastrados a commits de 017 por `git add -A` (d1367f4, 2b78b81, efc187f) — historia mezclada, contenido intacto | commits citados | Futuro: `git add` con paths explícitos durante features; lección para retro |
| MINOR | Solapamiento de ramas: `d951dcf` (html-report-palette-md-charts) contiene el mismo fix stdin de US4 + el research file — conflictos al fusionar | rama externa | Resolver merge a favor de 017; el research file ya es idéntico |
| MINOR | Panel independiente murió por límite de sesión (4/4 agentes, 0 veredictos) — la preocupación de independencia queda parcialmente sin compensar | workflow wadke4rw4 | Opcional: re-lanzar panel post-reset (14:20) antes del retro; verdict no bloqueado por disponibilidad de infra (Edge 4) |
| NIT | Heurísticas del inbox (error-resolution `\w*error\w*…passing`) pueden capturar ruido de conversaciones sobre tests | `.claude/hooks/learning-inbox.ts:50-54` | Monitorizar en el primer retro que consuma el inbox; pesos de confianza ya documentados |

## Living-spec deltas detectadas (spec_drift: legitimate)

1. **AC7 — fallback models + disable-model-invocation**: el schema NO tiene `fallbackModel` (verificado contra schemastore) y `disable-model-invocation: true` bloquea la invocación explícita vía Skill tool (smoke en vivo) — ambas mitades cerradas por hallazgo documentado, no por entrega literal. Diff propuesto: AC7 reformulado a "version gate + permisos revisados + hallazgos de campo documentados". Razón: edge cases reales descubiertos en build; no contradicen la intención ("modernizar a capacidades actuales").
2. **AC3 — "only the active plan remains"**: quedan 017 + 018 (activo, posterior al spec) + 001 (retenido por referencia canónica, ratificado) + research files. Razón: retenciones justificadas y ratificadas; la intención (sin planes muertos a la vista) se cumple.
3. **US14 scope**: ampliado en build por decisión explícita del usuario (menú completo de componentes vs mínimo planificado). Razón: ratificado por el decisor en el momento; sin contradicción con el spec.

## Tests ejecutables

- **Comando**: `bun test ./.claude/hooks/` → **102 pass / 0 fail** (132 asserts, 5 files). `bun x tsc --noEmit` → 0 errors.
- **Regresiones**: ninguna.

## Drillme — Phase 4 (3/4 categorías canónicas)

1. `[context]` Spec drift → sí, legitimate ×3 (sección anterior); propuesto para ratificación en retro.
2. `[failure]` E2E happy path → mecánicamente verificado (binarios, parse, sync, resume); el E2E real (arranque de sesión) valida la próxima sesión por constraint del spec — declarado, no asumido.
3. `[failure]` Edge case que el usuario sufrirá → el descubierto (learned/ commiteable) se arregló; queda el ruido potencial del inbox (NIT, monitorizado).
4. `[approach]` Cobertura vs policy → auxiliary respetada; forced red→green ×3 con rojos predichos verificados.

## Next step

**APPROVED_WITH_WARNINGS** → Fase 5 (`/retro`). Warnings que el retro debe consumir: panel infra-failed (independencia parcial), validación conductual next-session (estilo es-ES + hooks nuevos + skill-activation en prompts reales), lección `git add -A` vs paths explícitos, merge pendiente con `html-report-palette-md-charts`.
