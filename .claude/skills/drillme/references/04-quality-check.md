---
parent: drillme
name: quality-check
description: How to evaluate answers to drillme questions — concretion criteria, iteration protocol, smell signals.
---

# Quality check for drillme answers

## Contents

- [Answer classification](#answer-classification)
- [Iteration protocol](#iteration-protocol)
- [Closing criterion](#closing-criterion)
- [Smell signals during iteration](#smell-signals-during-iteration)
- [Anti-patterns in answer evaluation](#anti-patterns-in-answer-evaluation)
- [Format of iteration output](#format-of-iteration-output)
- [Drillme iteration 2 — quality check](#drillme-iteration-2-quality-check)
- [When to give up gracefully](#when-to-give-up-gracefully)

When the user (or Lead) answers drillme questions and asks for iteration, each answer must pass a quality check before being marked closed. The check prevents "ceremonia": questions that get fake-closed with vague answers and the decision proceeds on hot air.

## Answer classification

| Class | Detection | Action |
|---|---|---|
| **Concrete** | Specific noun + verb + scope; verifiable mechanically or by inspection | Mark closed |
| **Evasive** | "Depende", "más o menos", "probably", "creo que", "should be" without specifics | Request concretion |
| **Empty / I-don't-know** | "No sé", "ni idea", blank | Two paths (see below) |
| **Off-topic** | Answer addresses a different question than the one asked | Re-ask the original |
| **Contradictory** | Answer contradicts an earlier closed answer | Reopen earlier; reconcile |

### Concrete — examples

| Question | Concrete answer |
|---|---|
| `[approach]` Why this over alternative? | "We rejected option B because it requires Postgres v15+ and we're on v13" — names alternative, reason, constraint |
| `[failure]` What happens if X? | "Endpoint returns 500; client retries 3x with backoff; if still fails, queue for manual review" — specific behavior |
| `[location]` Right place? | "Belongs in `auth/middleware.ts` because other middleware lives there, verified via Glob" — specific path + rationale |

### Evasive — examples (and how to escalate)

| Answer | Follow-up |
|---|---|
| "Depende del contexto" | "¿De qué contexto específicamente? Dame el caso más común que viste." |
| "Probably fine" | "¿Probably fine en qué sentido? ¿Performance? ¿Correctness? ¿Operativa?" |
| "Creo que es así" | "¿Verificable cómo? ¿Hay una manera de confirmarlo en 1 minuto?" |

### Empty / I-don't-know — two paths

1. **Honest unknown**: user genuinely doesn't have the info. Mark question `[OPEN]`. Action: identify what's needed to answer (research, ask another person, run an experiment).
2. **Lazy unknown**: user is avoiding the question. Press once: "¿No sabes o no quieres entrar? Si no sabes, ¿qué necesitas para saber?" — if still empty, mark `[OPEN]` and surface to the decision-maker.

Distinction matters: honest unknown is a research item; lazy unknown is a quality problem.

## Iteration protocol

When the user requests iteration after first drillme:

1. Receive answers (numbered, matching question numbers).
2. Apply quality check to each.
3. For each Evasive → emit follow-up question (more specific).
4. For each Empty → emit "what would you need to answer this?" — surface the unknown.
5. For each Concrete → close, no re-ask.
6. For each Off-topic → re-ask the original.
7. For each Contradictory → reopen the earlier closed question with the contradiction surfaced.

Cap: max 3 iteration rounds. After round 3, if questions remain Evasive/Empty → drillme cannot conclude here. Escalate.

## Closing criterion

Drillme is "closed" for this session when:

- **≥80% of questions are Concrete** (closed honestly).
- The remaining ≤20% are marked `[OPEN]` with explicit "needs X to resolve".
- No question is silently dropped or fake-closed with evasion.

If <80% Concrete after 3 iterations → drillme honest output: "Inconcluso — N preguntas abiertas. Decision is premature without resolving them."

## Smell signals during iteration

| Signal | Meaning | Action |
|---|---|---|
| User answers all questions in <30 seconds, all Concrete | Either the context was trivial (calibration was off — should have skipped drillme) OR user is rubber-stamping | If first: skip drillme next time for similar context. If second: dig — re-drill with `[failure]` focus |
| Same Evasive pattern across all answers ("depende"/"probably") | User is in low-engagement mode; drillme is producing ceremony | Stop. Ask: "¿Qué necesitas para responder con concreción?" |
| User keeps moving the goalposts (answer changes between iterations) | Decision isn't ready; foundations shifting | Reopen Phase 1 (scope) — the underlying intent isn't stable |
| Answers reveal disagreement with another stakeholder | Drillme reached its ceiling | Escalate to `decision-stress-test` or surface to the disagreeing stakeholder |

## Anti-patterns in answer evaluation

| Anti-pattern | Detection | Correction |
|---|---|---|
| Accepting "probably" as concrete | Marking closed too lenient | Force specificity; "probably" is Evasive by definition |
| Rejecting legitimate unknowns | Treating honest "I don't know" as evasion | Honest unknown is valuable signal; mark `[OPEN]`, don't punish |
| Demanding numeric precision where not needed | Asking "what % chance?" on a qualitative call | Calibration: not all answers need numbers; "high/medium/low confidence + reason" is concrete |
| Iterating until forced agreement | Escalating follow-ups until user just says "yes, fine" | If user is fatigued, drillme has failed; pause |

## Format of iteration output

```markdown
## Drillme iteration 2 — quality check

| # | Original question | Answer class | Status |
|---|---|---|---|
| 1 | [approach] Why this over alt? | Concrete | ✅ Closed |
| 2 | [failure] What if X? | Evasive ("probably fine") | 🔄 Re-asking with specifics |
| 3 | [context] Who depends? | Empty (honest unknown) | ⏸️ Marked [OPEN] — needs grep of consumers |
| 4 | [location] Right place? | Off-topic | 🔄 Re-asking original |

### Re-asks for round 2
2. `[failure]` What does "probably fine" mean? Performance? Correctness? Be specific about the dimension.
4. `[location]` (re-ask) Is `auth/middleware.ts` the right home, or does this belong in `core/`?

### Open items
3. Grep consumers of this function before deciding.
```

## When to give up gracefully

Drillme is guidance, not a forced march. If after 3 iterations the user is fatigued and answers are degrading in quality → stop and report:

> "Drillme concluded with N/M questions Concrete. Remaining items: [list]. Recommended: pause this decision until [research/consultation/data] resolves the gaps."

Honest "inconclusive" beats forced "concluded but rotten".
