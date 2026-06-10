---
id: 019-quality-gates
created: 2026-06-10
approved: 2026-06-10
mode: standard
phase: 1
status: closed
closed: 2026-06-10
---

# Problema

Poneglyph's quality gates are weaker than the evidence supports: code review defaults to a deliberative ≥4-agent panel (the measurably weak form for code — verifier gap, LLM-judge ~80% FP vs deterministic 0%), meta-config changes ship with no regression harness, and best-of-N with test-based selection — the one published win pattern for hard tasks — has no named, loggable practice here.

# Resultado esperado

- Code review (Phase 4) runs the evidence-strong form by default: runnable mechanical checks + ONE fresh-context reviewer constrained to correctness/requirements; deliberative panels remain only for DECISIONS.
- Every meta-config change (CLAUDE.md, skills, rules, output-style) can be regression-checked against a deterministic eval corpus built from real, documented failures.
- Hard + testable tasks have a named best-of-N pattern whose outcomes are logged, generating the novel evidence W1 declared missing.

# Success criteria (medibles, Given/When/Then)

- **AC1 (019.1)**: Given a completed feature entering Phase 4, when `critic` runs on code, then it executes runnable checks + exactly ONE fresh-context reviewer (correctness/requirements only), and NO ≥4-panel fires by default; panel escalation remains documented as decision-review-only (decision-stress-test).
- **AC2 (019.1)**: Given the redesigned `critic` skill file, when read, then every removed/retained mechanism cites its 018 evidence (W1 D1/D3, W2 D1) — no silent regression of the old default.
- **AC3 (019.2)**: Given `.claude/evals/` exists, when the harness runs, then ~20 cases sourced from REAL documented failures (memory, retros, incidents — e.g. skill-trigger parse, banned-phrase regex, es-ES detect, BLUF position) grade deterministically (no LLM judge) with expected pass ≈100%, and a suspect-the-eval-first protocol is written.
- **AC4 (019.2)**: Given any meta-config change, when the author follows the documented workflow, then running the eval harness is a named step (wired into the relevant skill/command), not tribal knowledge.
- **AC5 (019.3)**: Given a hard + testable task, when the best-of-N pattern is invoked, then 2-3 `claude -p --worktree` variants run, the test suite selects (human tiebreak), worktrees are cleaned up, and the outcome (win/loss/cost) is logged to a persistent record.

# Out of scope (explícito)

- Tier 2-4 roadmap entries (020 context-policy, 021 platform, 022 operations) — separate features.
- LLM-as-judge graders in the eval harness — deterministic-first is the point; judge graders are a future extension if ever.
- Corpus >20 cases at launch — grows organically per new real failure; no synthetic filler cases.
- Automating best-of-N as a default execution mode — 019.3 is a PILOT on explicitly hard+testable tasks only; promotion decision needs the logged evidence first.
- Touching `decision-stress-test` — panels stay as-is for decisions; only their role as code-review default is removed.

# Constraints

- `bun test ./.claude/hooks/` stays green throughout.
- Eval graders must be deterministic and runnable offline (bun scripts); no network, no model calls.
- 019.1 must not break `/flow` Phase 4 wiring (verdict contract APPROVED/WITH_WARNINGS/NEEDS_CHANGES/BLOCKED unchanged).
- Every design choice traces to the 018 evidence corpus (`.claude/plans/018-evidence-roadmap/`) — no new unverified claims.

# Open questions

- None blocking. Ratified at gate-entry questionnaire (2026-06-10): panel demotion = complete (no opt-in flag for code), all 3 entries in scope, corpus starts at ~20 real-failure cases.

# Notas de adaptación

- Cuestionario reducido por brief detallado (roadmap-019.md = spec source): 3/8 preguntas, todas de ratificación.
- Drillme reducido — respuestas autoevidentes desde la evidencia 018: root problem = verifier gap en el propio meta-sistema (no síntoma); si no se hace, Phase 4 sigue pagando paneles caros con ~80% FP y los cambios de meta-config siguen sin red de regresión; sufre Oriol (coste tokens + falsa confianza en verdicts); MVP = AC1+AC3; out-of-scope cerrado arriba.
