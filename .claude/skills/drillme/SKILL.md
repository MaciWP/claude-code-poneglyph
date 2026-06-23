---
name: drillme
description: |
  Interrogatorio socrático exhaustivo: barre una decisión/plan/output/duda en busca de gaps y pregunta lo que haga falta para cerrarlos, en rondas embudo, integrando las respuestas en el artefacto activo. Activación híbrida: corre donde hay un gap que cerrar y produce CERO preguntas donde nada es ambiguo (sin ceremonia). Para en saturación, nunca en un número fijo.
  Úsala cuando: cualquier decisión/plan/output no trivial, un gap o duda bloquea, antes de cerrar una fase o gate, "drill", "drillme", "clarifica", "especificar mejor", "no dejar gaps", "pregúntame todo", "interrógame", "valida", "cuestiona".
  Keywords - drill, drillme, socratic, 5-whys, first-principles, clarify, clarificar,
  gaps, gap, especificar mejor, define requirements, ambiguity, ambigüedad, dudas,
  valida, cuestiona, challenge, interrogate, antes-de-cerrar, antes-de-decidir,
  pregúntame, no dejar gaps, inversion, doubt, stuck, ambiguous
disable-model-invocation: false
argument-hint: "[contexto o pregunta]"
when_to_use: |
  "pregúntame lo que falte", "interrógame", "cierra gaps", "no dejes dudas", "clarify the decision", "drill this", "challenge the plan"
---

# Drillme — Exhaustive Socratic Check

A meta-skill any other skill (and the Lead) can invoke to **close every gap in a decision before it is committed**. Drillme sweeps the decision against a coverage checklist of question categories, asks — in funnel rounds — as many questions as the real gaps require (2 or 40), bakes the answers into the active artefact, and stops only when no remaining question would change the decision.

## Underlying principle

> "If everyone is thinking alike, then somebody isn't thinking." — Tenth Man Rule

