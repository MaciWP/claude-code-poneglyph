---
spec: 018-evidence-roadmap
tasks: tasks/index.md
phase: 2.5
validation_mode: validation
test_policy: auxiliary
---

# Validations — 018-evidence-roadmap

Classification: US1-US6 **validation-mode** (files are exclusively `.md` research artefacts — no executable code in the entire feature, so no `tests.md`). US0 closed in Phase 1 (skip-justified: artefact copy verified by existence). Untestable rate: 0% — every HU has a structural+smoke oracle below.

## Shared rigor checklist (applies to US1-US5 dossiers — referenced as "RIGOR" below)

1. Every decision-changing claim carries **tier (A/B/C/D) + URL + date**.
2. `UNVERIFIED` marker present wherever confirmation failed (grep-checkable).
3. A `## Counter-evidence` (or equivalently-titled) section exists and is non-empty.
4. A refuter log exists: which claims were adversarially re-checked + outcome.
5. No Tier C/D claim is cited as the basis of a decision in the paired memo (C/D may appear as inspiration, labeled).
6. Seeds extended, not repeated: dossier does not re-derive findings already in `evidence/seed-*.md` (cross-references them instead).

## US1 — W1 Orchestration II

### Pre
- `evidence/seed-{anthropic,academic,industry}.md` exist (US0 ✅).
- `tasks/US1.md` approved (gate 2→3).

### Post
- `evidence/W1.md` + `decision-memo-W1.md` exist.

### Structural assertions
- W1.md: 3 angle sections (best-of-N interactive / bg-sessions non-vendor data / effort heuristics) + RIGOR items 1-6.
- Memo: each implication row cites ≥1 A/B finding; METR-lite appears as PROPOSAL (no implementation steps).

### Smoke
- `grep -c 'http' evidence/W1.md` > 10; `grep -i 'counter-evidence' evidence/W1.md` non-empty.
- Agent count documented ≤4.

### Cross-validations
- Memo claims trace to W1.md sections; no orphan implication.

## US2 — W2 Behavioral evals

### Pre
- `tasks/US2.md` approved.

### Post
- `evidence/W2.md` + `decision-memo-W2.md` exist.

### Structural assertions
- W2.md: 3 angle sections (regression tools / skill-creator eval mechanics / published config-regression cases) + RIGOR 1-6.
- skill-creator eval mechanics section present (mandatory — plugin ships installed).
- Memo: harness constraints only (set size, grading hierarchy, eval targets); zero implementation steps.

### Smoke
- `grep -i 'skill-creator' evidence/W2.md` non-empty; counter-evidence section non-empty.

### Cross-validations
- Grading-method constraints consistent with seed-anthropic verdict (rules-based > visual > LLM-judge) or divergence explicitly argued with newer A/B evidence.

## US3 — W3 Context measured

### Pre
- `tasks/US3.md` approved.

### Post
- `evidence/W3.md` + `decision-memo-W3.md` exist.

### Structural assertions
- W3.md: 3 angle sections (degradation benchmarks / mitigation comparisons / threshold provenance) + RIGOR 1-6.
- **Model-era flag on every benchmark claim**; if no Fable-5-era data: explicit "no recent measurement found" statement, no silent extrapolation.
- Memo: numeric threshold ONLY if A/B-backed; otherwise qualitative triggers declared as such.

### Smoke
- `grep -iE 'model (era|generation)|tested on' evidence/W3.md` non-empty.

### Cross-validations
- Memo policy consistent with seed-anthropic compression ratios where cited.

## US4 — W4 Platform

### Pre
- `tasks/US4.md` approved.

### Post
- `evidence/W4.md` + `decision-memo-W4.md` exist.

### Structural assertions
- W4.md: 3 angle sections (dotfile release patterns / memory evals / sandboxing+incidents) + RIGOR 1-6.
- Angle (a) claims labeled as **pattern-analysis** (documented mechanism, primary-source quote) — never presented as measurements.
- Memo: sync v2 direction + harvest direction + ≥2 security posture options with trade-offs; zero implementation steps.

### Smoke
- `grep -iE 'chezmoi|home-manager|stow' evidence/W4.md` non-empty; security section lists ≥2 options.

### Cross-validations
- sync v2 direction addresses the deploy-on-checkout flaw explicitly (references the stranded-branch incident context from spec).

## US5 — W5 Discovery

### Pre
- `tasks/US5.md` approved; inclusion rubric locked in US5.

### Post
- `evidence/W5.md` + `decision-memo-W5.md` exist.

### Structural assertions
- W5.md: 3 angle sections (published setups / official CC capability audit / emerging measured patterns) + RIGOR 1-6 + **timebox note** (1 fan-out + 1 verify round, ≤4 agents).
- Memo: candidates table ≤10 rows (capability · tier · value for poneglyph · Commandments fit · S/M/L) where every CANDIDATE meets the rubric (≥1 A/B or official CC doc); watchlist appendix holds the rest.

### Smoke
- `grep -i 'watchlist' decision-memo-W5.md` non-empty; candidates table row count ≤10.

### Cross-validations
- No candidate duplicates a capability poneglyph already has (diff against the inventory snapshot in US5 context).

## US6 — W6 Synthesis

### Pre
- All five `decision-memo-W{1..5}.md` exist (or deferred ones explicitly listed as gaps).

### Post
- `roadmap-019.md` exists at plan root.

### Structural assertions
- Every backlog entry: title · change · evidence refs (≥1 A/B) · Commandments · S/M/L · feature grouping.
- `## Tensions` section present — cross-memo conflicts surfaced with recommendation (or "none found", argued).
- Priority ordering: code-quality impact first; deviations justified inline.
- Unbacked ideas (if any) quarantined in a labeled footer, never mixed into the backlog.

### Smoke
- `grep -c 'W[1-5]\|seed-' roadmap-019.md` > 10.

### Cross-validations
- Each evidence ref resolves to a real section in `evidence/` (spot-check in critic per spec AC3).
- Executed inline with zero agents (absorbed decision) — stated in the artefact.

## Drillme — Phase 2.5

1. `[failure]` **Happy + edge?** Each HU carries the 5 categories; edge handling = explicit gap/UNVERIFIED/timebox rules rather than synthetic edge tests (honest for markdown oracles).
2. `[approach]` **Untestable HU?** None — 0% untestable; US0 skip is existence-verified, not untestable.
3. `[approach]` **Property-based fit?** N/A — no parsers/transforms; the RIGOR checklist is the invariant set and it is grep-checkable.
