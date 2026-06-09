---
name: drillme
description: |
  Transversal Socratic check — on-demand catalog of canonical questions applied
  to any decision, plan, output, or doubt. Four canonical categories (location /
  approach / context / failure) from the Socratic Prompt Method, plus complementary
  patterns (5-whys, first principles, inversion). Auto-detects active workflow
  phase from .claude/plans/{NNN}-{slug}/ artefacts to load phase-specific
  question banks. Guidance, NOT a gate — its failure doesn't break phase outputs.
  Use when: doubt blocks progress, validating a plan, before closing a phase,
  design dilemma, decision between alternatives, "drill", "drillme", "socratic",
  "5-whys", "valida", "cuestiona", "challenge", "antes de cerrar", "interrógame",
  "pregúntame todo".
  Keywords - drill, drillme, socratic, 5-whys, first-principles, valida, cuestiona,
  challenge, interrogate, antes-de-cerrar, antes-de-decidir, pregúntame, inversion,
  doubt, stuck, ambiguous
disable-model-invocation: false
argument-hint: "[contexto o pregunta]"
effort: low
---

# Drillme — Transversal Socratic Check

On-demand Socratic interrogation pattern. Applies the canonical 4-category catalog (from the Socratic Prompt Method, Jaseci Labs 2026) + complementary patterns (5-whys, first principles, inversion) to any decision, plan, output, or stuck point. Invocable in **any phase or context** — not bound to the 5-phase workflow.

## Underlying principle

> "If everyone is thinking alike, then somebody isn't thinking." — Tenth Man Rule

Drillme builds **structural doubt** into decisions before commitment. Unlike `decision-stress-test` (which spawns 5-12 perspectives in parallel for high-stakes architectural decisions), drillme is **lightweight and synchronous**: 3-7 Socratic questions, applied to the user's current context. Use drillme for *guidance*; use `decision-stress-test` for high-stakes commitments.

## When to use

| Trigger | Example |
|---|---|
| Doubt blocks progress mid-task | "Estoy dudando entre A y B" |
| Validating a plan before commitment | "Antes de cerrar este spec, drillme" |
| Phase closing in 5-phase workflow | At hard gates 1->2 and 2->3, or before review.md verdict |
| Decision feels rushed | "Voy a ir con X, ¿es prematuro?" |
| Output feels too confident | "Cuestióname esta solución" |
| Stuck without clear next step | "No sé por dónde tirar — interrógame" |

## When to skip

| Anti-trigger | Why |
|---|---|
| Decision already committed (code merged, PR closed) | Post-commitment drillme is rationalization, not analysis |
| Trivial mechanical task (rename, typo) | No decision to drill |
| High-stakes architectural commitment | Use `decision-stress-test` (5-12 perspectives + cross-debate); drillme is for the lighter end |
| Pure debugging / fix with clear repro | The "test" is the oracle; drillme adds nothing |

## Drillme vs decision-stress-test (when each)

| Dimension | drillme | decision-stress-test |
|---|---|---|
| Stakes | Low to medium | Medium to high |
| Output | 3-7 Socratic questions | Multi-perspective synthesis + vote |
| Cost | ~500 tokens | ~3-10K tokens |
| Cycle time | Synchronous, single turn | Multi-phase (spawn → debate → synthesis → vote) |
| Use | Routine validation, guidance | Pre-commitment for architectural choices |

If unsure → start with drillme; if drillme reveals deep disagreement → escalate to decision-stress-test.

## Canonical 4-category catalog (Socratic Prompt Method)

