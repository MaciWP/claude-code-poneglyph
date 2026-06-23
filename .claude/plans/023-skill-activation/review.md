---
spec: 023-skill-activation
phase: 4
review_level: standard
verdict: APPROVED_WITH_WARNINGS
spec_drift: legitimate
findings_count:
  blocker: 0
  major: 0
  minor: 2
  nit: 0
fresh_reviewer_invoked: yes
security_review_invoked: no (n/a — no auth/payments/secrets touched)
review_patterns_modes: []
created: 2026-06-23
---

# review.md — 023-skill-activation

## Veredicto: APPROVED_WITH_WARNINGS

El problema raíz de spec.md (el Lead no usa skills de forma fiable) está resuelto en la medida verificable headless: hay una capa determinista barata que surface skill-advisor + shortlist en todo trabajo no trivial, y la tasa de surfacing medida sube de **50% → 100%** en un set ES+EN. Dos verificaciones quedan diferidas por entorno (no son cambios de código): la mitad conductual de AC2 (¿el modelo invoca tras el surface?) valida en próxima sesión, y `/doctor` es interactivo (sustituido por un check de budget determinista).

## Base checks

| Check | Resultado |
|---|---|
| `bun test ./.claude/hooks/` + rank tests | ✅ 129 pass, 0 fail |
| Secrets scan en diff nuevo | ✅ ninguno |
| `skill-activation-rate.ts` (AC2 medición) | ✅ work 50%→100%, trivial 0 ruido, budget 0/24 sobre cap |

## 5-section checklist

- **Correctness**: las 4 HUs entregan lo planificado; trazabilidad AC→código confirmada por reviewer de contexto fresco (4 MET, 1 PARTIAL→cerrada, 1 NOT-MET→cerrada con medición). Happy path verificado por smoke real (caso auth ES: antes vacío, ahora skill-advisor).
- **Quality**: estilo coherente con el repo; `matchSkills`/`buildInjection` preservados para no romper tests existentes; sin duplicación (rank reutiliza el patrón de loadSkills).
- **Security**: n/a — no toca auth/payments/secrets. Sin secrets en diff.
- **Performance**: el hook sigue sin LLM (lectura de heads); rank() es O(skills·tokens), trivial.
- **Maintainability**: when_to_use separado de description (patrón oficial); reglas directivas en flow.md sin bloat always-loaded.

## Trazabilidad de ACs (post-cierre de gaps)

| AC | Veredicto | Evidencia |
|---|---|---|
| AC1 hook shortlist+motivo+skill-advisor determinista | ✅ MET | `processPayload`/`matchWithReasons`/`buildShortlistInjection`; tests T2.1-T2.5 |
| AC2 medir activación ES/EN antes/después | ⚠️ MET (determinista) | `skill-activation-rate.ts`: 50%→100% surfacing, baseline registrado. Mitad conductual (model invoca) = next-session |
| AC3 skill-advisor lee disco, ≤5, ratifica | ✅ MET | `rank.ts` (ambas rutas, dedupe, ≤5) + SKILL.md AskUserQuestion; 4 tests |
| AC4 24 skills description+when_to_use ES/EN ≤1536 | ✅ MET | 24/24 con when_to_use+Keywords; budget 0 sobre cap (max 1519); `/doctor` manual opcional |
| AC5 flow.md + orchestrator imperativo | ✅ MET | flow.md SIEMPRE "INVOKE the phase skill"; orchestrator §1 nota |
| AC6 tests verdes | ✅ MET | 129 pass / 0 fail |

## Findings

| Sev | file | Finding | Estado |
|---|---|---|---|
| minor | spec.md AC4 | conteo "22"→"24" (drift de scope) | ✅ corregido |
| minor | AC2 / evals | mitad conductual no medible headless | documentado; valida next-session (memoria behavioral-AC) |

## Spec-drift: legitimate

- Conteo 22→24 skills (corregido en spec).
- AC4 `/doctor` → sustituido por check determinista de budget + `/doctor` como confirmación manual opcional. Delta razonable (Phase 5 lo ratifica).

## Reviewer de contexto fresco

Invocado (read-only, correctness/ACs). Detectó AC2 NOT-MET y AC4 PARTIAL — ambos atendidos con la medición determinista + corrección de conteo. Sin BLOCKERs reales (los "blocker" del reviewer eran ACs de verificación, cerrados con medición, no defectos de código).

## Drillme — Phase 4
1. `[context]` Spec drift → legitimate (conteo + /doctor), ratificable en retro.
2. `[failure]` Happy path E2E → smoke real ES confirma surface donde antes 0.
3. `[failure]` Edge no testeado que el usuario tocará → la mitad conductual (¿el Lead obedece el surface?) — known, next-session.
4. `[approach]` Coverage vs policy → auxiliary; US1/US2 tdd:forced cumplido (rank + processPayload con tests rojos→verdes).

## Next
→ /retro (APPROVED_WITH_WARNINGS).
