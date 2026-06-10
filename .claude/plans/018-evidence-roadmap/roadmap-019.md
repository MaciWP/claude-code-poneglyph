# Roadmap 019+ — evidence-cited backlog (US6 synthesis)

> **Provenance**: synthesized INLINE with zero agents (absorbed decision: share-context principle) from `decision-memo-W{1..5}.md` + `evidence/` corpus, 2026-06-10. Priority axis (user maxim): **delivered code quality first**, then context hygiene, then platform robustness, then speed/cost. Every entry cites ≥1 Tier A/B (or pattern[doc]/T1) finding. Ratification pending in retro (spec AC4).

## Decision ↔ evidence table

| Decision | Key evidence (tier) | Memo |
|---|---|---|
| Mechanical verification + 1 fresh reviewer > panels for code | Verifier gap (A, seed-academic); deterministic 0% FP vs LLM-judge 80% FP (B, W2); Augment dropped ensembler (B, seed); MAST verification failures 23.5% (A, seed) | W1 D1/D3, W2 D1 |
| Best-of-N only DIY, N=2-3, tests-as-selector, hard tasks only | No product ships test-selection (B, W1); only measured solo run 75% waste (C); OpenHands +5.8pp @5 attempts (B, seed) | W1 D1 |
| Golden-prompt harness: 20-50 cases, deterministic first, per-config-change | Anthropic/Braintrust/LangSmith convergent (B); judge unreliability (A ×3); generic improvements measurably hurt (A, 2601.22025) | W2 D1/D2 |
| Context policy = qualitative triggers + consolidate-and-restart; NO numeric threshold | CONCAT ≈98% recovery (A, 2505.06120); 40%-rule = anecdote (D); gradient-no-cliff (A/B); naive compaction −10pts (A, ACON) | W3 D1 |
| Graphify → WATCHLIST | graph-over-LSP unmeasured; independent CC data ~7% or negative; category wins only hidden-dep tasks (B/A−) | W3 D3 |
| sync v2 = copy-on-apply from committed ref + staleness stamp + --dev | chezmoi model (pattern[doc]); stow/bare-repo reproduce the flaw; live 012-016 incident | W4 D1 |
| Memory: keep files, selective harvest, scheduled curation, vault-sync pilot | Full-context 72.90 > all products (A/B, Mem0's own table); selective 38.86% vs add-all 13.04% (A, 2505.16067); poisoning persists (A); `autoMemoryDirectory` official (A) | W4 D2 |
| Security: pick posture P1/P2/P3 explicitly + supply-chain hygiene | Sandbox docs (A); CVE-2025-54794 = string-rule bypass class (B); 84% fewer prompts `[vendor]`; realized threat = supply-chain (A/B incident catalog) | W4 D3 |
| Parallel sessions = operational practice WITH metrics, review-bounded | Reviewer abandonment top failure (A, 2601.15195); METR perception anti-signal (A); creator practice (B) | W1 D2, W5 C2 |
| ACE delta-curation on lessons/memory; human gate stays | ACE +10.6% (A, ICLR'26); Dynamic Cheatsheet (A, EACL'26); curated +16.2pp vs self-generated no-benefit (B, SkillsBench) | W5 C5, W4 D2 |
| Orchestrator heuristics: progress-ledger + stall≤2; budget composition; delegate-on-verbosity; rules short, binding first | Magentic-One (A); OpenHands MAX² bug (C); CC docs verbatim (B); IFScale 68%@500 (A) | W1 D3 |

## Backlog by proposed feature

### 019 — quality-gates (Tier 1: direct code quality)

| Entry | Change | Evidence | Cmd | Effort |
|---|---|---|---|---|
| 019.1 Critic redesign | `critic` = runnable checks + ONE fresh-context reviewer constrained to correctness/requirements; ≥4-panel escalation reserved ONLY for decisions (decision-stress-test), removed as code-review default | W1 D1/D3; W2 D1; seeds | IV | M |
| 019.2 Golden-prompt harness | `.claude/evals/`: 20-50 cases from real failures; deterministic graders (skill-trigger parse, banned-phrase regex, es-ES detect, BLUF position); run per meta-config change; ≈100% expected; suspect-the-eval-first protocol | W2 D1/D2 | IV, IX | M |
| 019.3 Best-of-N verificado (pilot) | Named pattern: `claude -p --worktree` ×2-3 on hard+testable tasks; suite selects; human tiebreak; worktree cleanup step; LOG outcomes (novel evidence) | W1 D1 | III, IV | S-M |

### 020 — context-policy (Tier 2: context hygiene)

| Entry | Change | Evidence | Cmd | Effort |
|---|---|---|---|---|
| 020.1 Consolidate-and-restart protocol | Structured-brief template (state/decisions/files/next) in `orchestrator-protocol` §context; restart at task boundaries and on confusion signals; auto-compact = fallback only; NO numeric threshold | W3 D1 | V, VII | S |
| 020.2 Orchestrator heuristics upgrade | Progress-ledger 5 questions + stall≤2→replan; global budget composition + partial salvage; delegate-on-output-verbosity; prune always-on rules, binding first | W1 D3 | VII, VIII | M |
| 020.3 ACE delta-curation discipline | Lessons/MEMORY.md edits = bullet-level deltas + separate curate pass; never compress-rewrite; human ratification stays | W5 C5 | IX, II | S |

### 021 — platform (Tier 3: robustness)

| Entry | Change | Evidence | Cmd | Effort |
|---|---|---|---|---|
| 021.1 sync v2 | Copy-on-apply from origin/main HEAD (or tag) in `sync-claude`; `--dev` escape hatch; `.sync-version` stamp + statusline staleness signal | W4 D1 | VI, X | M |
| 021.2 Feature-closure gate | `/retro` close requires: merged to main + sync run + doctor-style integrity check green (fixes the 012 artefacts-without-deliverable failure) | gap review + W4 D1 context | IV, X | S |
| 021.3 Memory harvest + curation | `harvest` pass over project memories → selective, ratified promotions; scheduled MEMORY.md pruning; ≤200-line index cap | W4 D2 | IX | M |
| 021.4 Memory vault-sync pilot | Backup-first (per-machine namespace) → optional `autoMemoryDirectory` git vault; pilot, unevaluated territory declared | W4 D2 | VI, IX | M |
| 021.5 Security posture decision | User picks P1/P2/P3 (P2 sandbox-lite recommended on macOS); delete decorative deny rules accordingly; adopt supply-chain hygiene regardless | W4 D3 | VI | S-M |

### 022 — operations (Tier 4: speed/cost, evidence-bounded)

| Entry | Change | Evidence | Cmd | Effort |
|---|---|---|---|---|
| 022.1 Notification hook | Stop/attention → desktop+sound; precondition for 022.2 | W5 C1 | VII | S |
| 022.2 Parallel-sessions practice + bg pilot | 2-3 sessions max, review-bounded; METR-lite metrics (merged/all, rework-14d, actual-vs-forecast) logged from day one | W1 D2; W5 C2 | VII, IX | M |
| 022.3 Usage/context visibility | ccusage on demand + context-% in statusline | W5 C3 | IX | S |
| 022.4 Config one-liners | `fallbackModel` chain; checkpoints/rewind usage note | W5 C6/C7 | VII, VI | S |
| 022.5 @claude Actions (work repos) | PR-comment automation + compounding CLAUDE.md loop — scoped to work repos | W5 C4 | IX, X | M |
| 022.6 Cross-model review pilot | Consult-second-model skill on hard diffs; qualitative evidence — pilot with notes | W5 C8 | IV | M |

## Tensions (cross-memo, resolved or surfaced)

1. **Panels vs mechanical verification** — user preference was "paneles sí, calidad primero"; the evidence (W1/W2/seeds) says deliberative panels are the weak form for CODE while mechanical checks + 1 fresh reviewer are the strong form; panels retain their A/B-supported niche in cheap-to-grade DECISION review. **Recommendation: 019.1 as specced; user ratifies the demotion explicitly.**
2. **Token cost of quality machinery (best-of-N, ledgers) vs quality-first maxim** — resolved by gating: only hard/delegated work pays the overhead.
3. **Parallelism dream vs review bottleneck** — every independent dataset relocates the bottleneck to the human reviewer; 022.2 lands practice and measurement together, capped by same-day review.
4. **Heavy always-loaded config vs A-tier "context files don't move success"** — reframed: CLAUDE.md buys efficiency (−28.6% runtime, A) + named-behavior compliance + style identity, NOT success rate; keep it small (IFScale, A) — validates 017's diet and constrains future additions (every rule displaces).
5. **P2 sandbox is macOS-only** — accept posture asymmetry between machines, or P1 everywhere; user call at 021.5.
6. **Minimal-convergence guard vs 14 backlog entries** — power users converge on minimal setups; entries are S/M-effort and several are practices (zero build); ratification should cut, not rubber-stamp.

## Gaps carried forward (honest)

- No Fable-5-era context-degradation measurement exists (W3) — thresholds inherited from 2024-25 are heuristics.
- No graph-over-LSP measurement (W3) — graphify watchlist trigger documented.
- No published N=2-5 test-selected best-of-N data (W1) — 019.3 generates novel evidence.
- No evaluated multi-machine memory-sync pattern (W4) — 021.4 is a declared pilot.
- METR-lite n=1 protocol is a synthesis, not a validated instrument (W1).

## Unbacked ideas (quarantined — no A/B support; kept for transparency)

- Fable-5 per-phase model A/B (ops note from W5 audit; no published per-phase data).
- Routines/scheduled cloud agents for poneglyph maintenance (orthogonal today; watchlist trigger defined).
