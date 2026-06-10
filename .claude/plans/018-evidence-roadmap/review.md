# Review — 018-evidence-roadmap (Phase 4)

---
verdict: APPROVED_WITH_WARNINGS
date: 2026-06-10
reviewer: critic (fresh-context citation sampler agent + Lead structural audit)
rounds: 2 (NEEDS_CHANGES → fixes applied in locus → re-closed)
---

## Method

Research feature → review = rigor audit per spec AC1-AC5 + validations.md checklists. Independent verification: a **fresh-context sampler agent** spot-checked **12 citations chosen to AVOID claims already refuter-verified during build** (true independence, not repetition), across all 5 dossiers.

## Round 1 — findings

| # | Severity | Finding | Locus | Resolution |
|---|---|---|---|---|
| F1 | **MAJOR** | "Braintrust 20-50 examples" — figure NOT on the cited page (page is qualitative) | W2.md + decision-memo-W2.md | Fixed: figure dropped; convergence re-anchored on Anthropic (verbatim-verified) + LangSmith 10-20 |
| F2 | MINOR | Position-bias ">10% accuracy swing" headline not locatable in paper; actual reporting = Position Consistency varying by judge/task (0.76-0.82 examples); scope is general+software-dev, not code-specific | W2.md ×2 + memo | Fixed: corrected wording |
| F3 | MINOR | HELMET "0.559 correlation" not locatable; verified wording = "no synthetic task >0.8 avg; RULER <0.85" | W3.md ×2 | Fixed |
| F4 | MINOR | ClawHavoc growth figures (824+/~900) unverifiable from reachable primaries; verified = 341/2,857 audited, 335 AMOS | W4.md ×2 | Fixed: growth downgraded to UNVERIFIED |
| F5 | NIT | One finder reported "sandbox docs 404" — false (page fetched successfully by two other agents same day); caught at refuter, never entered artefacts | W5 provenance | Documented in W5 refuter log |

**Sampling result post-fix: 12/12 sampled claims now supported as stated** (8 verbatim-supported in round 1 + 4 corrected). **Pattern named: precision inflation** — finders attach specific numerals to sources that support only the qualitative claim. No fabricated sources, no inverted findings anywhere in the corpus.

## 5-section checklist (adapted to research deliverables)

| Section | Verdict | Notes |
|---|---|---|
| Correctness | ✅ post-fix | 12-claim independent sample + 36 claims refuter-verified during build (7-8 per WS); 2 finder errors (issue #532/#556 mixup, GEPA numbers) caught pre-artefact; 4 caught at critic |
| Quality | ✅ | RIGOR 1-6 checklist holds per dossier (validations.md smokes green per US); counter-evidence sections non-empty in all 5; UNVERIFIED markers used honestly (incl. self-flagged fabricated stats by W4 finders) |
| Security | ✅ n/a-adapted | Read-only research; no secrets touched; W4 handles security content with incident-grade sourcing |
| Performance | ⚠️ noted | ~21 agents total (within caps: ≤4/HU + US3 exception 5 + critic sampler); subagent token spend material but bounded; US6 inline as designed |
| Maintainability | ✅ | Every claim dated; tiers explicit; gaps declared section per dossier; roadmap entries each cite ≥1 A/B (35 evidence refs) |

## Spec AC traceability

- **AC1 (rigor)** ✅ post-fix — tier+URL+date on decision-changing claims; counter-evidence + refuter logs present ×5; no C/D grounds a memo decision (Braintrust fix removed the one borderline case).
- **AC2 (coverage)** ✅ — 5 dossiers + 5 memos; W5 timebox documented (1 fan-out + 1 verify, 4 agents).
- **AC3 (verification)** ✅ — 12 sampled, failures triggered NEEDS_CHANGES, fixed, re-verified. Gate honored, not waived.
- **AC4 (synthesis)** ✅ — roadmap-019.md exists; 14 entries across 4 proposed features, each citing ≥1 A/B; Tensions section (6); ratification pending in retro.
- **AC5 (seeds)** ✅ — 4 seeds with provenance headers (3 session dossiers + graphify scout added at REFINE).

## Spec-drift (for living-spec loop)

| Drift | Classification |
|---|---|
| Graphify angle added to W3 + US3 cap 4→5 | **Ratified in-flight** (gate-2→3 REFINE, recorded in spec/index) — no action |
| Seeds 3→4 (graphify scout) | Additive, recorded in spec W3 row; AC5 text still says "the 3 conversation dossiers" → **minor living-spec delta proposed** (retro) |
| US5 inventory corrections (CI exists; jobs unverified) | Truth-fix during REFINE, recorded — no action |

## Warnings (carried into retro)

1. **Precision inflation is the systemic failure class** of agent research — every numeric in a claims table should be quote-anchored or carry `[Probable]`. Promotion candidate.
2. Several load-bearing numbers are Tier B vendor-measured (84% sandbox prompts, Anthropic team figures) — labeled, but 019+ consumers must not launder them into "measured fact".
3. Declared evidence gaps remain open (Fable-5-era degradation, graph-vs-LSP, N=2-5 test-selected best-of-N, memory-sync) — roadmap entries that touch them are pilots by design.

## Verdict

**APPROVED_WITH_WARNINGS** — proceed to Phase 5 (retro). The corpus is citation-faithful post-fix, gaps are honest, and the synthesis traces to evidence.
