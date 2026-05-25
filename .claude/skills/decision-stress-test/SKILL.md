---
name: decision-stress-test
description: |
  Stress-tests technical decisions before commitment via 5-12 perspectives in parallel (Outsider, Adversary, Simplifier, Maintainer, Linus, Cost Optimizer, Performance, Operator, Karpathy, Security, Product, User) with cross-debate rounds, plus 5 adversarial techniques (Steel-Man, Assumption Audit, Pre-Mortem, Inversion, Second-Order Effects), calibrated by stakes, with anti-hallucination verification on every finding.
  Use when: about to commit to architecture/library/framework choice, want to challenge a proposed solution, suspect agreement bias from Claude, need structured pros/cons before deciding.
  Keywords - stress-test, challenge this decision, devils-advocate, contrarian analysis, steel-man, pre-mortem, before-deciding, before-committing, antes-de-decidir, cuestiona esta decisión, stress-testea
disable-model-invocation: false
argument-hint: "<decision or proposal to stress-test>"
effort: high
---

# Decision Stress-Test

Multi-perspective adversarial analysis of a technical decision **before** commitment. Spawns 5-12 perspectives in parallel (depending on stakes), runs an adaptive cross-debate gated by a Step-back Judge (max 3 cycles), and synthesizes with 5 adversarial techniques. Anti-hallucination verification is a gate within the process.

## Underlying Principle

> "If everyone is thinking alike, then somebody isn't thinking." — Tenth Man Rule

Sycophancy is the silent killer of engineering decisions. Hallucination is its loud cousin. This skill builds **structural disagreement** into the analysis: at least one perspective (Adversary) is forced to dissent; one (Outsider) cannot be contaminated by context; one (Linus) refuses unexplained complexity by construction. The aim is not contrarianism for its own sake — it is to make sure the decision survives a real challenge before commitment.

## When to Use

| Trigger | Example |
|---|---|
| About to commit to architecture / library / framework | "Going to use Redis for sessions" |
| Want to challenge a proposed solution | "Claude proposed X — does it hold up?" |
| Suspect agreement bias | "Every time I ask, Claude agrees. Stress-test this." |
| Pre-PR / pre-merge for non-trivial design | "Before I open the PR, stress-test this design" |

## When to Skip

| Anti-trigger | Why |
|---|---|
| Mechanical / trivial change | Renames, formatting, fixing a typo — no decision to stress-test |
| Decision already made and committed | Stress-test post-commitment is rationalization, not analysis |
| Pure debugging / fix | No alternatives to weigh — find the bug, fix it |
| Question is exploratory ("what is X?") | Use docs / Context7, not stress-test |
| Stakes are zero (e.g., personal preference in a one-off script) | Stress-test cost > decision cost |

## Initial Triage

If the input is ambiguous, the **invoker** (Lead, planner, reviewer) asks 1-4 `AskUserQuestion` calls before Phase 1. Subagents cannot ask the user directly — they include questions in their output, which the invoker consolidates.

| Question | When to ask |
|---|---|
| "What is the exact decision (pick one of N)?" | Input names a topic but not a choice |
| "What alternatives are on the table?" | Only one option mentioned |
| "What's the reversibility / time horizon?" | Stakes tier unclear |
| "What constraints (budget, deadline, team size, compliance)?" | Constraints missing |

If the conversation already has the context (the user just discussed it), **skip** the triage to avoid redundancy.

## Stakes Calibration

| Stakes | Perspectives | Step-back judge | Techniques |
|---|---|---|---|
| Low | 5 (Outsider + Adversary + Maintainer + Linus + **Simplifier**) | OFF (no Phase 2) | Steel-Man + Assumption Audit |
| Medium | 8 (+ Performance + Operator + **Cost Optimizer**) | ON (max 3 cycles, adaptive) | + Pre-Mortem |
| High | 11 (+ Security + Product + **Karpathy**) | ON (max 3 cycles, adaptive) | All 5 |
| High with UX | 12 (+ User) | ON (max 3 cycles, adaptive) | All 5 |

