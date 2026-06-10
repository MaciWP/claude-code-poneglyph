# Decision memo W3 — Lead context policy + code-graph verdict

> Constraints only — implementation 019+. Every constraint cites ≥1 Tier A/B finding from `evidence/W3.md`. No numeric threshold is proposed because none is A/B-defensible (angle c).

## D1 — Context policy: qualitative triggers, not a percentage

| Trigger | Action | Evidence |
|---|---|---|
| Task boundary reached (HU closed, feature phase done) | **Consolidate-and-restart**: write a structured brief (state, decisions, files touched, next step) → fresh session/`/clear` from that brief | A: CONCAT recovers ~98% of single-turn (93.0→90.9 vs 59.1 sharded); A: ReAct saturates ~60 rounds while managed context reaches 500 |
| Mid-task, context filling with exploration dumps | Delegate the READ to a subagent returning a summary (context-compressor use) — already doctrine; W3 adds the why-not-compact: naive summarization costs ~10pts | A: ACON (FIFO 45.8 / summary 43.5 vs 56.0); B: all compactors lose artifact state (2.19-2.45/5) |
| Observed confusion / repetition / contradiction | Treat as context poisoning (unreliability +112% is the failure mode, not aptitude) → consolidate-and-restart, do NOT keep prompting in-thread | A: Lost in Conversation decomposition |
| Long task ahead | Pre-task note-to-file of current state, then start clean | A: MemGPT files 93.4 vs summarization 35.3; B: files beat graph memory 74.0 vs 68.5 |
| **Forbidden**: fixed "X% utilization" rule | — | D-only provenance (40% rule = anecdote); A: gradient no cliff (Chroma); B: Anthropic "gradient rather than hard cliff" |

- Auto-compact = fallback, never policy (no vendor task-impact numbers; naive compaction is the measured loser).
- Artifact state (files created/modified, decisions) is what ALL compactors measurably lose → poneglyph's structured-brief format MUST carry exactly that (aligns with /flow `state.json` + plans/ artefacts — the existing mechanism is the evidence-backed one).

## D2 — What this changes in existing doctrine

- **Strengthens** (no change needed): subagents-as-context-compressors for reads; plans/ artefacts as session-crossing memory; fresh-session-per-feature-phase.
- **Adds**: an explicit consolidate-and-restart protocol (the brief template) instead of marathon sessions or trusting `/compact` — candidate for `orchestrator-protocol` §context (019+).
- **Removes**: any temptation to adopt a numeric utilization threshold in rules (would be exactly the kind of non-executable numeric rule `feedback-rules-must-be-generation-executable` warns about, now also evidence-refuted).

## D3 — Graphify verdict: **WATCHLIST** (not adopt, not discard)

| Factor | Finding | Evidence |
|---|---|---|
| Marginal value over installed LSP | **Unmeasured by anyone** — the decisive unknown remains open | B: CodeCompass (graph wins only hidden-dependency tasks, +23.2pp vs vanilla; BM25 ≥ graph elsewhere); A-: graph agent = 90% quality at 10× fewer tokens |
| Independent end-to-end CC data | ~7-8% savings or net-negative (#580); fix (PR #891) unverified post-release | seed-graphify + W3(d) |
| Fit to Oriol's repos | TS-heavy + LSP installed = the weak-fit profile; sweet spot is 500+ file polyglot monorepos | seed-graphify; B: code-review-graph Express <1× |
| Re-evaluate when | (a) a measured graph-vs-LSP comparison appears, (b) #580 fix gets re-measured, or (c) work lands on a big polyglot monorepo | — |
| Optional decisive test | 1-hour self-A/B (10 fixed questions, with/without `/graphify .`) on the largest cross-dependency repo — generates the data nobody has published | aligns `feedback-measure-dont-estimate` |

## D4 — Honest gaps (carried to US6)

- No independent degradation curve for Fable-5-class models — every inherited threshold is a 2024-25-era heuristic.
- No measured "subagent-summary vs main-context" comparison on downstream coding quality — the context-compressor doctrine rests on B-tier vendor guidance + A-tier adjacent results, not a direct test.
- Synthetic benchmark ↔ real task correlation is weak (0.56-0.8) — both alarmism and complacency are under-determined.

## Tensions for US6

- D1's fresh-session discipline vs the cost of re-orientation each restart: the structured brief is the bridge, and its quality becomes load-bearing — connects to W1's Magentic-One ledger (the brief ≈ task ledger) and to /flow's existing state.json.
- Graphify WATCHLIST vs user's interest: the evidence says don't adopt now; the self-A/B is the respectful path if curiosity persists (cheap, decisive, generates novel data).
