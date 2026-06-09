---
name: tdd-design
description: |
  Test/validation design BEFORE implementation (Phase 2.5 of the 5-phase workflow).
  Reads approved tasks/ (HUs) and produces ONE of two artefacts per HU based on
  the nature of its files: tests.md (TDD-mode) when the HU produces executable code,
  or validations.md (validation-mode) when the HU produces markdown/skills/docs/
  configs. Honors .claude/rules/test-policy.md to declare TDD-mode (forced/adaptive/
  optional). Closes with hard gate 2->3 alongside tasks/. Mixed HUs go to whichever
  mode fits per-HU.
  Use when: approved tasks/ ready and oracle design pending, "TDD", "tests",
  "test design", "specifica tests", "validations", "valida HU", "oracle design",
  after tech-plan closes Phase 2, before Phase 3 (build).
  Keywords - TDD, tests, test-design, specifica-tests, oracle, validations,
  validation-mode, red-green, property-based, phase-2.5, fase-2.5
disable-model-invocation: false
argument-hint: "[--tdd|--validation|--auto]"
effort: medium
---

# TDD-Design (Phase 2.5)

Produces the **oracle** that each HU must satisfy BEFORE the `build` skill (Phase 3) starts implementing. Dual-mode by HU nature: executable code → `tests.md` (TDD); markdown/docs/configs → `validations.md` (validation). The deliverable closes the hard gate 2->3 alongside `tasks/`.

## Underlying principle

> "Each planned function → its test, scaled by `.claude/rules/test-policy.md`." (Commandment IV — blocking quality gates)

Phase 2.5 exists because the gap between "we agreed on the plan" and "the code is correct" needs a verifiable bridge. For code, the bridge is executable tests (red→green). For non-code artefacts (skills, templates, docs, configs), the bridge is declarative validations (Pre/Post/Structural/Smoke/Cross). Forcing TDD onto markdown is ceremony (anti-pattern); forcing executable tests onto config files is ceremony too. The honest answer is dual-mode.

## When to use

| Trigger | Example |
|---|---|
| `tasks/` directory with approved HUs exists, no `tests.md`/`validations.md` yet | After `tech-plan` closes Phase 2 |
| User invokes `/tdd-design` explicitly | Direct invocation |
| `tech-plan` skill closes and triggers Phase 2.5 invocation (Step 13 of tech-plan) | Auto-chain from Phase 2 |

## When to skip

| Anti-trigger | Why |
|---|---|
| `tasks/` not yet approved (`status: draft`) | Phase 2 first |
| Mode `minimal` (trivial task — no `tasks/` directory created) | Phase 2.5 skipped in minimal mode |
| Bug fix with reproducible failing test already in repo | The existing failing test IS the oracle; no design needed |

## Output-mode decision (canonical per AC7/AC8)

For each HU in `tasks/`:

| HU `files` field contains... | Output mode | Artefact |
|---|---|---|
| Executable code (`.ts`/`.js`/`.py`/`.go`/`.rs`/...) | **TDD-mode** | `tests.md` with Pre/Action/Assert + red expectation |
| Markdown/skills/docs/configs (`.md`/`.json`/`.yaml`/`.toml`/templates) | **validation-mode** | `validations.md` with Pre/Post/Structural/Smoke/Cross |
| Mixed (some code, some markdown) | **Per-HU** | Produce both files; each HU goes to the file matching its nature |

**Anti-pattern blocked**: producing `tests.md` TDD for HUs that only change markdown is ceremony without an oracle. If the HU has no unit-testable logic, validation-mode is the honest choice. Conversely, producing `validations.md` validation for executable code under-uses the natural oracle (red→green).

CLI override: `--tdd` / `--validation` / `--auto` (default = auto-detect by `files` field).

## Workflow

### Step 1 — Read inputs

1. `Glob .claude/plans/*-*/tasks/index.md` — find active feature.
2. If multiple → pick most recent approved; ask user if ambiguous.
3. Read `tasks/index.md` (DAG + HUs summary).
4. Read each `tasks/US{N}.md` (frontmatter + `files` field + AC).
5. Read `.claude/rules/test-policy.md`. If absent → treat as `auxiliary` + warn user.
6. Read `.claude/plans/templates/tests.template.md` and `validations.template.md` (verify exist via Glob).

