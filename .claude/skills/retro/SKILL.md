---
name: retro
description: |
  Post-feature retrospective (Phase 5 of the 5-phase workflow). Captures
  technical lessons, surfaces process friction, proposes
  promotions to one of three scopes (global ~/.claude/ vs project .claude/ vs
  memory-only), closes the living-spec loop by consuming `review.md.spec_drift`
  classified by critic in Phase 4, and audits the 10 Commandments compliance.
  Does NOT auto-edit spec.md for living-spec deltas — produces a diff proposal
  for human approval. Closes the feature lifecycle by flipping spec.md +
  tasks/index.md frontmatter to `status: closed`. Promotions also require
  human approval before any file is written.
  Use when: review.md APPROVED or APPROVED_WITH_WARNINGS, feature complete,
  before declaring lifecycle done, after /critic in Phase 4, "retro",
  "retrospectiva", "aprender", "qué hemos aprendido", "learn", "promote",
  "promover", "living-spec".
  Keywords - retro, retrospectiva, aprender, learn, lecciones, lessons,
  promover, promotion, promote, living-spec, delta, commandments, closure,
  fase-5, phase-5
disable-model-invocation: false
argument-hint: "[--light|--standard|--full]"
effort: medium
---

# Retro (Phase 5)

Last phase of the 5-phase workflow. Captures what worked, what didn't, proposes promotions, closes the living-spec loop. **Honesty is non-negotiable** (Commandment I) — a retro without friction or without a proposed lesson is review theater.

## Underlying principle

> "Without retro, every cycle starts from the same baseline." (Commandment IX — observability and self-improvement; Commandment X — meta-system maintainability)

Phase 4 (critic) measures the deliverable. Phase 5 measures the **process** that produced the deliverable, and turns it into structural improvements. Without this loop the system doesn't learn; with it, every feature potentially upgrades the meta-system itself.

## When to use

| Trigger | Example |
|---|---|
| `review.md` exists with verdict APPROVED or APPROVED_WITH_WARNINGS | After `/critic` closes Phase 4 |
| User invokes `/retro` explicitly | Direct invocation |
| `critic` skill closes Phase 4 and triggers Phase 5 invocation | Auto-chain from Phase 4 |

## When to skip

| Anti-trigger | Why |
|---|---|
| `review.md` verdict is NEEDS_CHANGES or BLOCKED | Phase 3/4 first — retro on incomplete work captures wrong lessons |
| Trivial mode (no `tasks/` directory) | Brief verbal recap to user — Phase 5 ceremony adds nothing |
| Two consecutive retros on the same feature without code change between them | Diminishing returns; skip and proceed |

## Workflow

### Step 1 — Read inputs

In parallel:

1. `Glob .claude/plans/*-*/spec.md` — find active feature with status `approved` and `review.md` present.
2. Read `spec.md` (original problem + AC + out-of-scope).
3. Read `tasks/index.md` + `tasks/US{N}.md` (decomposition + DAG).
4. Read `tests.md` and/or `validations.md` (oracle).
5. Read `review.md` — particularly `frontmatter.verdict` + `frontmatter.spec_drift` + findings count.
6. Read `state.json` — confirm `current_phase: 4` complete.
7. Read `.claude/plans/templates/retro.template.md` (output template).
8. Read `CLAUDE.md` root section "The 10 Commandments" (for Step 9 audit).

### Step 2 — Confirm prerequisites

| Check | Action if fails |
|---|---|
| `review.md.verdict` ∈ {APPROVED, APPROVED_WITH_WARNINGS} | STOP — escalate; do not produce retro on broken work |
| All HUs in `state.json.us_completed` | STOP — escalate |
| `retro.template.md` exists | If missing → use the embedded checklist (Read `references/02-embedded-fallback.md`) |

### Step 3 — Determine retro level (adaptation)

| Signal | Level | Scope |
|---|---|---|
| Feature trivial (1-2 HUs, light review in Phase 4, no decisions made) | **light** | Summary + 1-2 lessons + 0-1 promotion candidates; skip Commandments audit + living-spec loop |
| Feature standard (3-N HUs, no architectural decision absorbed) | **standard** | Full template: Summary, Lessons, Process, Drillme, Promotions, Living-spec, Commandments, Action items |
| Feature with absorbed decisions / architectural / spec-drift detected | **full** | Standard + dedicated section per absorbed decision + Commandments forensics if any violation flagged |

CLI override: `/retro --light` / `--standard` / `--full`. Default = auto-detect from `review.md.review_level` + `state.json.us_history.length` + presence of absorbed decisions.

Declare level in `retro.md` frontmatter (`retro_level: <light|standard|full>` + reason).