Default-on-uncertainty: **Medium**. Detailed criteria, edge cases, and 6 worked classifications in `${CLAUDE_SKILL_DIR}/references/03-stakes-calibration.md`.

## Framing Check

Before spawning Phase 1, ask explicitly:
1. Are we solving the right problem? (Sometimes the framed decision is the wrong question.)
2. Is there an Option C the proposal didn't consider?
3. Is the implicit "do nothing" path already evaluated?

This is a 30-second pause that catches a non-trivial fraction of bad framings. Output the answers in the report.

## Phase 1: Perspectives in Parallel

Spawn N perspectives (per stakes tier) as `general-purpose` subagents in **parallel** — single message, N tool calls. Each receives a tightly scoped prompt:

| Perspective | Lens | Tools | Prompt source |
|---|---|---|---|
| Outsider | First principles, no project context | Input only — NO Read/Grep/Web | `${CLAUDE_SKILL_DIR}/prompts/outsider-agent.md` |
| Adversary | Devil's advocate; 5 techniques; Tenth Man | Read, Grep, Context7, WebSearch | inline (see `01-perspectives.md`) |
| Performance | Throughput, latency, memory | Read, Grep, Context7, WebSearch | inline |
| Security | OWASP, attack surface, supply chain | Read, Grep, Context7, WebSearch | inline |
| Maintainer | Tech debt, ergonomics, testability | Read, Grep, Context7 | inline |
| Simplifier | "What can we remove?" YAGNI lens | Read, Grep | inline (see `01-perspectives.md`) |
| Operator | Deploy, observability, runtime | Read, Grep, Context7, WebSearch | inline |
| Cost Optimizer | $$$, TCO, opportunity cost, 80/20 alternatives | Read, Context7, WebSearch | inline |
| Product | Value, opportunity cost, roadmap | Read (docs), WebSearch | inline |
| Linus Torvalds | Pragmatic-brutal with technical analysis | Read, Grep | `${CLAUDE_SKILL_DIR}/prompts/linus-agent.md` |
| Karpathy | AI-friendliness, modern stack pragmatism, build-observe-iterate | Read, Grep, Context7, WebSearch | `${CLAUDE_SKILL_DIR}/prompts/karpathy-agent.md` |
| User (optional) | Public-surface DX/UX | Read, Grep | inline |

Each perspective emits the standard output format (Position, Confidence, Pros, Contras with severity, Context I needed, Questions). Full prompt templates and worked examples in `${CLAUDE_SKILL_DIR}/references/01-perspectives.md`.

## Phase 2: Cross-Debate (with Step-back Judge)

For Medium and High stakes, the orchestrator spawns a **Step-back Judge** alongside the perspectives. The judge is a meta-teammate that does NOT take positions on the decision; it evaluates debate quality after each round and returns one of three verdicts: `CONVERGED`, `PARTIAL`, or `FULL`. This replaces the previous fixed-rounds logic with adaptive deliberation.

| Verdict | Meaning | Orchestrator action |
|---|---|---|
| CONVERGED | Debate quality is sufficient; positions evidence-based; no major blind spots | Exit Phase 2 → Phase 3 |
| PARTIAL | Specific perspectives missed a specific point | Send targeted re-debate instructions only to named perspectives |
| FULL | Group missed framing / blind spot / Option C | Broadcast re-debate instructions to all perspectives |

**Circuit breaker**: max 3 cycles. After cycle 3 without CONVERGED → mark `MAX_CYCLES_REACHED` (Phase 4 downgrades confidence).

**Step-back judge constraint**: NEVER votes on the decision (Phase 5 excludes it from the tally). Only evaluates debate quality.

Step-back persona prompt at `${CLAUDE_SKILL_DIR}/prompts/step-back-judge.md`. Full protocol, cycle thrashing prevention, premature-CONVERGED override in `${CLAUDE_SKILL_DIR}/references/06-cross-debate.md`.

## Phase 3: Synthesis with 5 Techniques

Apply the 5 adversarial techniques **across** the post-debate perspective outputs:

