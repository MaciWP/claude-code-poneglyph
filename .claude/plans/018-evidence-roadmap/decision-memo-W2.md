# Decision memo W2 — Behavioral evals (golden-prompt harness design constraints)

> Constraints only — implementation is 019+. Every constraint cites ≥1 Tier A/B (or T1 local primary-source) finding from `evidence/W2.md`. C/D = color, labeled.

## D1 — Harness shape

| Constraint | Value | Evidence |
|---|---|---|
| Set size | **20-50 golden prompts**, drawn from REAL observed failures/behaviors, clustered (no near-duplicates) | B: Anthropic 20-50 (refuter-verified verbatim) + LangSmith 10-20; Braintrust qualitative-only (critic-corrected); B: un-clustered suites memorize |
| Grading hierarchy | Deterministic/code-graded first (regex, banned-phrase lists, JSONL parse of `Skill()` calls, language detection); constrained-label LLM rubric ONLY for irreducibly subjective criteria; judge model ≠ generation model; NEVER pairwise | B: Anthropic hierarchy (refuter-confirmed); A: position bias judge/task-dependent (critic-corrected) + intra-judge run-to-run unreliability (Rating Roulette); B: Spence 0% FP deterministic vs 80% FP LLM-judge |
| Cadence | Run on every meta-config change (CLAUDE.md / output-style / skill description edit); expect ≈100% pass; any fail → **suspect the eval first** (Anthropic's 42%→95% grading-bug incident), then the config | B: Anthropic regression-suite guidance |
| Trials | 2-3 repeats on stochastic criteria (pass^k for consistency-critical behaviors); treat rubric scores as trend, binary checks as gates | B: Anthropic pass@k/pass^k; T1: skill-creator default 3 runs/query |
| Runner | `claude -p --output-format stream-json` + JSONL parse (session auth, no API key) — the published, working pattern | B: Spence ($5.59/~250 calls); T1: skill-creator scripts already do this |

## D2 — Eval targets (what to test, per evidence)

| Target | Method | Expectation calibrated by evidence |
|---|---|---|
| **Skill triggering** | Spence-style: K prompts that SHOULD trigger + near-miss negatives; parse `Skill()` invocations | Baseline ~50-55% activation is NORMAL (B); deltas matter, not absolutes; deterministic hook wiring is the fix that measured 100%/0%FP (B) — eval validates the wiring, doesn't replace it |
| **Style/register (es-ES, anti-sycophancy, BLUF, confidence labels)** | IFEval-style code checks: language detector, banned-opener list ("buena pregunta", "tienes toda la razón"…), label-presence regex, BLUF position heuristic | A: IFEval pattern; B: Aider ships format-compliance as a regression metric; PromptPex can auto-derive checks from poneglyph.md's own rules (B) |
| **CLAUDE.md content changes** | Measure EFFICIENCY (tokens, runtime on a fixed task set) + compliance of specific named behaviors | A: instruction files buy −28.64% runtime / −16.58% tokens, NOT success (+~0 for Claude Code specifically) — do not eval "did output get better" |
| **Capability of individual skills** | skill-creator capability evals (paired with/without runs + grader + aggregate_benchmark) — usable as installed | T1: mechanics verified on disk; C: published deltas (+16pp, +7.3pp) exist in the wild |

## D3 — skill-creator harness: adopt with known caveats

- Usable TODAY for **relative** trigger deltas (before/after description edits); absolute rates biased low in poneglyph (20 real skills compete with the temp command proxy — **anthropics/skills#556**, no isolation logic in current `run_eval.py`, T1-verified).
- If absolute rates are ever needed: hide real skills during eval runs (the #556 proposed fix) — 019+ decision.
- Out of scope by its own docs: subjective style behaviors → those go to the IFEval-style deterministic checks (D2), not to skill-creator assertions (T1: SKILL.md).

## D4 — Guard rails (what the evidence forbids)

- **No generic "prompt improvement" passes** over poneglyph config: A-tier shows them degrading task pass rates (100%→90%, 93.3%→80%) while looking better on generic metrics. Every change tests against poneglyph's OWN named behaviors.
- **No LLM-judge as gate**: judges are run-to-run inconsistent (A) and measured 80% FP in-domain (B) — rubric scores are trend signal only.
- **No big suite**: >50 cases has no evidence behind it and a real maintenance cost ("living artifact… clear ownership", B); no published team maintains a large prompt suite.
- **Don't bank improvements without the suite**: this memo operationalizes the existing `feedback-behavioral-ac-next-session` and `feedback-measure-dont-estimate` lessons with published method + numbers.

## Tensions for US6

- D2's "CLAUDE.md doesn't move success" (A-tier) vs poneglyph's heavy investment in always-loaded behavioral config: the evidence reframes that investment as buying efficiency + specific-behavior compliance + style identity — worth keeping IF kept small (links to W1's IFScale finding: rule adherence decays with density).
- Eval cost (~$6/run order) vs run-per-change cadence: cheap enough for meta-changes (weekly-ish), not for every conversational turn — scope stays "config regression", never "live gating".