### Step 2 — Declare TDD-mode resolution

Output frontmatter of resulting `tests.md`/`validations.md` declares the resolved mode:

| `test-policy.md` value | `tdd_mode` in output | Per-node behavior |
|---|---|---|
| `business-critical` | `forced` | Every code HU MUST have test BEFORE impl (red→green) in Phase 3 |
| `mixed` | `adaptive` | Per-HU decision; declare rationale per HU |
| `auxiliary` OR absent | `optional` | Tests run post-impl as verification; TDD-first not enforced |

Honor per-HU overrides if `tasks/US{N}.md` carries `tdd: forced` (force test-first despite auxiliary) or `tdd-skip: <reason ≥10 chars>` (skip test-first despite business-critical). Concrete reason required for skip.

### Step 3 — Classify each HU by nature

For each HU read its `files` field + scan AC for hints of executable behavior:

- **TDD-mode HU**: files include `.ts`/`.js`/`.py`/etc. AND/OR AC describes input→output behavior verifiable in code.
- **validation-mode HU**: files are exclusively `.md`/`.json`/skills/templates AND/OR AC describes structural/content invariants.
- **Mixed-mode HU**: split into per-HU oracle (some HUs go to `tests.md`, others to `validations.md`).

Declare classification in output: per-HU one-liner like `US3: TDD-mode (creates 2 .ts files)` or `US7: validation-mode (modifies SKILL.md only)`.

### Step 4 — Generate oracle per HU

**TDD-mode HU** — produce in `tests.md`:

```markdown
## US{N} — tests

### T{N}.1 — <happy path title>
- **Type**: unit | integration | property-based
- **Pre-condition**: <state before>
- **Action**: `<concrete call: function/endpoint/command>`
- **Assert**: <expected outcome — value, state, effect>
- **Must fail before impl (red)**: <error/assertion expected in red state>

### T{N}.2 — <edge case title>
- **Type**: ...
- **Pre-condition**: ...
- **Action**: ...
- **Assert**: ...
- **Must fail before impl (red)**: ...
```

Each TDD-mode HU receives ≥1 happy path + ≥1 edge case. If HU has invariants (parsers, pure transforms), suggest property-based opt-in (T{N}.3 with `invariant` + `generator`) — evidence +23-37% effectiveness over plain TDD (arxiv 2506.18315).

**validation-mode HU** — produce in `validations.md`:

```markdown
## US{N} — <title>

### Pre
- <what must exist before starting the HU>

### Post
- <what must exist/be true after closing the HU>

### Structural assertions
- <section/field obligatory in the produced artefact>
- <frontmatter field present and valid>

### Smoke
- <executable verification: Glob, Grep, Read, manual invocation>

### Cross-validations
- <cross-reference between files coherent; nothing orphan>
```

Each validation-mode HU receives the 5 categories (Pre-conditions, Post-conditions, Structural assertions, Smoke checks, Cross-validations). Skip a category honestly if N/A ("Pre: none — this is the first HU in W1").

### Step 5 — Handle non-testable HUs (AC4)

If a HU genuinely has no oracle (e.g., pure layout change, formatting):

- Declare explicitly in the output: `US{N}: untestable — <concrete reason>`.
- Propose `tdd-skip: <reason ≥10 chars>` on the `tasks/US{N}.md` (the Lead applies the patch).
- If untestable rate >30% → smell signal — Phase 2 decomposition is wrong; STOP and report.

### Step 6 — Drillme Phase 2.5

Run the 3 phase-specific questions before closing:

```markdown
## Drillme — Phase 2.5

1. `[failure]` **Happy + edge?** Each HU has ≥1 happy path + ≥1 edge case test (or 5 validation categories)?
2. `[approach]` **Untestable HU?** If any HU has no natural oracle → is the HU well-defined or atomic?
3. `[approach]` **Property-based fit?** Does any HU have invariants (parsers, pure transforms) that property-based would cover better than examples?
```

