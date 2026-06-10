# Decision memo W5 — Capability candidates + watchlist

> Candidates meet the locked rubric (≥1 A/B or official CC doc + public artefacts + outcomes + active + single-user fit). Everything else → watchlist. Implementation 019+. Effort: S/M/L.

## Candidates (8 — under the ≤10 smell threshold)

| # | Capability | What it does for poneglyph | Tier | Commandments | Effort |
|---|---|---|---|---|---|
| C1 | **Notification hook** (Stop/attention → desktop+sound) | Attention routing — precondition for any parallel/background work; creator + 2 setups converge | B (Cherny Threads-confirmed) + A (centminmod artefact) | VII | **S** |
| C2 | **Parallel-sessions operating practice** (numbered checkouts/worktrees + notifications) | The evidence-backed version of "going faster": independent full sessions, human routes attention; pairs with W1's bg-pilot metrics | B (creator practice; W1 industry convergence) | VII | **S** (practice + C1) |
| C3 | **Usage/cost/context visibility** (ccusage + context-% in statusline) | Answers Commandment IX questions on demand without rebuilding telemetry; 15.9k★ adoption | A/B | IX | **S** |
| C4 | **@claude GitHub Actions / compounding loop** | PR-comment → CC fixes / updates CLAUDE.md; automates part of the retro-promotion loop on the work repos | B (Anthropic internal + creator) | IX, X | **M** |
| C5 | **ACE-style delta-curation discipline** for MEMORY.md/lessons | Append/replace bullet-level deltas + separate curate step; never compress-rewrite lessons; human gate stays (SkillsBench validates it) | A (ICLR'26 + EACL'26 convergent) | IX, II | **S** (discipline change, not subsystem) |
| C6 | **`fallbackModel` chain** in settings | Sessions survive 529/overload; one-liner | A (official docs) | VII | **S** |
| C7 | **Checkpoints/rewind usage practice** | In-session undo for exploration (bash-file caveat known); complements git | A (official docs, GA) | VI | **S** (zero build) |
| C8 | **Cross-model review skill** (consult second model on hard diffs) | Independent perspective without panels; qualitative evidence only — pilot-grade | A (artefacts) / C (outcomes) | IV | **M** |

## Watchlist (rubric-failed or premature — re-evaluate on trigger)

| Item | Why not now | Trigger to revisit |
|---|---|---|
| GEPA/DSPy prompt optimization (+6% avg vs GRPO, Tier A) | requires the W2 eval harness first; auto-optimized prompts don't transfer across models | golden-prompt suite lands and stabilizes |
| Routines (scheduled cloud sessions) | orthogonal to local meta-layer; preview-grade | a real recurring unattended need appears |
| Agent Teams | experimental; documented limitations (no resumption, one team); contradicts inline-first evidence | GA + W1 bg-pilot success |
| Remote control | assumes interactive steering away from desk | mobile workflow need |
| Live-SWE-agent / Trace2Skill / EvoSkills | single unreplicated preprints (one self-labeled WIP) | replication appears |
| Session search/restore tools | maintenance status per-tool unverified | a concrete "lost session" pain recurs |
| Injection-detection hook (parry-class) | overlaps security-gate; posture decision (W4 D3) comes first | posture P2 adopted |
| Memory-bank synchronizer agent | single setup, no outcomes | — |
| Observability dashboard | contradicts poneglyph's own telemetry-cut evidence (0 executions) | never, absent new need |
| Browser-loop UI verification | claude-in-chrome connector currently broken (known memory) | connector fixed |
| TDD-guard hook | project policy is `auxiliary`; relevant only for business-critical repos | work-repo onboarding with `business-critical` policy |

## Guard rail (from the counter-evidence)

**Every adoption must displace something or be near-zero-cost.** The published power users converge on minimal setups (creator: "surprisingly vanilla"); poneglyph already carries more machinery than any setup surveyed. C1-C3+C5-C7 are S-effort additions; C4/C8 are M and must earn their place at ratification.

## Tensions for US6

- C2 (parallel sessions) vs W1's review-bottleneck finding: adopt WITH the W1 metrics (merged/all, rework-14d) — practice and measurement land together.
- C4 (@claude automation) vs minimal-convergence: it's the one M-effort candidate with internal-Anthropic validation; scope to work repos, not poneglyph itself.
- C5 formalizes what retro already does — the cost is discipline, not code; failure to adopt costs nothing except staying exposed to context-collapse on lessons files.