### Step 4 — Executive summary

1-2 paragraphs in `retro.md`:

- What was the original problem (1 sentence quoting spec.md)?
- What was delivered (1 sentence on the actual scope of the diff)?
- Verdict (1 sentence: smooth / friction / pivoted mid-way / etc.).

### Step 5 — Technical lessons (✅ worked / ❌ didn't work)

Two lists, honest:

```markdown
### ✅ Patterns that worked
- <pattern>: <why it worked + where to reuse>

### ❌ Patterns that didn't work
- <pattern>: <why it failed + how to avoid next time>
```

Anti-pattern: empty `❌` list. If genuinely zero failures → smell signal (Step 12). Usually at least one friction point exists; surfacing it is the value of the retro.

### Step 6 — Process audit

For each of the 5 phases the feature passed through (scope → tech-plan → tdd-design → build → critic):

| Phase | Effort (S/M/L/XL) | Friction observed | Improvement candidate |
|---|---|---|---|
| Phase 1 (scope) | ... | ... | ... |
| Phase 2 (tech-plan) | ... | ... | ... |
| Phase 2.5 (tdd-design) | ... | ... | ... |
| Phase 3 (build) | ... | ... | ... |
| Phase 4 (critic) | ... | ... | ... |

Identify the heaviest phase + diagnose why. Often the heaviest phase reveals a missing tool or a poorly-tuned skill.

### Step 7 — Drillme Phase 5

The 5 retro-specific questions:

```markdown
## Drillme — Phase 5 (retrospective)

1. `[approach]` **Phase too heavy?** Which phase weighed more than it needed to? Why?
2. `[approach]` **Avoidable friction?** Was there friction that didn't add value? Concrete instance?
3. `[approach]` **Reusable pattern?** Did a pattern emerge that's reusable beyond this feature? Where else?
4. `[context]` **Global vs local vs memory?** If reusable — is it promotable to `~/.claude/` global, only this project's `.claude/`, or just a memory entry?
5. `[failure]` **Commandment violated silently?** Did any of the 10 Commandments get violated without notice during the feature?
```

Coverage: 3/4 canonical Socratic categories (`[approach]`/`[context]`/`[failure]`). Honest — `[location]` was covered in Phase 2/3 (where the code lives). NOT padding with artificial questions.

> Skill-to-skill invocation is **probabilistic**. If `drillme` does not auto-fire, the Lead invokes `/drillme "Phase 5 retro of <NNN-slug>"` manually before closing the feature.

### Step 8 — Promotion candidates

For each reusable pattern surfaced in Step 5/7, produce a row:

| Candidate | Scope | Type | Why | Concrete proposal (path + sketch) |
|---|---|---|---|---|
| `<name>` | global / local / memory | skill / rule / hook / command / agent / mcp / plugin | <1 sentence reason rooted in evidence from this feature> | `<exact path>` + brief diff/content sketch |

**Scope decision matrix**:

| Scope | Use when | Path |
|---|---|---|
| **global** (~/.claude/) | Pattern applies across multiple projects; reusable across stacks; meta-system improvement | `~/.claude/{skills,rules,hooks,agents,commands}/` |
| **local** (project) | Pattern is project-specific (this codebase's conventions); useful here, ceremony elsewhere | `.claude/{skills,rules,hooks,agents,commands}/` |
| **memory** (only) | Single fact / one-off learning; doesn't deserve a file | `MEMORY.md` entry via auto-memory |

**Strict rules**:

- Do NOT auto-promote — produce candidates only; the user approves.
- Each candidate MUST cite the concrete evidence from this feature that motivated it (a finding, a recurring drillme question, a lesson).
- `anti-hallucination`: verify the proposed path does NOT collide with an existing file. If collision → propose rename or merge.
- If `meta-create` auxiliary is invoked → the proposal sketch follows the official frontmatter spec for that extension type.

If zero promotion candidates emerge → declare honestly: "Zero promotions this cycle. Reasons: <list>." If this happens in 3+ consecutive retros → smell signal (Step 12).

### Step 9 — Living-spec loop (consume `spec_drift` from review.md)

Read `review.md.frontmatter.spec_drift`:

| `spec_drift` | Action |
|---|---|
| `none` | No living-spec entry; declare in retro.md: "Spec drift: none — delivered matches spec.md exactly." |
| `legitimate` | Propose a diff to `spec.md` in `retro.md` §Living-spec deltas. **NEVER auto-edit spec.md.** User approves the diff → then the patch is applied with a note "v2 — delta from retro {NNN}-{slug} (reason: <X>)" |
| `scope_creep` | Log in §Lessons ❌ as "scope creep — feature extended beyond spec.md without ratification". Do NOT propose spec update; either revert the extra scope or re-open Phase 1 to ratify properly |
| `skipped_ac` | Log in §Lessons ❌ as "AC X in spec.md not delivered — <reason>". Either schedule follow-up or update spec.md to remove the AC (with explicit "downscoped" annotation) |

**Criterio "delta legítimo"** (formalized — addresses open question of US7):

A delta is legitimate IF AND ONLY IF all three hold:

1. **Real edge case**: the delta resolves an edge case discovered during Phase 3 (build) or Phase 4 (critic), not a change-of-mind without trigger.
2. **No contradiction**: the delta does NOT contradict the original spec.md intent (verify against the problem statement, not just the AC).
3. **Documented why**: the rationale is captured in retro.md §Living-spec deltas with the specific finding that motivated it.

If any of the three fails → not legitimate; route to `scope_creep` instead.

### Step 10 — Commandments audit

For each of the 10 Commandments, mark compliance during this feature:

| # | Commandment | Cumplido? | Evidencia / Violación |
|---|---|---|---|
| I | Honest symbiosis | ✅/⚠️/❌ | <concrete evidence from the diff or process> |
| II | Factual truth | ✅/⚠️/❌ | ... |
| III | Code quality / simple by default | ✅/⚠️/❌ | ... |
| IV | Blocking quality gates | ✅/⚠️/❌ | ... |
| V | Understand before acting | ✅/⚠️/❌ | ... |
| VI | Security without ambiguity | ✅/⚠️/❌ | ... |
| VII | Performance and efficiency | ✅/⚠️/❌ | ... |
| VIII | Optimal meta-prompting | ✅/⚠️/❌ | ... |
| IX | Observability and self-improvement | ✅/⚠️/❌ | ... |
| X | Poneglyph maintainability | ✅/⚠️/❌ | ... |

If ANY commandment is ⚠️ or ❌ → dedicated subsection "Commandment violations forensics" with:

- Which moment in the feature it occurred.
- What was the alternative path.
- Action item to prevent recurrence.

This section is mandatory in `retro_level: full`; optional in `standard`; skipped in `light`.

### Step 11 — Action items

A list of follow-ups, each with an owner:

| Action | Owner | Trigger | Due |
|---|---|---|---|
| <action> | <user / Lead / next-session / new-HU> | <event that gates it> | <concrete date or "next sprint" or "before next feature"> |

Action items typically include: applying approved promotions, ratifying living-spec deltas, addressing commandment violations, splitting an over-large skill that emerged.

### Step 12 — Produce `retro.md`

Write `.claude/plans/{NNN}-{slug}/retro.md` from `templates/retro.template.md`. Frontmatter:

```yaml
---
spec: {NNN}-{slug}
phase: 5
retro_level: <light|standard|full>
verdict_phase4: <APPROVED|APPROVED_WITH_WARNINGS>
spec_drift: <none|legitimate|scope_creep|skipped_ac>
promotions_proposed: N
promotions_approved: 0  # updated after user approval
commandment_violations: N  # count of ⚠️ + ❌ rows
living_spec_delta: <yes|no>
action_items: N
created: YYYY-MM-DD
status: open  # flips to "approved" after user reviews
---
```

Body: 8 sections (Summary, Lessons ✅/❌, Process, Drillme, Promotions, Living-spec, Commandments, Action items).

### Step 13 — Close feature lifecycle (verification gate)

After producing retro.md AND user has reviewed (light/standard) or explicitly closed (full):

**13a. Mandatory verification checklist** — iterate and verify EACH artefact:

```
For each artefact in .claude/plans/{NNN}-{slug}/:
  - [ ] spec.md frontmatter status: closed (else: update + add closed: YYYY-MM-DD)
  - [ ] tasks/index.md frontmatter status: closed (else: update + add closed: YYYY-MM-DD)
  - [ ] For each tasks/US{N}.md:
        if status != closed:
          → mark closed: YYYY-MM-DD + status: closed RESIDUALLY
          → record in retro.md §Lessons ❌: "Phase 3 did not close US{N}.md frontmatter — build skill missed Step 8b on this HU"
  - [ ] If state.json exists → current_phase: closed + feature_closed: true + last_update: YYYY-MM-DD
  - [ ] retro.md frontmatter status: approved (after user review) — flips from initial `open`
```

The retro skill is the **last gate**. Any US{N}.md found not-closed at this point is a Phase 3 (`build`) process failure that the retro must:

1. Close residually (do the work).
2. Flag in lessons ❌ for process improvement (the lesson is about Phase 3, not the HU itself).

**Anti-pattern blocked**: closing the feature with US frontmatters left in `approved` or `draft` → documental incoherence; future audits will surface ghost-state.

**13b. Apply approved promotions and living-spec deltas**:

- Approved promotions → Lead writes the target file inline (default-allow gate covers non-sensitive paths).
- Approved living-spec diff → patch `spec.md` with note "v2 — delta from retro {NNN}-{slug}".

**13c. Update counters**:

- `state.json.retro_status = "approved"`, `feature_closed = true`.
- `retro.md.promotions_approved` counter += N (per actually-applied).

**Important**: do NOT close lifecycle while promotions are still pending approval. Either close them in this session or carry as action items into the next session — but the feature itself CAN close once 13a verification passes (residuals fixed) + retro.md is produced.

### Step 14 — Report + approval request

Report using the block in §Output format reminder (end of this skill) — same content, single source — and request approval for promotions / living-spec diff / violation actions.

## SIEMPRE rules

- Radical honesty (Commandment I): never produce a retro with zero ❌ lessons unless genuinely zero friction occurred.
- NEVER auto-edit `spec.md` — living-spec deltas are proposals for human approval only.
- NEVER auto-apply promotions — produce candidates; user approves before any file is written.
- Cite concrete evidence per lesson, per promotion, per commandment violation. No abstract claims.
- Close lifecycle only after retro.md is reviewed; promotions may remain as carried action items.
- `anti-hallucination` before promoting: verify target path does not collide with existing file/skill/rule (Globs/Reads, not assumes).

## Adaptation intra-phase (Principio 2 — "no siempre más es más")

| Signal | Adaptation |
|---|---|
| `review.md.review_level: light` (trivial Phase 4 verdict) | Retro level light: Summary + 1-2 lessons + 0-1 promotion + skip Commandments audit + skip Living-spec section |
| `review.md.spec_drift: none` AND verdict APPROVED | Skip §Living-spec section entirely |
| Zero promotion candidates emerge honestly | Declare: "Zero promotions this cycle" + reasons; do not pad with synthetic candidates |
| Commandment violation flagged in Phase 4 critic | Mandatory Commandments forensics subsection in this retro |
| Feature with absorbed decisions (e.g., US3/US5/US6/US8) | Dedicated subsection per absorbed decision: what was decided, evidence-driven verdict, ratification status |
| 3+ consecutive retros without promotions | Smell — escalate: either the system is genuinely stable (rare) or the retro is not honest enough |

## Deep references (Read on demand)

| Topic | File | Contents |
|---|---|---|
| Auxiliary skills + edge cases + smells + anti-patterns | `references/01-auxiliaries-and-guards.md` | The auxiliary-skills invocation matrix with fallbacks, 6 edge cases, 6 smell signals, 6 anti-patterns, and post-implementation verification. Read when an edge/failure situation appears (BLOCKED verdict, missing spec.md, promotion collision) or before invoking conditional auxiliaries. |
| Embedded fallback template | `references/02-embedded-fallback.md` | The full retro.md 8-section template. Read ONLY if `.claude/plans/templates/retro.template.md` is missing (Step 2 fallback). |

## Commandments cubiertos

| # | Cómo |
|---|---|
| I | Honest about failures, friction, and commandment violations — no softening |
| II | Each promotion cites concrete evidence; anti-hallucination verifies paths exist |
| III | Promotions for genuinely reusable patterns only; no premature abstraction |
| IV | retro.md is the closure gate; lifecycle closes only after retro produced |
| V | Read ALL inputs (spec/tasks/tests/review/state) BEFORE producing retro |
| VIII | Promotion candidates that involve extensions go through `meta-create` for spec-compliant scaffolding |
| IX | Process audit + commandments audit feed self-improvement (the loop's whole purpose) |
| X | Promotions to global ~/.claude/ keep poneglyph healthy; never duplicate or contradict existing |

## Output format reminder

```
✅ Retro produced for {NNN}-{slug}.

- retro.md: .claude/plans/{NNN}-{slug}/retro.md
- retro_level: <light|standard|full> (<reason>)
- Lessons: <✅ count> + / <❌ count> −
- Process heaviest phase: <PhaseN> (<reason>)
- Promotion candidates: <N>
  - global: <list>
  - local: <list>
  - memory: <list>
- Spec drift action: <none | propose-diff | log-creep | log-skipped>
- Commandment status: <X/10 ✅, Y ⚠️, Z ❌>
- Action items: <N>
- drillme: covered 3/4 canonical Socratic categories

Pending your approval:
  ⏸️ Promotions to apply
  ⏸️ Living-spec diff (if any)
  ⏸️ Commandment violation actions

When approved → reply ratifying which subset to apply.
Feature lifecycle closure: <pending|done>.
```
