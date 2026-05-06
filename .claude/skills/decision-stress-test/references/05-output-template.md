---
parent: decision-stress-test
name: output-template
description: Literal output template, scaled by stakes, with 2 worked examples (Low and High)
---

# Output Template

The final stress-test output follows this structure. Sections marked `[High only]` are emitted only when stakes = High (or High with UX). Sections marked `[Medium+]` are emitted for Medium and High.

## Literal Template

```markdown
# Decision Stress-Test: <decision summary>

## Stakes Tier
**Tier**: [Low / Medium / High / High with UX]
**Reasoning**: <1-2 sentences on why this tier>
**Perspectives spawned**: [count + names]
**Debate cycles**: [0 / 1 / 2 / 3 / max-reached]

## Initial Triage
<questions asked + answers received, OR "Skipped — input was sufficient">

## Framing Check
<answer to "are we solving the right problem?", "is there an Option C?">

## Phase 1: Perspectives

### [Perspective 1 name]
**Position**: [...]    **Confidence**: [0-100]
#### Pros
- ...
#### Contras
- ...
#### Context I needed
- ...
#### Questions for the user (if any)
- ...

### [Perspective 2 name]
... (same structure)

(repeat for all spawned perspectives)

## Phase 2: Debate Summary    [Medium+]
- Cycles run: [1 / 2 / 3 / max-reached]
- Step-back verdict trajectory: [e.g., FULL → PARTIAL → CONVERGED]
- Perspectives that changed Position: [list]
- New pros surfaced post-debate: [list]
- New contras surfaced post-debate: [list]
- Convergence: [genuine / entrenched / failed / max-reached]
- Phase 1.5 perspective added (if any): [name + reason]

## Phase 3: Synthesis

### Steel-Man (post-debate)
<coherent paragraph; if cannot be built → "STEEL-MAN FAILED — decision is not defensible">

### Assumption Audit
| Assumption | Likelihood true | Impact if false | Flag |
|---|---|---|---|
| ... | ... | ... | ... |

### Pre-Mortem    [Medium+]
| Failure mode | Trigger | Predicted by | Confidence |
|---|---|---|---|
| ... | ... | ... | ... |

### Inversion    [High only]
| Worst-outcome condition | Present in proposal? |
|---|---|
| ... | ... |

### Second-Order Effects    [High only]
- 2nd-order positive: ...
- 2nd-order negative: ...
- 3rd-order (HIGH stakes only): ...

## Tradeoff Map

| Dimension | Option A | Option B | Weight | Confidence |
|---|---|---|---|---|
| <e.g., latency> | <pro/con summary> | <pro/con summary> | <N perspectives flagged> | <HIGH/MEDIUM/LOW> |
| <e.g., ops complexity> | ... | ... | ... | ... |
| <e.g., cost> | ... | ... | ... | ... |

**Weight** = number of perspectives that flagged this dimension as material to the decision.
**Confidence** = HIGH if triangulated by ≥2 perspectives; MEDIUM if 1 perspective with verified evidence; LOW otherwise.

## Triangulated Findings
<findings flagged HIGH because ≥2 perspectives reported the same point>

## Core Tension
<the single unresolved disagreement, if any. THIS IS THE INSIGHT.>
<If debate failed: explicitly note "no core tension surfaced — debate was entrenched/failed">

## Decision Guide
| If <condition> → | Then <recommendation> |
|---|---|
| ... | ... |

## Verdict
**Recommendation**: [Proceed / Proceed with conditions / Investigate first / Reject]
**One-line summary**: <1 sentence>
**Concrete next steps**:
1. ...
2. ...

## Confidence Calibration
**Overall confidence**: [HIGH / MEDIUM / LOW / UNKNOWN]
**Key assumptions** (if these break, verdict changes):
- ...
**Conditions invalidating verdict**:
- ...
**Monitoring signals** (watch these post-decision):
- ...

## Phase 4: Validation Report
**4.1 Findings Validation**: [PASS / FAIL — reason]
**4.2 Debate Validation**: [PASS / FAIL — reason / N/A if Low stakes]
**4.3 Verdict Validation**: [PASS / FAIL — reason]
**4.4 Self-Meta Check** (5-question audit):
- [ ] Steel-Man genuinely strong
- [ ] No vague doom
- [ ] Real diversity across perspectives
- [ ] Outsider stayed isolated
- [ ] Debate produced movement (or failure honestly reported)

**4.5 Overall Gate**: [PASS / FAIL]
**Confidence downgrade applied**: [yes (HIGH→MEDIUM) / no]

## Phase 5: Final Recommendation with Per-Perspective Vote

### Recommendation (drafted from Phase 3 + Phase 4)
<1-2 paragraph crisp recommendation with concrete next steps>

### Vote Tally
| Perspective | Vote | Reason (verbatim) |
|---|---|---|
| Outsider | [SUPPORT/OPPOSE/CONDITIONAL/ABSTAIN] | "..." |
| Adversary | ... | "..." |
| (one row per spawned perspective) | ... | "..." |

### Dissenting reasons (verbatim, not summarized)
<each OPPOSE / CONDITIONAL reason transcribed exactly as the perspective wrote it>

### Consensus Level (qualitative)
**Level**: [Strong consensus / Mixed / Weak consensus / No consensus]
**Computed from**: <X SUPPORT / Y CONDITIONAL / Z OPPOSE / W ABSTAIN out of N (excluding step-back judge)>

### Decision Confidence Score (numeric)
| Signal | Value | Interpretation |
|---|---|---|
| Panelist consensus | <N>/<total> SUPPORT (<%>) | <strong/moderate/weak> |
| Confidence spread | <min>%–<max>% (Δ <delta>%) | <narrow/moderate/wide> |
| Position shifts during debate | <N> of <total> perspectives | <stable/healthy/volatile> |
| Cycles to converge | <N> of 3 | <fast/normal/slow/max-reached> |
| Step-back trajectory | <[verdict sequence]> | <smooth/recovered/contested> |

**Final Decision Confidence**: <0-100>%
> Interpretation: >80% strong / 50-80% moderate / <50% contested

### Final verdict (after consensus interaction)
<verdict tag, possibly downgraded based on Phase 4 + Phase 5 interaction>

## Outstanding Questions for the User
1. ...
```