| Technique | Synthesis function |
|---|---|
| Steel-Man First | Strongest case FOR the decision built from surviving pros |
| Assumption Audit | All assumptions, scored by Likelihood × Impact, flagging shared ones as suspect |
| Pre-Mortem | Failure modes with triangulation count and confidence |
| Inversion | "What guarantees the worst outcome?" mapped to proposal |
| Second-Order Effects | What does this enable / prevent at 6-12 months (3rd order if High stakes) |

Detail and examples in `${CLAUDE_SKILL_DIR}/references/02-techniques.md`.

## Triangulation

When ≥2 perspectives independently surface the same finding, that finding is automatically tagged HIGH confidence and annotated `[triangulated by N perspectives]`. This is the central anti-sycophancy mechanism: agreement across diverse lenses is signal; agreement within one lens is noise. **Caveat**: triangulation can amplify shared bias — see Assumption Audit's groupthink flag and Anti-Pattern #8.

## Verification Gate

Before any finding enters the output, the producing perspective must apply the standard Anti-Hallucination decision tree:

| Check | Required for |
|---|---|
| Glob | Claiming a file exists |
| Grep / Read | Claiming a function or pattern exists |
| Context7 / WebSearch | Claiming version-specific behaviour, recent CVEs, benchmark numbers |
| LSP `hover` | Claiming a type signature |

**Forbidden actions**:
- Inventing function signatures, file paths, CVE IDs, benchmark numbers
- Citing "industry best practice" without source
- Asserting something exists when verification was not run

If verification cannot be performed, the finding is tagged `UNKNOWN` and the user is told what verification is needed. Detail in `${CLAUDE_SKILL_DIR}/references/02-techniques.md` (High-Risk Areas table).

## Confidence Per Finding

| Tag | Criterion |
|---|---|
| HIGH | Verified by tool output OR triangulated by ≥2 perspectives |
| MEDIUM | Partial / related data; informed inference |
| LOW | Inference only, not verified, not triangulated |
| UNKNOWN | Not verified; user must answer or run verification |

Triangulation can promote a tag from MEDIUM → HIGH automatically. The promoted finding is annotated with the triangulation count. If the cross-debate was marked FAILED, triangulation promotion is suppressed (since the agreement may be groupthink, not signal).

## Phase 4: Validation (Blocking Quality Gate)

After Phase 3 synthesis and **before** Phase 5 (final recommendation vote), the orchestrator runs a structured validation gate. Per Commandment IV (*"intention isn't enough"*), this is a blocking gate: any failed sub-check **must** be reported in the output. Silent suppression of a failed sub-check is anti-pattern #12.

| Sub-gate | Question | Pass criterion |
|---|---|---|
| **4.1 Findings Validation** | Does every HIGH-tagged finding cite verifiable evidence? Does every UNKNOWN explicitly state what verification is missing? | All HIGH findings have a tool-output citation or `[triangulated by N]`; all UNKNOWN findings have a "needs X verification" annotation |
| **4.2 Debate Validation** | Did Phase 2 produce real movement, or was it theatre? | ≥1 Position change OR ≥2 new pros/contras OR debate marked FAILED with reason |
| **4.3 Verdict Validation** | Is the verdict actionable? Are monitoring signals measurable? Are invalidating conditions concrete? | Verdict has ≥1 concrete next step; ≥2 monitoring signals are measurable (numeric threshold or boolean event); ≥1 invalidating condition is named |
| **4.4 Self-Meta Check** | Form audit (the 5-question check below) | All 5 pass OR failures are explicitly listed |
| **4.5 Pass/Fail Gate** | Any sub-check failed? | If yes, output emits a `Validation Report` block stating which sub-checks failed and why. The verdict confidence is automatically downgraded one tier (HIGH→MEDIUM, MEDIUM→LOW) |

**Why this exists**: the previous phases produce content; this phase guarantees the content meets a quality bar before reaching the user. Without it, the skill can produce confident-sounding output that hides shaky findings, fake debates, or unmeasurable monitoring signals.

**Failure-to-report is itself a failure**: if Phase 4 finds an issue and the orchestrator does not surface it in the output, that is a violation of Commandment I (radical honesty) and Commandment IV (blocking gates). Honest failure beats silent pass.