Coverage: 2/4 canonical Socratic categories. Acceptable — Phase 2.5 is focused on oracle design, not architecture; `[location]` and `[context]` were covered by `tech-plan` in Phase 2. NOT adding artificial questions to pad coverage (Commandment III).

> Skill-to-skill invocation is probabilistic. If `drillme` does not auto-fire, the Lead invokes `/drillme "Phase 2.5 oracle design for <NNN-slug>"` manually before approving hard gate 2->3.

### Step 7 — Produce artefacts

- If any HU is TDD-mode → write `.claude/plans/{NNN}-{slug}/tests.md` from `templates/tests.template.md`.
- If any HU is validation-mode → write `.claude/plans/{NNN}-{slug}/validations.md` from `templates/validations.template.md`.
- Mixed feature → both files coexist; each HU appears in exactly one of them.

Frontmatter of `tests.md`: `spec`, `tasks`, `phase: 2.5`, `test_mode: tdd`, `tdd_policy: <forced|adaptive|optional>`.
Frontmatter of `validations.md`: `spec`, `tasks`, `phase: 2.5`, `validation_mode: validation`, `test_policy: <project policy>`.

Anti-hallucination (auxiliary `anti-hallucination`): every function/module/path referenced in a test or validation must exist or be planned to exist in the corresponding HU's `files` field. Never invent references.

### Step 8 — Report and request approval

Output to user:

1. Paths: `tests.md` and/or `validations.md` produced.
2. Resumen: "Phase 2.5 closed. TDD-mode: X HUs. Validation-mode: Y HUs. Untestable: Z HUs (skip-justified)."
3. Anti-pattern alerts surfaced (>30% untestable, tests duplicate AC verbatim without adding oracle, etc.).
4. Explicit prompt: "Hard gate 2->3 — necesito tu aprobación de tasks/ + tests.md/validations.md antes de Phase 3 (build)."

The skill does NOT proceed to Phase 3.

## SIEMPRE rules

- Honest classification per HU (TDD vs validation) by `files` field; never default to TDD when files are markdown.
- Honest "untestable" declaration for HUs without natural oracle; never invent synthetic tests.
- Honor `.claude/rules/test-policy.md` for TDD-mode declaration; warn if absent.
- Mention non-atomic HUs as smell signals (>30% untestable → reopen Phase 2).

## Auxiliary skills invoked

> Canonical matrix in `.claude/plans/001-poneglyph-5phase-workflow/tasks/index.md §Auxiliary skills matrix`. Row below is the literal subset that applies to this Phase 2.5 skill.

| Auxiliary skill | When this skill invokes it | Fallback if skill->skill fails |
|---|---|---|
| `anti-hallucination` | Before referencing any function/module/path in a test or validation — must exist or be in the HU's planned `files` | Lead applies Glob/Grep/LSP manually before the test/validation is finalized |
| `drillme` | Before closing Phase 2.5 — applies 3 phase-specific questions + canonical Socratic catalog | Lead invokes `/drillme "Phase 2.5 oracle design for <NNN-slug>"` manually before approving hard gate 2->3 |