---

## Scaling by Stakes

| Section | Low | Medium | High |
|---|---|---|---|
| Stakes Tier | yes | yes | yes |
| Initial Triage | yes if asked | yes if asked | yes if asked |
| Framing Check | optional | yes | yes |
| Phase 1 (perspectives) | 5 | 8 | 11 (or 12) |
| Phase 2 Debate | omit | yes (max 3 cycles, step-back judge) | yes (max 3 cycles, step-back judge) |
| Steel-Man | yes | yes | yes |
| Assumption Audit | yes | yes | yes |
| Pre-Mortem | omit | yes | yes |
| Inversion | omit | omit | yes |
| Second-Order | omit | omit | yes |
| Tradeoff Map | omit | yes | yes |
| Triangulated Findings | omit | yes | yes |
| Core Tension | omit | yes | yes |
| Decision Guide | optional | yes | yes |
| Verdict | yes | yes | yes |
| Confidence Calibration | brief | full | full |
| Phase 4 Validation Report | mandatory | mandatory | mandatory |
| Phase 5 Final Recommendation Vote | mandatory | mandatory | mandatory |

---

## Worked Example A — Low Stakes (5 perspectives, no debate)

**Input**: "Should the new pytest fixture have scope=`session` or scope=`function`?"

```markdown
# Decision Stress-Test: pytest fixture scope=session vs function

## Stakes Tier
**Tier**: Low
**Reasoning**: Reversible per fixture, no public surface, isolated change.
**Perspectives spawned**: 5 (Outsider, Adversary, Maintainer, Simplifier, Linus)
**Debate cycles**: 0 (Low stakes — Phase 2 skipped)

## Phase 1: Perspectives

### Outsider
**Position**: conditional / **Confidence**: 60
#### Pros
- Both scopes work. The choice is local.
#### Contras (Minor)
- The framing assumes the fixture should be reused. If it should be deterministic, scope=function is the only safe answer.
#### Naive questions
- What is the fixture? Does it carry state across tests?

### Adversary
**Position**: against scope=session if state mutates / **Confidence**: 80
#### Pros
- scope=session is faster
#### Contras (Major if mutable state)
- Test contamination — most painful failure mode in test suites
#### Mitigation
- Use scope=function unless the fixture is read-only

### Maintainer
**Position**: scope=function / **Confidence**: 75
#### Pros
- Most predictable; new contributors won't be surprised
#### Contras (Minor)
- Slower

### Simplifier
**Position**: scope=function / **Confidence**: 80
#### What's added that the problem doesn't strictly require
- The decision itself: pytest's default IS function-scope. Choosing scope=function is choosing the default — not adding anything. Choosing session is adding a non-default behavior plus an implicit read-only contract.
#### Simplest version that could work
- Use the default. Document the reason inline if non-obvious. Promote to session only if a measurement justifies it.

### Linus
**Position**: scope=function / **Confidence**: 90
#### What I'd actually do
"Default to function. Promote to session ONLY if you've measured a real cost AND the fixture is provably read-only."

## Phase 3: Synthesis

### Steel-Man (for scope=session)
The fixture is read-only and tests are slow enough that session scope is measurable wins; team understands the contract.

### Assumption Audit
| Assumption | Likelihood true | Impact if false | Flag |
|---|---|---|---|
| Fixture is read-only | unknown | High (test contamination) | needs verification |

## Verdict
**Recommendation**: Proceed with scope=function unless fixture is provably read-only AND speedup is measured.
**Confidence**: HIGH

## Phase 4: Validation Report
**4.1 Findings Validation**: PASS
**4.2 Debate Validation**: N/A (Low stakes — no debate)
**4.3 Verdict Validation**: PASS — verdict is actionable; "scope=function unless read-only AND speedup measured"
**4.4 Self-Meta Check**:
- [x] Steel-Man strong
- [x] No vague doom
- [x] Real diversity
- [x] Outsider isolated
- [x] N/A (no debate)

**4.5 Overall Gate**: PASS
**Confidence downgrade applied**: no

## Phase 5: Final Recommendation with Per-Perspective Vote

### Recommendation
Default the new fixture to `scope=function`. Promote to `scope=session` only if the fixture is provably read-only AND a measured speedup justifies it.

### Vote Tally
| Perspective | Vote | Reason |
|---|---|---|
| Outsider | SUPPORT | "Conservative default; honest about the unknown" |
| Adversary | SUPPORT | "Test contamination risk avoided" |
| Maintainer | SUPPORT | "New contributors won't be surprised" |
| Simplifier | SUPPORT | "Choosing the default is choosing nothing extra" |
| Linus | SUPPORT | "Default to function. Promote only with measurement. Correct." |

### Dissenting reasons
None.

### Consensus level
**Level**: Strong consensus (5/5 SUPPORT)

### Decision Confidence Score
N/A for Low stakes — no debate cycles, no step-back judge. Confidence derived from Phase 4 Validation result and Phase 5 unanimity.
**Final Decision Confidence**: 92% (5/5 SUPPORT, all HIGH-confidence findings, Phase 4 PASS)

### Final verdict (after consensus interaction)
Proceed with `scope=function`. Confidence remains HIGH.
```