## Phase 5: Final Recommendation with Per-Perspective Vote

After Phase 4 passes (or honestly reports failures), the orchestrator drafts a final recommendation and broadcasts it back to the same perspectives that participated in Phase 1/2. Each perspective casts a vote with a 1-2 sentence reason. This preserves dissent, surfaces real consensus level, and prevents the orchestrator from "deciding alone" after all the upstream work.

> **Note**: The Step-back Judge does NOT vote in Phase 5. It is a meta-evaluator, not a panelist. The vote tally only includes the perspectives that produced positions on the decision (5/8/11/12 according to the stakes tier), EXCLUDING the step-back judge.

| Sub-step | What happens |
|---|---|
| **5.1 Draft recommendation** | Orchestrator drafts the final recommendation grounded in Phase 3 synthesis and Phase 4 validation outcome |
| **5.2 Broadcast** | Orchestrator sends the draft to the N perspectives that participated (no new spawns; same agents, same context) |
| **5.3 Per-perspective vote** | Each perspective returns: vote (`SUPPORT` / `OPPOSE` / `CONDITIONAL` / `ABSTAIN`) + 1-2 sentence reason. CONDITIONAL must name the condition. ABSTAIN must name what is missing |
| **5.4 Aggregate** | Orchestrator builds a vote tally and transcribes dissenting reasons **verbatim** (not summarized) |
| **5.5 Consensus level** | Computed and stamped on the final verdict: `Strong consensus` (≥80% SUPPORT), `Mixed` (50-80% SUPPORT, no OPPOSE), `Weak consensus` (50-80% SUPPORT with OPPOSE), `No consensus` (<50% SUPPORT) |

**Why this exists**: in earlier phases, perspectives produced opinions on the *decision*; here they produce opinions on *the recommendation built from those opinions*. These are different objects. A perspective can support its own findings yet oppose the orchestrator's framing of the recommendation.

**Honesty rule**: dissenting votes are transcribed verbatim. Suppressing or paraphrasing dissent to make consensus look stronger is anti-pattern #13.

**Confidence interaction with Phase 4**: if Phase 4 already downgraded confidence one tier, and Phase 5 returns weak/no consensus, the verdict tag is downgraded a second tier (LOW or UNKNOWN) and the recommendation is automatically reframed as "Investigate first" with the dissent reasons as the questions to investigate.

## Output Format

The final report follows a structured template scaled by stakes (Low omits Pre-Mortem, Inversion, Second-Order; Medium omits Inversion, Second-Order; High includes everything). Sections:

- Stakes Tier (with reasoning)
- Initial Triage (questions + answers, or "skipped")
- Framing Check
- Phase 1 outputs (per perspective)
- Phase 2 Debate Summary (Medium+ only)
- Phase 3 Synthesis (5 techniques applied)
- Tradeoff Map (Medium+ stakes only) — matrix view of dimensions × options × weight × confidence
- Triangulated Findings
- **Core Tension** — the unresolved disagreement, if any
- Decision Guide (if/then table)
- Verdict (Proceed / Proceed with conditions / Investigate first / Reject)
- Confidence Calibration (Key Assumptions + Conditions Invalidating + Monitoring Signals)
- Phase 4 Validation Report (4.1 Findings + 4.2 Debate + 4.3 Verdict + 4.4 Self-Meta Check + 4.5 Overall Gate)
- Phase 5 Final Recommendation: vote tally + verbatim dissents + Consensus level (qualitative) + Decision Confidence Score (numeric, 5 signals)
- Outstanding questions for the user

Literal template + 2 worked examples (Low and High) in `${CLAUDE_SKILL_DIR}/references/05-output-template.md`.

## Self-Meta Check

Sub-gate 4.4 of Phase 4: before proceeding to Phase 5, run the 5-question audit:

1. Steel-Man genuinely strong? (a thoughtful supporter would feel represented)
2. No vague doom? (every Critical/Major finding has trigger + evidence + mitigation)
3. Real diversity? (perspectives actually disagree on something)
4. Outsider stayed isolated? (no file paths, class names, or absorbed framing)
5. Debate produced movement? (≥1 Position change OR ≥2 new pros/contras; or honestly reported as FAILED)

