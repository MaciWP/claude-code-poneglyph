# Golden-prompt evals (feature 019)

Deterministic regression harness for poneglyph's OWN named behaviors. Every constraint below is evidence-locked (018 `decision-memo-W2.md` D1/D2/D4 — Anthropic/LangSmith/Spence convergent).

## Protocol

| Rule | Value |
|---|---|
| **Cadence** | Run on EVERY meta-config change: CLAUDE.md, output-styles, rules, skill descriptions, hooks that shape behavior |
| **Expectation** | ≈100% pass. These are regression checks on behaviors that already work — not aspirational targets |
| **On any FAIL** | **SUSPECT THE EVAL FIRST** (Anthropic's own 42%→95% grading-bug incident), then the config change. Fix the grader or fix the config; never normalize a red suite |
| **Trials** | `trials: 2` on stochastic style criteria (pass^k — every trial must pass); 1 on deterministic-ish ones. Cap 3 |
| **Grading** | Deterministic code graders ONLY (`graders.ts`). NO LLM judge, ever — judges measured ~80% FP in-domain and run-to-run inconsistent (W2 D4) |
| **Suite cap** | ≤50 cases. Growth = one new case per NEW real documented failure, clustered (no near-duplicates). No synthetic filler |
| **Cost scope** | Config-regression only (live mode shells `claude -p` per case ≈ $ low-single-digit per run) — never live per-turn gating |

## Running

```bash
bun .claude/evals/run.ts                                  # live: claude -p per case + grade
bun .claude/evals/run.ts cases.jsonl --offline <dir>      # re-grade stored transcripts (<dir>/<case-id>.txt|.jsonl)
bun test ./.claude/evals/                                  # grader unit suite (pure, offline)
```

Exit code ≠ 0 on any case failure.

## Case schema (JSONL, one per line)

```json
{"id":"...","prompt":"...","type":"skill-trigger|style|register|honesty","grader":"<graders.ts name>","expected":"<grader-specific>","trials":2,"source":"<real-failure citation — MANDATORY>"}
```

`source` is non-negotiable: a case without a traceable real-failure origin is synthetic and gets cut (spec 019 out-of-scope).

## Clusters (18 cases, 2026-06-10 harvest)

Declared count: **18, not 20** — the honest yield of documented real failures; no filler added.

| Cluster | Cases | Grader | Failure origin |
|---|---|---|---|
| Skill triggering | skill-01..04 | `skillTriggerParse` | Native under-triggering verified in `_research-skill-activation-2026-06-09.md`; wiring lesson in `feedback-skill-wiring-over-autotrigger` |
| Anti-sycophancy openers | opener-05..09 | `bannedOpeners` | poneglyph.md kill-list (distilled from real feedback); hook-reliability false-claim case |
| es-ES register | eses-10..12 | `esEsDetect` | CLAUDE.md language convention; 017 translated-English debt |
| BLUF position | bluf-13..15 | `blufPosition` | poneglyph.md §BLUF anti-examples; `feedback-default-brief-no-bureaucracy` |
| Confidence labels | label-16..18 | `labelPresence` | `feedback-measure-dont-estimate` (010 incident); `feedback-antihallucination-not-fix-correctness` (014) |

## Known gaps (declared)

- **Near-miss negatives** for skill triggering (prompts that should NOT trigger) need an `expected: none` grader mode — not shipped in v1; add with the first documented false-positive trigger.
- Absolute skill-trigger rates are model/prompt-density dominated (research file: Haiku 20% / Sonnet 55% / Opus 87.5% baselines) — read DELTAS across config versions, not absolutes.
- Capability evals for individual skills → `skill-creator` harness (complementary; its trigger-isolation bias documented in W2 D3 / anthropics/skills#556).