Source: [Socratic Prompt Method, Jaseci Labs 2026](https://blogs.jaseci.org/blog/2026/03/10/socratic-prompt-method/) + [Towards AI 2025](https://towardsai.net/p/machine-learning/the-socratic-prompt-how-to-make-a-language-model-stop-guessing-and-start-thinking).

| Tag | Category | Purpose | Canonical template |
|---|---|---|---|
| `[location]` | Challenge location | Architectural awareness | "Is this the right place / file / layer for this?" |
| `[approach]` | Challenge approach | Pattern reasoning | "Why this approach over `<alternative>`? What did we reject?" |
| `[context]` | Introduce context | Dependency discovery | "How does this interact with `<X>`? What does it touch?" |
| `[failure]` | Probe failure modes | Edge case robustness | "What happens if `<edge case>`? Worst-case scenario?" |

**Coverage rule**: each drillme should cover at least 3 of the 4 categories. If <3, declare honestly: "Skipping `[category]` — N/A in this context".

Detail with adaptation rules per category: `${CLAUDE_SKILL_DIR}/references/01-catalog-socratic.md`.

## Complementary patterns

| Pattern | When to apply |
|---|---|
| **5-whys** | Symptom vs root cause unclear. Iterate "why?" up to 5 times until reaching the foundation. |
| **First principles** | Novel problem with no clear precedent. Strip to fundamental atoms; rebuild from there. |
| **Inversion** | Decision between two close options. Ask: "what if the opposite were true?" — explore the counterfactual. |

Detail: `${CLAUDE_SKILL_DIR}/references/02-complementary-patterns.md`.

## Phase-specific question banks (5-phase workflow)

When invoked in the context of the poneglyph 5-phase workflow, drillme **loads** the phase-specific questions in addition to the canonical catalog. Phase banks live in:

| Phase | File |
|---|---|
| Phase 1 (scope) | `${CLAUDE_SKILL_DIR}/references/03-phase-questions.md` §Phase 1 |
| Phase 2 (plan) | `${CLAUDE_SKILL_DIR}/references/03-phase-questions.md` §Phase 2 |
| Phase 2.5 (TDD design) | `${CLAUDE_SKILL_DIR}/references/03-phase-questions.md` §Phase 2.5 |
| Phase 3 (build) | `${CLAUDE_SKILL_DIR}/references/03-phase-questions.md` §Phase 3 |
| Phase 4 (review) | `${CLAUDE_SKILL_DIR}/references/03-phase-questions.md` §Phase 4 |
| Phase 5 (retro) | `${CLAUDE_SKILL_DIR}/references/03-phase-questions.md` §Phase 5 |

Phase questions are **canonical** and live in this skill, NOT scattered across phase skills (US2-US7). Phase skills reference this catalog.

## Workflow

### Step 1 — Parse context

Detect what to drill:

| Input | Action |
|---|---|
| `$ARGUMENTS` is an explicit brief (`/drillme "I'm choosing between A and B"`) | Take as literal context |
| `$ARGUMENTS` empty + recent `.claude/plans/{NNN}-{slug}/` artefacts in conversation | Auto-detect phase from latest artefact (spec/tasks/tests/validations/review/retro) |
| `$ARGUMENTS` empty + no plan context | Ask user: "What do you want me to drill?" (single AskUserQuestion) |
| Conversation shows mid-implementation doubt | Take the doubt as context; focus on `[failure]` + `[context]` |

Phase auto-detection priority (latest wins): `retro.md` > `review.md` > `validations.md`/`tests.md` > `tasks/index.md` > `spec.md`. If multiple slugs active → use the one with most recent modification.

### Step 2 — Apply canonical catalog

Generate **at least one question per applicable category**. If a category doesn't apply, skip it explicitly:

```
Skipping [location] — context is "comparing two libraries", no file location involved.
```

Default coverage target: 3/4 categories. If <3 → smell: the context isn't decidable yet. Tell the user.

### Step 3 — Apply complementary patterns (situational)

| Situation | Pattern |
|---|---|
| User describes a symptom ("the API is slow") | 5-whys |
| Novel problem, no prior pattern | First principles |
| Decision between 2 close options | Inversion |
| Multiple symptoms, unclear root | 5-whys |

Add 1-3 additional questions from the chosen pattern. Tag them with `[pattern-name]`.

### Step 4 — Load phase-specific bank (if applicable)

If a workflow phase was detected in Step 1, append the phase-specific questions from `references/03-phase-questions.md`. Tag those with `[phase-N]` so the user sees their origin.

### Step 5 — Output

Deliver as a numbered list. Each question has:
- A tag `[category]` (canonical) or `[pattern]` (complementary) or `[phase-N]` (phase bank).
- The question itself, terse and direct (no softening — no "perhaps", no "maybe").
- (Optional) 1 line of why this question matters in this context.

Format:

```markdown
## Drillme — <brief context>

1. `[approach]` <question>
2. `[failure]` <question>
3. `[context]` <question>
4. `[location]` <question>
5. `[5-whys]` <follow-up question>

Coverage: 4/4 canonical categories.
```

### Step 6 — Iterate (optional, on user request)

If the user answers and asks for more drilling:

- Apply quality check to each answer (see `references/04-quality-check.md`):
  - Empty / "I don't know" without reason → re-ask with follow-up.
  - Evasive ("depende", "more or less") → request concretion.
  - Concrete → mark closed.
- Continue until ≥80% questions have concrete answers.
- Final report: list of open vs closed; what surfaced; what remains uncertain.

## SIEMPRE rules

- **No softening**: questions are direct, not hedged. "What happens if X?" not "Could there perhaps be a case where X?".
- **Honesty about coverage**: declare skipped categories explicitly. Never invent a synthetic question to pad coverage.
- **Calibration**: 1-2 questions for trivial context; 5-7 for architectural. Anti-ceremony (Commandment III).
- **Guidance not gate**: this skill never blocks. Its output is questions; what the user/Lead does with them is their decision.

## Commandments cubiertos

| # | Cómo |
|---|---|
| I | Honest about what is known vs unknown; direct questions without softening |
| II | Verify premises before accepting answers (anti-hallucination is invoked when answers reference facts/files) |
| III | Calibrate question count to context weight; anti-ceremony |
| V | Force understand-before-acting before commitment |
| VIII | The catalog IS structured meta-prompting |
| IX | Captures unresolved points as "Open drillme questions" — reactive observability |

## Adaptation by signal

| Signal | Adaptation |
|---|---|
| Context trivial / autoexplicativa / decided | 1-2 focused questions; declare "Drillme reducido por contexto" |
| Multi-criteria architectural decision | 5-7 questions + complementary patterns (5-whys + inversion) |
| Mid-implementation, open code | Focus on `[failure]` + `[context]`; skip `[location]` (file already chosen) |
| Phase closing in 5-phase workflow | Load phase-specific bank + canonical 4 categories |
| User explicitly invokes `/drillme <brief>` | Take brief literally; apply 4 categories on that brief |

## Casos edge

- **Edge 1** — Auto-detection finds multiple active features: pick the one with most recent modification; report the choice ("Drilling on `<NNN-slug>` — most recent modification 2026-MM-DD").
- **Edge 2** — User responds "no sé / depende" to every question: declare "Drillme inconcluso — necesitas más research o contexto antes de decidir". Don't force false concretion.
- **Edge 3** — `$ARGUMENTS` is contradictory or mid-thought: ask one clarification question before generating the drill set.
- **Edge 4** — Skill invoked from another skill (US2-US7) but the auto-fire doesn't happen reliably: Lead invokes `/drillme "<phase context>"` manually. Document the fallback path explicitly.
- **Edge 5** — User responds with their own counter-questions: that's healthy; absorb them into the catalog for this turn.

## Smell signals

- ⚠️ Drillme always produces the same generic 4 questions regardless of context → calibration failure; revisit Step 2.
- ⚠️ Phase-specific bank loaded but questions don't fit the actual context → the phase bank is stale; flag for review.
- ⚠️ User responds concretely to all but the decision still doesn't crystallize → escalate to `decision-stress-test` (drillme reached its ceiling).
- ⚠️ >10 questions for one decision → over-engineering; calibrate down.
- ⚠️ Phase skills (US2-US7) never invoke drillme despite their drillme blocks pointing to it → skill->skill probabilistic invocation is the bottleneck; the Lead must dispatch manually after each phase closure.

## Anti-patterns

| Anti-pattern | Detection | Correction |
|---|---|---|
| Synthetic coverage | Question invented to fill `[category]` quota | Declare "Skipping [category]" honestly; coverage 3/4 is fine |
| Softened questions | "Could perhaps..." / "Maybe consider..." | Direct: "What happens if X?" — no hedging |
| Cargo-cult drillme | Drillme invoked routinely without checking if context warrants it | Skip-conditions (above table) are real; honor them |
| Confusion with decision-stress-test | Drillme used for genuinely high-stakes architectural decision | Escalate explicitly; drillme is for the lighter end |
| Phase-bank dependency on meta-feature | Phase questions stored in `.claude/plans/001-...` (the meta-feature that created them) | Phase banks live in `references/03-phase-questions.md` of THIS skill, never in any specific feature plan |

## Auxiliary skills invoked

> Canonical matrix in `.claude/plans/001-poneglyph-5phase-workflow/tasks/index.md §Auxiliary skills matrix`. Row below is the literal subset that applies to this transversal skill.

| Auxiliary skill | When this skill invokes it | Fallback if skill->skill fails |
|---|---|---|
| `anti-hallucination` | When user's answer cites a file/function/path/version — verify before treating it as Concrete | Lead Globs/Greps the cited reference manually; downgrade answer to Evasive if unverifiable |
| `decision-stress-test` | **Escalation** when drillme reaches its ceiling: 3 iterations with persistent Evasive/Empty answers, or user asks for deeper analysis | Lead invokes `/decision-stress-test "<the unresolved decision>"` manually with stakes calibration |
| `AskUserQuestion` | Mechanism to obtain user answers when iterating | Direct invocation (built-in tool, always reliable) |

> Skill-to-skill invocation is **probabilistic** per docs Anthropic + [issue #59968](https://github.com/anthropics/claude-code/issues/59968). drillme itself is **guidance, not gate** (see SKILL.md header) — if it doesn't fire, phase outputs aren't corrupted; the Lead invokes manually as fallback.

## Relationship to decision-stress-test

Catalog stems from `decision-stress-test` philosophy (5 adversarial techniques + Socratic interrogation) but **lightweight**: drillme is the ~10% tool (3-7 questions, single turn, ~500 tokens); stress-test is the full deal (5-12 perspectives + cross-debate + synthesis + vote, ~3-10K tokens). Choose by stakes (see "Drillme vs decision-stress-test" table in SKILL.md).

## Verification (post-implementation of this skill)

- Smoke: `/drillme "estoy dudando entre A y B"` → produces 3-5 questions with `[category]` tags.
- Smoke: `/drillme` with no args + recent `spec.md` in conversation → loads Phase 1 bank + canonical catalog.
- Auto-activation: prompt with "valida esto" or "challenge my decision" → skill activates.
- Invoked from another skill (US2-US7) → fires when probabilistic invocation succeeds; the Lead invokes manually as fallback when not.
- `bun test ./.claude/hooks/` sigue green (no toca código).

## Content map

| Topic | File |
|---|---|
| Canonical 4 categories (location/approach/context/failure) with templates, adaptation, anti-patterns | `${CLAUDE_SKILL_DIR}/references/01-catalog-socratic.md` |
| Complementary patterns (5-whys, first principles, inversion) | `${CLAUDE_SKILL_DIR}/references/02-complementary-patterns.md` |
| Phase-specific question banks (Phase 1 / 2 / 2.5 / 3 / 4 / 5) | `${CLAUDE_SKILL_DIR}/references/03-phase-questions.md` |
| Quality check for answers + iteration protocol | `${CLAUDE_SKILL_DIR}/references/04-quality-check.md` |

## Output template (reminder)

```markdown
## Drillme — <brief context>

<optional: 1-line of detected phase or context>

1. `[approach]` <question>
2. `[failure]` <question>
3. `[context]` <question>
4. `[location]` <question>
5. `[5-whys]` <follow-up>  ← only if applicable

Coverage: <N>/4 canonical categories (+ <M> from complementary patterns).
<optional: notes on skipped categories with reason>

If user wants me to iterate after answers, reply with answers and say "iterate".
```