Most engineering pain comes from deciding with hidden gaps — assumptions nobody surfaced, edge cases nobody named, requirements left to chance. The doctrine (CLAUDE.md §Communication & Honesty Protocol) is explicit: *ask in rounds — including lateral/improvement questions — until no remaining question would change the decision.* Drillme is the catalog that operationalizes it. Exhaustive does **not** mean "many questions on everything" — it means **cover the whole space of ambiguity without redundancy**: every question must carry information gain (the anti-padding guard). Research backing: clarifying selectively (not always/never) and stopping at information-gain saturation reduces both errors and wasted questions ([Active Task Disambiguation, arXiv 2502.04485](https://arxiv.org/pdf/2502.04485); [SAGE-Agent EVPI, arXiv 2511.08798](https://arxiv.org/html/2511.08798v1)).

## Hybrid activation (when it fires, when it stays silent)

Drillme is **considered everywhere** but **gated by gaps**. There is no graduated calibration ("N questions for trivial, M for architectural"). The gate is binary and generation-executable:

> **For the context in front of you, is there a gap, doubt, or under-specified point whose answer would change the decision?**
> - **No** → produce **0 questions**. Say "No open gaps — nothing to drill" and close immediately. This is the trivial case (a rename, a typo, a fix with a clear repro). Zero ceremony — honours Commandment III.
> - **Yes** → run the recipe below and sweep until every such gap is closed.

This is why "always active" and "no over-engineering" do not conflict: a typo surfaces no gaps, so drillme runs and closes with zero questions; an ambiguous feature surfaces many, so it asks until they are gone.

## When NOT to drill at all

| Anti-trigger | Why |
|---|---|
| Decision already committed (code merged, PR closed) | Post-commitment drilling is rationalization, not analysis |
| Genuinely no gap surfaces in Step 1 | Hybrid gate returns 0 questions — that IS drillme working, not skipping it |
| High-stakes architectural commitment needing multiple independent voices | Escalate to `decision-stress-test` (5-12 perspectives debating); drillme asks the user, it does not simulate a panel |

## The recipe

### Step 1 — Gap gate (hybrid activation)

Scan the context and ask yourself the binary gate above. If no gap would change the decision → 0 questions, close. Otherwise continue. If `$ARGUMENTS` is empty and a `.claude/plans/{NNN}-{slug}/` artefact is active, take that as the context (auto-detect the latest phase: `retro.md` > `review.md` > `tests/validations.md` > `tasks/index.md` > `spec.md`).

### Step 2 — Sweep the coverage checklist

Go category by category. **For each category, if a gap exists, write the question(s); if it genuinely does not apply, declare "N/A — <reason>".** Never invent a question to fill a category (anti-padding / "Synthetic coverage").

**Canonical 4 (the WHAT):**

| Tag | Probes |
|---|---|
| `[location]` | Right place/file/layer/scope? Global vs project layer? |
| `[approach]` | Why this over the alternative? What did we reject? Simplest version? Right problem? |
| `[context]` | What does it touch/depend on? Invariants? Existing pattern ignored? |
| `[failure]` | What breaks? Worst case? Silent failure mode? 6-months-later regret? |

**Lateral / improvement aspects (what the user did NOT mention — surface these proactively):** partial failures · retries / idempotency · timeouts & downtime · input validation · authz / security surface · performance & scale · observability / debuggability · migration / rollback / backward-compat · UX / DX of the public surface · cost & effort tradeoff · data & state lifecycle · concurrency.

**Complementary patterns (the HOW — dig deeper when a single question doesn't crystallize):** 5-whys (symptom→root), first principles (strip to atoms, rebuild), inversion (what if the opposite were true?). Detail in `references/02-complementary-patterns.md`.

**Phase bank (inside /flow):** if a workflow phase is detected, append its bank from `references/03-phase-questions.md`, tagged `[phase-N]`.

Full category templates + adaptation in `references/01-catalog-socratic.md`.

### Step 3 — Funnel rounds (delivery)

Deliver via `AskUserQuestion` in **thematic rounds**, not 40-at-once and not strictly one-at-a-time. Use the funnel order: **open** (broad framing) → **probing** (specifics) → **closing** (confirm / close doors). Group questions by category per round. For open-ended questions, offer 2-4 example options + the native "Other" so the user is oriented but free. Questions are direct — no hedging ("What happens if X?" not "Could there perhaps be a case where X?").

### Step 4 — Bake the answers

Every answer is **written into the active artefact**, never left floating (pattern: `/speckit.clarify`):
- Inside /flow → into `spec.md` / `tasks/` / the decision doc (a "Decisiones" or "Clarifications" section).
- Standalone (no artefact) → report inline as a `question → answer` table; create a scratch section only if the user wants persistence.

### Step 5 — Evaluate and iterate (soft brake)

Classify each answer (Concrete / Evasive / Empty / Off-topic / Contradictory — see `references/04-quality-check.md`). Re-ask the gaps that still would change the decision. **Distinguish epistemic from aleatoric doubt:** if a gap is reducible by asking, press once for concretion; if it is irreducible (the user cannot know either), mark it `[OPEN]` and move on — do not machine-gun it.

**Stop when** either holds — there is no fixed round/question cap:
- **Saturation**: no remaining question would change the decision. Declare "zero open gaps".
- **Degradation (soft brake)**: answers degrade (repeated evasions, rubber-stamping, goalposts shifting) or the user fatigues → stop honestly and report `[OPEN]` items. Forcing answers past this point produces filler, not signal.

### Step 6 — Close or escalate

Close with one of: "zero open gaps" (+ the baked answers) or a list of `[OPEN]` items with what each needs to resolve. If the blocker is a genuine disagreement or the decision still won't crystallize after the sweep → **escalate to `decision-stress-test`** (multi-perspective debate) and say so.

## Worked example (battery on an ambiguous decision)

Context: *"I want to add caching to the products endpoint."* The gap gate returns **Yes** (many unstated decisions). A first sweep produces a battery like this (delivered across ~5 funnel rounds, not at once) — illustrating that 20-40 questions is normal when the gaps are real. This is capability, **not a quota**:

```
ROUND 1 — open / framing
1.  [approach]  What problem does caching solve here — latency, DB load, cost? Which is the binding one?
2.  [approach]  Why caching over the alternatives (read replica, query optimization, denormalization)? What was rejected?
3.  [failure]   What happens today without it — is this a real, measured pain or anticipated?

ROUND 2 — context / surface
4.  [context]   What reads the products endpoint, and how fresh must the data be per consumer?
5.  [context]   Is product data written from one place or many? Who invalidates?
6.  [location]  Cache at which layer — HTTP/CDN, application, or DB query cache?
7.  [context]   Does any existing caching exist in the project we should extend, not reinvent?

ROUND 3 — invalidation & correctness (lateral)
8.  [failure]   On a product update, how stale can a read be? Seconds? Minutes? Never?
9.  [failure]   What's the invalidation trigger — write-through, TTL, event, manual purge?
10. [failure]   What happens on a cache miss storm (cold start, mass invalidation)? Thundering herd?
11. [failure]   Silent failure: if the cache returns stale/wrong data, how would we even notice?

ROUND 4 — operational / lateral aspects
12. [context]   Where does the cache live — in-process, Redis, CDN? Who operates it?
13. [failure]   What's the behaviour if the cache backend is down — fail open (DB) or fail closed?
14. [context]   Memory/size budget? Eviction policy? What's the key space cardinality?
15. [failure]   Per-tenant isolation: can tenant A's cached product leak to tenant B? (authz surface)
16. [context]   Observability: do we need hit/miss metrics, and where do they go?
17. [approach]  Migration/rollback: can we ship it dark/behind a flag and turn it off instantly?

ROUND 5 — scope / closing
18. [approach]  Simplest version that helps — just a 30s TTL on the list endpoint? Or full per-entity cache?
19. [approach]  What's explicitly OUT of scope for this change?
20. [context]   Cost/effort: is the latency win worth the operational surface a cache adds?
21. [failure]   6 months later this caused an incident — what was the most likely cause?
22. [approach]  Success metric: how do we know in 2 weeks this was the right call?
```

Each answer is baked into the spec/decision. The sweep stops when these are closed and no new gap surfaces — or soft-stops with `[OPEN]` if answers degrade. On a trivial input (`"rename count to total in this file"`) the same gate yields **zero** of these questions.

## Drillme vs decision-stress-test

| Dimension | drillme | decision-stress-test |
|---|---|---|
| Shape | **One voice asking the user** N questions | **5-12 agents debating** one decision |
| Input | Gaps in a decision/plan/output | A committed-to choice to stress |
| Output | Closed gaps baked into the artefact (or `[OPEN]`) | Multi-perspective synthesis + vote |
| When | Default for closing any non-trivial decision | High-stakes architectural commitment |

Start with drillme; if it surfaces a genuine disagreement or won't crystallize after the sweep → escalate to `decision-stress-test`.

## SIEMPRE rules

- **Gap gate first**: 0 questions when nothing would change the decision; exhaustive sweep when gaps exist. Never a fixed count.
- **Anti-padding**: never invent a question to fill a category. Declare "N/A — reason" honestly. Every question carries information gain.
- **Bake answers**: write them into the artefact; never let them float.
- **Soft brake, not hard cap**: stop at saturation or degradation, marking `[OPEN]` for irreducible gaps — never machine-gun the user.
- **No softening**: questions are direct, not hedged.
- **Guidance, not gate**: drillme never blocks; its output is questions + baked answers. What the decision-maker does with them is their call.

## Anti-patterns

| Anti-pattern | Detection | Correction |
|---|---|---|
| Non-executable manifesto | "Ask until saturated" with no mechanics | Sweep the checklist; per category, if a gap exists, ask |
| Synthetic coverage | Question invented to fill a `[category]` quota | Declare "N/A — reason"; coverage is gap-driven, not count-driven |
| Padding to a number | "Always 20+ questions" because exhaustive | Anti-padding: the worked example is capability, not a quota |
| Over-firing on trivial | Battery on a rename/typo | Gap gate returns 0 — that IS drillme working |
| Machine-gunning | Re-asking an irreducible (aleatoric) gap | Mark `[OPEN]`; press only reducible (epistemic) gaps |
| Floating answers | Asked, answered, never recorded | Bake into spec/tasks/decision (or inline table standalone) |
| Softened questions | "Could perhaps... / Maybe consider..." | Direct: "What happens if X?" |
| Confusion with stress-test | drillme used for a multi-voice architectural debate | Escalate to `decision-stress-test` |

## Commandments cubiertos

| # | Cómo |
|---|---|
| I | Honest about known vs unknown; irreducible gaps marked `[OPEN]`, no forced concretion |
| II | Premises that cite files/functions are verified (anti-hallucination) before treating an answer as Concrete |
| III | Hybrid gate: 0 questions on trivial = zero ceremony; anti-padding keeps exhaustive ≠ bloated |
| V | Exhaustive gap-closing IS understand-before-acting |
| VIII | The coverage checklist + funnel IS structured meta-prompting |

## Content map

| Topic | File |
|---|---|
| Canonical 4 categories — templates, coverage checklist, lateral aspects, anti-patterns | `${CLAUDE_SKILL_DIR}/references/01-catalog-socratic.md` |
| Complementary patterns (5-whys, first principles, inversion) | `${CLAUDE_SKILL_DIR}/references/02-complementary-patterns.md` |
| Phase-specific question banks (Phase 1 / 2 / 2.5 / 3 / 4 / 5) | `${CLAUDE_SKILL_DIR}/references/03-phase-questions.md` |
| Answer evaluation + soft-brake + epistemic/aleatoric + bake loop | `${CLAUDE_SKILL_DIR}/references/04-quality-check.md` |