---

## Worked Example B — High Stakes (11 perspectives, 1 debate round)

**Input**: "I'm going to migrate from Postgres to DynamoDB to reduce costs."

```markdown
# Decision Stress-Test: Postgres → DynamoDB migration

## Stakes Tier
**Tier**: High
**Reasoning**: Architectural; near-irreversible (data shape and access patterns differ); production data at risk.
**Perspectives spawned**: 11 (Outsider, Adversary, Performance, Security, Maintainer, Simplifier, Operator, Cost Optimizer, Product, Linus, Karpathy)
**Debate cycles**: 1 (CONVERGED at cycle 1)

## Initial Triage
- Q: "What workload (RPS, query mix, joins)?" — A: "~500 RPS, mostly key-lookups, some range scans"
- Q: "Cost estimate that motivates this?" — A: "Postgres RDS is $X/month, DynamoDB estimated $Y"

## Framing Check
- Real problem: cost, not capability. Option C considered: rightsize Postgres (smaller instance, optimize queries) before migrating.

## Phase 1: Perspectives (abbreviated)
### Outsider
- "Why a different database, not a smaller instance? Have you measured why Postgres costs what it costs?"
### Adversary
- Pre-mortem: "6 months in, range scans hit DynamoDB hot partitions; you're back to RDBMS"
### Performance
- "DynamoDB excels at key lookups; range scans require GSIs which you'd need to design carefully"
### Security
- "IAM-based access changes audit story; check compliance"
### Maintainer
- "Schema migration is one-way; rollback story is non-trivial"
### Simplifier
- "Simplest version: rightsize Postgres before migrating. Removes the entire DynamoDB question if the cost gap closes. The proposal adds a database migration to solve a cost problem; the simpler version solves the cost problem directly."
### Operator
- "DynamoDB removes ops; this is the strongest pro"
### Cost Optimizer
- "Current Postgres bill: ~$X/mo. Projected DynamoDB: ~$Y/mo IF workload stays key-lookup. Migration eng-time: ~Z weeks loaded cost. 80/20 alternative: rightsize Postgres for ~30% savings without migration. Opportunity cost: those Z weeks NOT spent on [other roadmap items]."
### Product
- "Cost reduction is a roadmap item; correct lens. But how much? Is it material?"
### Linus
- "Show me the bill. Show me the query plan. Migrating because Postgres 'feels' expensive is not engineering."
### Karpathy
- "From an agent-readability angle, the schema diverges between Postgres and DynamoDB enough that future LLM-driven maintenance gets harder either way. The codebase becomes bilingual."
- *What an LLM agent would struggle with here*: cross-store consistency code; GSI design (less standard than SQL indexes); migration shims that linger.
- *What I'd actually build first*: 7-day pg_stat_statements trace + cost projection from the measured workload. Then decide.

## Phase 2: Debate Summary
- Cycles run: 1 (CONVERGED)
- Step-back verdict trajectory: [CONVERGED]
- Perspectives that changed: Operator (moved from supportive to conditional after reading Adversary's pre-mortem)
- New pros surfaced: "DynamoDB Streams could replace existing CDC pipeline" (Operator)
- New contras surfaced: "GSIs cost as much as the table itself for range-heavy workloads" (Performance, citing Context7)
- Convergence: genuine — most perspectives moved toward "Investigate first"
- Phase 1.5: not triggered

## Phase 3: Synthesis
### Steel-Man (post-debate)
DynamoDB removes ops burden, cuts unit cost on pure key-lookups, and unlocks Streams for CDC replacement. If workload is overwhelmingly key-lookup and access patterns are stable, this is a valid simplification.

### Assumption Audit
| Assumption | Likelihood true | Impact if false | Flag |
|---|---|---|---|
| Workload is mostly key-lookups | Medium | Critical | shared by Performance + Operator |
| Cost gap is material at scale | Unknown | High | needs measurement |

### Pre-Mortem (triangulated)
| Failure mode | Trigger | Predicted by | Confidence |
|---|---|---|---|
| Range-scan workloads hit hot partitions | Existing analytics queries | Adversary, Performance | HIGH (triangulated) |
| One-way migration → trapped | Schema diverges | Maintainer, Adversary | HIGH (triangulated) |

### Inversion
| Condition | Present? |
|---|---|
| Migrate without measuring current cost drivers | Yes |
| No rollback plan | Yes |
| Treat all queries the same | Yes |

### Second-Order Effects
- 2nd-order negative: team learns DynamoDB modelling but loses fluency in SQL access patterns
- 3rd-order: future feature requiring joins (likely) becomes a re-architecture event

## Tradeoff Map

| Dimension | Postgres (current) | DynamoDB | Weight | Confidence |
|---|---|---|---|---|
| Cost (key-lookups) | $X/mo, baseline | Lower per request | 3 perspectives flagged | MEDIUM (depends on workload mix) |
| Range scans | Native, indexed | Requires GSIs (expensive) | 2 perspectives flagged | HIGH (triangulated: Adversary + Performance) |
| Ops burden | RDS managed | Fully managed (DDB) | 2 perspectives flagged | HIGH |
| Reversibility | N/A (status quo) | One-way; schema diverges | 2 perspectives flagged | HIGH (triangulated: Maintainer + Adversary) |
| Compliance | Audit story stable | IAM-based access changes audit | 1 perspective flagged | MEDIUM (Security only) |
| Future joins | Native | Re-architecture event | 1 perspective flagged | LOW (speculative) |

## Triangulated Findings
- HIGH: Range-scan failure mode (Adversary + Performance)
- HIGH: Trapped-migration risk (Maintainer + Adversary)
- HIGH: Decision without measurement (Outsider + Linus + Product)

## Core Tension
**Cost reduction (real)** vs **access-pattern flexibility (lost on migration)**. This tension is structural — DynamoDB cannot have both.

## Decision Guide
| If | Then |
|---|---|
| Cost gap < 30% AND access patterns include range scans | Reject — rightsize Postgres |
| Cost gap > 50% AND workload is overwhelmingly key-lookup | Proceed with phased migration |
| Workload uncertain | Investigate first |

## Verdict
**Recommendation**: Investigate first.
**One-line summary**: "Measure current Postgres cost drivers and access-pattern distribution before committing."
**Concrete next steps**:
1. Run pg_stat_statements for 7 days → classify queries by type
2. Compute realistic DynamoDB bill from query distribution
3. Re-run stress-test with measured numbers

## Confidence Calibration
**Overall confidence**: MEDIUM (verdict is high-confidence "investigate"; not high-confidence in the migration itself)
**Key assumptions**: workload is stable; cost is the only driver
**Conditions invalidating**: discovery of significant range scans
**Monitoring signals** (post-decision if migration proceeds): hot-partition metrics, GSI cost, p99 read latency

## Phase 4: Validation Report
**4.1 Findings Validation**: PASS — all HIGH findings cite triangulation or Context7
**4.2 Debate Validation**: PASS — Operator changed Position; 2 new contras surfaced (GSI cost, Streams use)
**4.3 Verdict Validation**: PASS — verdict has 3 concrete next steps; monitoring signals are measurable (hot-partition metrics, GSI cost, p99 read latency); invalidating condition named (range scans discovered)
**4.4 Self-Meta Check**:
- [x] Steel-Man strong
- [x] No vague doom
- [x] Real diversity
- [x] Outsider isolated
- [x] Debate produced movement (Operator changed position)

**4.5 Overall Gate**: PASS
**Confidence downgrade applied**: no

## Phase 5: Final Recommendation with Per-Perspective Vote

### Recommendation
Do not migrate yet. Run pg_stat_statements for 7 days, classify queries by type, compute a realistic DynamoDB bill from the measured distribution, then re-run the stress-test with numbers. Only proceed if cost gap >50% AND workload is overwhelmingly key-lookup with stable access patterns.

### Vote Tally
| Perspective | Vote | Reason |
|---|---|---|
| Outsider | SUPPORT | "Measure before migrating; the framing required this anyway" |
| Adversary | SUPPORT | "Pre-mortem failure modes are not addressable without measurement" |
| Performance | SUPPORT | "GSI cost is real; measurement decides whether DynamoDB wins" |
| Security | CONDITIONAL | "Compliance audit must complete before any migration step, even measurement that touches prod data" |
| Maintainer | SUPPORT | "One-way migration without measurement would be reckless" |
| Simplifier | SUPPORT | "Rightsize Postgres first; the migration is a category mistake" |
| Operator | CONDITIONAL | "Streams replacement for CDC is real upside; if measurement passes, plan it explicitly" |
| Cost Optimizer | SUPPORT | "Measure before committing engineer-weeks to a one-way migration" |
| Product | SUPPORT | "Decision should be cost-driven with numbers, not vibes" |
| Linus | SUPPORT | "'Show me the bill, show me the query plan' — exactly this." |
| Karpathy | SUPPORT | "Build the trace first. Decide with data." |

### Dissenting reasons (verbatim)
- **Security (CONDITIONAL)**: "Compliance audit must complete before any migration step, even measurement that touches prod data"
- **Operator (CONDITIONAL)**: "Streams replacement for CDC is real upside; if measurement passes, plan it explicitly"

### Consensus level
**Level**: Strong consensus (9 SUPPORT / 2 CONDITIONAL / 0 OPPOSE / 0 ABSTAIN out of 11 — 82% SUPPORT, 18% CONDITIONAL with named conditions, no OPPOSE)

### Decision Confidence Score
| Signal | Value | Interpretation |
|---|---|---|
| Panelist consensus | 9/11 SUPPORT (82%) | Strong (2 CONDITIONAL with named conditions) |
| Confidence spread | 60%–90% (Δ 30%) | Moderate |
| Position shifts during debate | 1 of 11 (Operator) | Healthy (some movement, not entrenched) |
| Cycles to converge | 1 of 3 | Fast (CONVERGED at cycle 1) |
| Step-back trajectory | [CONVERGED] | Smooth (no FULL re-debate needed) |

**Final Decision Confidence**: 82%
> Interpretation: strong consensus with named conditions → proceed with conditions (Security compliance gate first)

### Final verdict (after consensus interaction)
Investigate first — proceed with measurement plan, gated by Security's compliance condition. Confidence: MEDIUM (Phase 4 PASS + Phase 5 strong consensus with conditions; conditions are addressable).
```