Failed checks must be reported in the output. Silent suppression of a failed check is itself an anti-pattern (failure-to-report).

## Anti-Patterns (Resumen)

| # | Anti-pattern | Mitigation |
|---|---|---|
| 1 | Contrarianism for its own sake | Disagree only with concrete reason |
| 2 | Nihilism (no verdict) | End with directional verdict |
| 3 | Straw-manning | Quote proposal verbatim before critique |
| 4 | Reverse confirmation bias | Update Position when evidence demands |
| 5 | Vague doom | Trigger + early warning + blast radius required |
| 6 | Personality critique | Engage proposal, not proposer |
| 7 | Objection without alternative | Every Critical/Major contra → mitigation/alternative |
| 8 | Groupthink across perspectives | Outsider as canary; spawn orthogonal Phase 1.5 |
| 9 | Outsider contamination | Restricted tools; reject if file paths appear |
| 10 | Linus caricature | Persona must be pragmatic-brutal WITH analysis |
| 11 | Fake debate | If 0 changes + 0 new findings → mark FAILED |
| 12 | Failure-to-report validation failure | Phase 4 failed sub-checks must appear explicitly in Validation Report; downgrade confidence one tier |
| 13 | Suppressed dissent | Verbatim transcription of CONDITIONAL/OPPOSE reasons; mechanical consensus level computation |
| 14 | Step-back capture | Judge stays meta; if it argues for/against, override and re-prompt |
| 15 | Karpathy/Linus solape | If both sound the same, voices weren't differentiated; verify the persona-specific output addenda differ |
| 16 | Simplifier nihilism | "Delete everything" without working alternative — Simplifier must propose minimal-viable version |
| 17 | Cost Optimizer false economy | Cutting critical dimensions (security/reliability/correctness) to save cents — flag any cost cut affecting these dimensions |

Full detection signals and corrections in `${CLAUDE_SKILL_DIR}/references/04-anti-patterns.md`.

## Content Map

| Topic | File |
|---|---|
| 11 perspectives + 1 optional, lenses, prompts, examples | `${CLAUDE_SKILL_DIR}/references/01-perspectives.md` |
| 5 adversarial techniques as synthesis phase | `${CLAUDE_SKILL_DIR}/references/02-techniques.md` |
| Stakes calibration matrix and edge cases | `${CLAUDE_SKILL_DIR}/references/03-stakes-calibration.md` |
| 17 anti-patterns + Self-Meta Check audit | `${CLAUDE_SKILL_DIR}/references/04-anti-patterns.md` |
| Output template + 2 worked examples (Low and High) | `${CLAUDE_SKILL_DIR}/references/05-output-template.md` |
| Cross-debate protocol, rounds, late perspective | `${CLAUDE_SKILL_DIR}/references/06-cross-debate.md` |
| Outsider agent prompt (isolated, no tools) | `${CLAUDE_SKILL_DIR}/prompts/outsider-agent.md` |
| Linus Torvalds persona prompt | `${CLAUDE_SKILL_DIR}/prompts/linus-agent.md` |
| Karpathy persona prompt | `${CLAUDE_SKILL_DIR}/prompts/karpathy-agent.md` |
| Step-back judge persona | `${CLAUDE_SKILL_DIR}/prompts/step-back-judge.md` |

## Integration with Other Skills

| Skill | Relationship |
|---|---|
| `decide` | Generates 3-perspective options for a decision; `decision-stress-test` stress-tests ONE option with 5-12 perspectives + debate. Use `decide` to choose an option, then `decision-stress-test` before committing |
| `anti-hallucination` | Source of the Verification Gate and confidence levels; this skill inherits and applies them inside each perspective |
| `review-patterns` | Different scope: `review-patterns` reviews implementation; `decision-stress-test` reviews the decision before implementation |
| `security-review` | Different scope: `security-review` audits existing code; `decision-stress-test` includes Security as one perspective among 11 when stakes are High |
| `prompt-engineer` | If the user's input to this skill is too vague to triage, the invoker may use `prompt-engineer` to refine before spawning perspectives |