> Skill-to-skill invocation is **probabilistic** per docs Anthropic + [issue #59968](https://github.com/anthropics/claude-code/issues/59968). Phase 2.5 is the most focused phase — only 2 auxiliaries truly apply. Other auxiliaries (e.g., `decision-stress-test`) belong to other phases and would be ceremony here.

## Adaptation intra-phase (Principio 2 — "no siempre más es más")

| Signal | Adaptation |
|---|---|
| `test-policy.md` = `auxiliary` AND mode minimal | `tests.md` with only happy path per HU; skip edge/property-based; declare reduced honestly |
| HUs with many invariants (parsers, pure transforms) | Property-based opt-in for those HUs; declare invariant + generator explicitly |
| HUs are 100% docs/skills/configs | Skip `tests.md` entirely — only produce `validations.md` |
| HUs are 100% executable code | Skip `validations.md` — only produce `tests.md` |
| All HUs untestable (>50% rate) | STOP, escalate to user — Phase 2 decomposition is wrong; reopen Phase 2 |

Declare adaptation in output frontmatter notes: "Mode auxiliary minimal — happy path only; reason: trivial task per spec.md".

## Casos edge

- **Edge 1** — HU has `tdd-skip: <reason>` in `tasks/US{N}.md`: respect the skip; do not generate test for that HU. Declare in output: `US{N}: skip-justified — <reason from HU>`.
- **Edge 2** — `.claude/rules/test-policy.md` absent: treat as `auxiliary` by default + warn user once in the output ("test-policy.md not found — defaulting to auxiliary").
- **Edge 3** — HU referenced in `tests.md` doesn't exist in `tasks/`: smell — abort and escalate.
- **Edge 4** — Two HUs in mixed feature have identical test logic: factor into shared setup; do not duplicate.
- **Edge 5** — HU `files` field empty: smell — ask user; do not assume.

## Smell signals

- ⚠️ >30% HUs marked untestable → Phase 2 decomposition wrong; reopen Phase 2.
- ⚠️ Tests duplicate AC `tasks/US{N}.md` verbatim without adding executable oracle → tests decorativos; refactor or skip.
- ⚠️ Property-based suggested for >50% HUs → over-engineering unless feature genuinely is parser/transform-heavy.
- ⚠️ All HUs default to TDD-mode despite many being doc/config → classification missed validation-mode; review Step 3.
- ⚠️ `tests.md` has T{N}.X items but no "Must fail before impl (red)" annotation → not TDD; it's post-hoc tests.

## Anti-patterns

| Anti-pattern | Detection | Correction |
|---|---|---|
| TDD on markdown | `tests.md` has tests for an HU whose `files` are only `.md`/skills/templates | Move to `validations.md`; remove ceremony |
| Red without failure reason | `Must fail before impl (red)` says "test will fail" without specific error | Specify: "TypeError: X is undefined at line Y" or "assertion: expected N, got M" |
| Synthetic oracle | Test invented that doesn't trace to any AC | Every test must trace to an AC; if not, remove |
| Skip without reason | `tdd-skip` on HU without ≥10 char concrete reason | Reject; ask user for concrete reason or remove skip |
| Coverage padding | Adding T{N}.3 property-based for an HU with no real invariants | Honest 2/2 tests > artificial 3/2 |

## Commandments cubiertos

| # | Cómo |
|---|---|
| II | Tests/validations are verifiable executables (or Grep-checkable assertions) |
| III | Honest classification — no TDD ceremony on docs; no validation ceremony on code |
| IV | TDD tests must fail before impl (red→green); validations must pass for HU to close — blocking gates |
| VIII | Structured oracle templates (tests.template/validations.template); per-HU classification with rationale |

## Verification (post-implementation of this skill)

- Smoke: invoke `/tdd-design` with an active `tasks/` directory → produces `tests.md` and/or `validations.md` per HU classification.
- Verify `tests.md` frontmatter declares `tdd_policy` matching `test-policy.md`.
- Verify `validations.md` frontmatter declares `test_policy` matching `test-policy.md`.
- Each TDD-mode HU has ≥1 T{N}.X with "Must fail before impl (red)" annotation.
- Each validation-mode HU has the 5 categories (or honest skips with reason).
- `bun test ./.claude/hooks/` sigue green (this skill is markdown — no test impact).

## Output format reminder

When this skill closes Phase 2.5:

```
Phase 2.5 closed for {NNN}-{slug}:
- TDD-mode HUs: <list of US{N}> → tests.md
- validation-mode HUs: <list of US{N}> → validations.md
- untestable (skip-justified): <list of US{N} with reasons>
- tdd_policy / test_policy: <forced|adaptive|optional>
- artefacts: .claude/plans/{NNN}-{slug}/{tests.md, validations.md}
- drillme: covered 2/4 canonical Socratic categories (focused phase)

⏸️ Hard gate 2->3 — pendiente tu aprobación de tasks/ + tests.md/validations.md
   antes de Phase 3 (build). Responde: APPROVE | REFINE | BLOCK.
```
