---
name: critic
description: |
  End-to-end review after all HUs completed (Phase 4 of the 5-phase workflow).
  Validates the original problem from spec.md was actually solved (not just unit
  tests passing per HU). Produces review.md with 5-section checklist
  (Correctness/Quality/Security/Performance/Maintainability) + findings tagged
  with severity (BLOCKER/MAJOR/MINOR/NIT) + verdict (APPROVED /
  APPROVED_WITH_WARNINGS / NEEDS_CHANGES / BLOCKED). Invokes the
  `review-patterns` skill catalog (quality or performance mode per content),
  escalates to a ≥4-perspective independent review PANEL (Workflow, opt-in) when
  complejidad >60 OR critical areas (auth/payments/security/data/secrets), and
  triggers `security-review` for auth/payments/credentials. Detects spec-drift
  for the living-spec loop (Phase 5).
  Use when: feature complete, all HUs closed in state.json, review needed before
  retro, after /build closes Phase 3, "revisa", "critica", "valida", "review",
  "audita", "verdict", "approve".
  Keywords - critic, phase-4-review, valida, revisa, audita, e2e, happy-path, quality,
  regression, security, performance, verdict, blocker, finding, fase-4, phase-4
disable-model-invocation: false
argument-hint: "[--light|--standard|--full]"
effort: high
---

# Critic (Phase 4)

Validates **end-to-end** that the spec.md problem was solved — not just that each HU's tests pass. Produces `review.md` with a 5-section checklist + findings with severity + verdict. The gate before retro (Phase 5).

## Underlying principle

> "Tests passing per HU prove the parts; the critic proves the whole." (Commandment IV — blocking gates; Commandment IX — observability and self-improvement)

Phase 3 closes HUs atomically — each HU red→green or validation-closed. Phase 4 asks the question Phase 3 cannot: **does the assembled set of HUs solve the original problem in spec.md, including the happy path the user actually walks?** Unit tests can all pass and the feature still be broken at the seams. The critic is the seam-checker.

## When to use

| Trigger | Example |
|---|---|
| All HUs in `state.json.us_pending` are now in `state.json.us_completed` | After `/build` closes the last HU |
| User invokes `/critic` explicitly | Direct invocation |
| `build` skill closes Phase 3 and triggers Phase 4 invocation | Auto-chain from Phase 3 |

## When to skip

| Anti-trigger | Why |
|---|---|
| HUs still pending in `state.json` | Phase 3 first — incomplete reviews waste effort |
| `tests.md`/`validations.md` not approved | Phase 2.5 first — no oracle to validate against |
| Trivial mode (no `tasks/` directory) | Direct review by Lead — Phase 4 ceremony adds nothing |
| Bug fix in non-poneglyph repo with no spec | Use `/critic` informally; skip the spec.md correctness check |

## Workflow

### Step 1 — Read inputs

In parallel:

1. `Glob .claude/plans/*-*/spec.md` — find active feature with status `approved`.
2. Read `spec.md` (problem statement + acceptance criteria + out-of-scope).
3. Read `tasks/index.md` + all `tasks/US{N}.md`.
4. Read `tests.md` and/or `validations.md`.
5. Read `state.json` — confirm `current_phase: 3` complete + all `us_pending == []`.
6. Read `.claude/plans/templates/review.template.md` (the output template).
7. Read `.claude/rules/test-policy.md` (coverage policy).
8. `Bash git diff origin/main..HEAD --stat` — branch delta scope.

### Step 2 — Confirm prerequisites

| Check | Action if fails |
|---|---|
| All HUs in `state.json.us_completed` | STOP — escalate to user; do not generate review.md prematurely |
| Tests pass on the assembled branch (`bun test ./.claude/hooks/` or project equivalent) | Continue but mark `Correctness` section RED in review.md |
| spec.md still describes what was delivered | Continue + flag spec-drift for living-spec loop (Step 8) |
| `review.template.md` exists | If missing → use the embedded checklist (see §Embedded fallback) |

### Step 3 — Determine review level (adaptation)

| Signal | Level | Scope |
|---|---|---|
| Feature trivial (1-2 HUs, no security/perf concern, mode minimal) | **light** | Base checks (tests + typecheck) + drillme Q1 only; skip review panel + review-patterns + security-review |
| Feature standard (3-N HUs, no critical area) | **standard** | Full 5-section checklist; review-patterns quality mode; drillme 4/4 |
| Feature architectural / touches auth/payments/secrets / complexity >60 | **full** | Standard + independent review PANEL (≥4 perspectives, Workflow opt-in) + security-review skill + review-patterns both modes (quality + performance) |

CLI override: `/critic --light` / `--standard` / `--full`. Default = auto-detect from `spec.md.mode` + scanned content.

Declare the chosen level in `review.md` frontmatter (`review_level: <light|standard|full>` + reason).

### Step 4 — Execute base checks (parallel)

In a single message (Recipe 1 — Bash batch):

```
Bash(<project test cmd>) + Bash(<project typecheck cmd>) + Bash(<project lint cmd>) + Bash(git diff --stat origin/main..HEAD)
```

Capture exit codes + output. Each becomes a row in the `Correctness` and `Quality` sections of review.md.

### Step 5 — Apply 5-section checklist

For each section, populate `review.md` with findings (file:line + severity + recommendation):

#### Correctness

- Does the spec.md problem statement match what was delivered? (Read spec.md happy path → trace through code.)
- Each AC in spec.md → trace to a closed HU in `tasks/`.
- Tests pass on the assembled branch (Step 4 output).
- Happy path E2E: simulate the user's actual flow — manual walkthrough or smoke test.
- Known edge cases from `tests.md`/`validations.md` — are they covered?

#### Quality

- Test coverage respects `.claude/rules/test-policy.md` (auxiliary OK with minimal; business-critical requires forced TDD evidence).
- Code style matches surrounding files (sample 2-3 random touched files; Grep for style anchors).
- No introduced duplication (Glob/Grep for the new symbols' patterns elsewhere).
- No over-engineering (compare diff scope vs AC declared scope per HU).

#### Security

- No hardcoded secrets in diff (`Grep "password|secret|api_key|token" <changed-files>`).
- Inputs validated at boundaries (auth, payments, user-facing endpoints).
- No introduced OWASP Top 10 vectors (injection / XSS / IDOR / SSRF / etc.).
- If touches `auth`/`payments`/`secrets`/`credentials` → invoke `security-review` skill (mandatory dispatch — auxiliary may fire, Lead also dispatches).

#### Performance

- No O(n²) loops introduced where O(n) is reachable.
- No I/O inside loops (DB calls in loops = N+1 candidate).
- Parallelism opportunities flagged (independent async ops should batch).
- Memory: any large array/buffer that should stream instead?

#### Maintainability

- Comments only where "why" is non-obvious (Cmd III — no decorative comments).
- No TODOs without an issue link (`Grep "TODO|FIXME" <changed-files>`).
- New abstractions justified by ≥2 callers (avoid premature abstraction).
- Naming consistent with project (Drillme intra-HU should have caught this; verify here).

### Step 6 — Invoke `review-patterns` skill catalog (AC8)

Per content of the diff:

| Diff signal | Mode to invoke | Path to Read |
|---|---|---|
| Refactoring / SOLID / DRY concerns / complexity | **quality mode** | `.claude/skills/review-patterns/references/01-mode-quality.md` + subdirs in `quality/` |
| Loops with I/O / async / memory / hot paths | **performance mode** | `.claude/skills/review-patterns/references/02-mode-performance.md` + subdirs in `performance/` |
| Both | both | both reference files |

Apply the catalog's specific checks (cyclomatic complexity / N+1 patterns / leak patterns / extract function opportunities). Findings from the catalog go into the corresponding section of review.md.

**AC8 ratification**: `review-patterns` is KEPT (17+ unique refs not duplicated here). The skill is the catalog; this skill is the orchestrator.

### Step 7 — Conditional invocations (level=full)

**Independent review PANEL (≥4 perspectives) — replaces the former single `reviewer` agent**:

Trigger when ANY:
- Feature complexity >60 declared in `tasks/index.md` or `spec.md`.
- Critical area touched: `auth/`, `payments/`, `secrets/`, `credentials/`, `crypto/`, `session/`, database migrations.
- `--full` CLI flag.
- The critic is reviewing work the **same session produced** (author≠evaluator bias — the lesson behind the panel; see `independent-reviewer-when-self-assessing` memory).

**How**: per the spawn decision tree (1 agent is forbidden), an independent review runs as a **panel of ≥4 fresh perspectives via `Workflow`** (user opt-in), each a distinct lens — e.g. `correctness`, `security`, `performance`, `maintainability` — prompted read-only ("review, do not edit; load `review-patterns`/`security-review`"). The panel's verdicts are aggregated (majority on architectural/security concerns). This gives MORE independence than one reviewer, without spawning a single agent. Canonical panel prompt + wiring: `orchestrator-protocol/references/04-agent-selection.md` §Workflow wiring.

> If the user does not opt into a Workflow, the critic performs the deeper review **inline** and declares residual author-bias honestly in `review.md` (same model family) — never silently skips the independence concern.

**`security-review` skill**:

Invoke when diff touches: `auth/`, `payments/`, `secrets/`, `credentials/`, `*.env*`, `crypto/`, `session/`, `cookie/`, JWT-related code. Mandatory dispatch even if auto-fire fires — security is a gate not advisory (Cmd VI).

**`diagnostic-patterns` skill**:

Invoke if Step 4 base checks failed → root-cause analysis (5-whys, stack trace, retry budget per `error-recovery.md`).

### Step 8 — Detect spec-drift (AC6 — living-spec loop)

Compare spec.md against delivered:

| Detection | Action |
|---|---|
| Delivered exactly matches spec.md | No drift; living-spec loop NOT triggered |
| Delivered diverges in ways that look intentional and reasonable | Mark `spec_drift: legitimate` in review.md + propose `spec.md` patch for retro (Phase 5) to ratify |
| Delivered diverges in ways that look like scope creep or skipped AC | Mark `spec_drift: scope_creep` or `spec_drift: skipped_ac` → verdict NEEDS_CHANGES; do not auto-update spec.md |
| spec.md was edited mid-implementation (timestamp post-approval) | Flag — verify against latest approved version; mention in review.md |

The decision to update spec.md is deferred to Phase 5 (retro) — critic only flags the delta + classifies.

### Step 9 — Drillme Phase 4

Before producing the verdict:

```markdown
## Drillme — Phase 4

1. `[context]` **Spec drift?** Does the spec.md still describe what was delivered? If not, classify (legitimate / scope_creep / skipped_ac).
2. `[failure]` **E2E happy path?** Does the full happy path work, not just modules? Trace by hand.
3. `[failure]` **Edge case the user will hit?** Is there an edge case we did not test that real usage will surface?
4. `[approach]` **Coverage matches policy?** Does test coverage match what `test-policy.md` expects (forced/adaptive/optional)?
```

Coverage: 3/4 canonical Socratic categories (`[location]` covered upstream — code locations were nailed in Phase 2/3). Honest — Phase 4 focuses on E2E + drift + coverage.

> Skill-to-skill invocation is **probabilistic**. If `drillme` does not auto-fire, the Lead invokes `/drillme "Phase 4 review of <NNN-slug>"` manually before declaring the verdict.

### Step 10 — Generate `review.md`

Write `.claude/plans/{NNN}-{slug}/review.md` from `templates/review.template.md`. Frontmatter:

```yaml
---
spec: {NNN}-{slug}
phase: 4
review_level: <light|standard|full>
verdict: <APPROVED | APPROVED_WITH_WARNINGS | NEEDS_CHANGES | BLOCKED>
spec_drift: <none | legitimate | scope_creep | skipped_ac>
findings_count:
  blocker: N
  major: N
  minor: N
  nit: N
review_panel_invoked: <yes (N perspectives) | no (inline) | n/a>
security_review_invoked: <yes|no>
review_patterns_modes: [<quality?>, <performance?>]
created: YYYY-MM-DD
---
```

Body: 5 sections (Correctness / Quality / Security / Performance / Maintainability) + Findings list + Verdict justification + Spec-drift section if applicable.

### Step 11 — Verdict + report

| Verdict | When | Next |
|---|---|---|
| **APPROVED** | All sections green, 0 BLOCKER, 0 MAJOR | `state.json.current_phase: 5` → propose `/retro` |
| **APPROVED_WITH_WARNINGS** | 0 BLOCKER, ≤2 MAJOR, no security issue | Continue to retro; MAJORs noted for retro consideration |
| **NEEDS_CHANGES** | ≥1 MAJOR or coverage < policy | Specific HU(s) to reopen in Phase 3 + diagnosis attached |
| **BLOCKED** | ≥1 BLOCKER (security vuln / data loss / breaking change without migration / hardcoded secret / fundamental design flaw) | STOP — escalate; do not propose retro |

Report:

```
{✅|⚠️|❌|🚫} Critic verdict: <VERDICT>
- review.md: .claude/plans/{NNN}-{slug}/review.md
- review_level: <light|standard|full>
- Findings: <blocker>/<major>/<minor>/<nit>
- spec_drift: <none|legitimate|scope_creep|skipped_ac>
- review panel invoked: <yes (N perspectives) | no (inline)>
- security-review invoked: <yes|no>

Next:
  → /retro (if APPROVED or APPROVED_WITH_WARNINGS)
  → /build US{N} (if NEEDS_CHANGES with specific HUs)
  → STOP — escalate (if BLOCKED)
```

## Independent review model: panel ≥4 (reviewer agent CUT — feature 008)

| Era | Decision |
|---|---|
| Original (feature 001, AC7) | `reviewer` agent (Opus, read-only) KEEP-conditional — 1 agent invoked for complexity >60 OR critical area |
| **Now (feature 008)** | **`reviewer` agent CUT.** 1 agent is forbidden (spawn decision tree P1). Robust independent review = a **panel of ≥4 fresh perspectives** (Workflow, opt-in), which gives MORE independence than one Opus reviewer (diverse lenses, majority aggregation). When no Workflow opt-in → critic reviews inline + declares residual author-bias honestly. |

**Effect**: `.claude/agents/reviewer.md` deleted; `agent-memory/reviewer/MEMORY.md` archived under `plans/008-agent-spawn-policy/archive/`. The independence lesson (author≠evaluator, feature 002) is preserved via the panel pattern — see `independent-reviewer-when-self-assessing` memory + `orchestrator-protocol/references/04-agent-selection.md` §Workflow wiring.

## AC8 decision: `review-patterns` skill — KEEP

| Aporte único | Cubierto por `critic`? |
|---|---|
| SOLID violations detail (5 principios) | NO — critic checklist is generic |
| Complexity metrics (cyclomatic/cognitive) | NO |
| Anti-patterns catalog | NO |
| Extract function/class patterns | NO |
| N+1 query patterns + variants | NO |
| Memory leak patterns | NO |
| Refactoring safety checklists | NO |

**Verdict**: KEEP `review-patterns`. `critic` invokes it as catalog via `Read .claude/skills/review-patterns/references/<mode>.md` during Step 6. Zero content duplication.

## Auxiliary skills invoked

> Canonical matrix in `.claude/plans/001-poneglyph-5phase-workflow/tasks/index.md §Auxiliary skills matrix`. Row below is the literal subset that applies to this Phase 4 skill.

| Auxiliary skill | When this skill invokes it | Fallback if skill->skill fails |
|---|---|---|
| `anti-hallucination` | Before reporting any finding — verify file/line/symbol actually exists in the diff (no invented findings) | Lead Reads/Greps the file before the finding is finalized |
| `drillme` | Before declaring verdict (Step 9 — 4 questions across `[context]`/`[failure]`/`[approach]`) | Lead invokes `/drillme "Phase 4 review of <NNN-slug>"` manually before verdict |
| `diagnostic-patterns` | When Step 4 base checks fail — 5-whys, stack-trace analysis, retry budget per error-recovery.md | Lead reads error output manually + applies retry policy |
| `lsp-operations` | During Step 5 Correctness/Quality — `findReferences`/`callHierarchy` to verify blast radius of changed symbols | Lead uses Grep + Read manually as fallback |
| `review-patterns` | Step 6 — MANDATORY catalog invocation in standard/full levels (quality or performance mode per diff content) | Lead Reads `references/01-mode-quality.md` or `02-mode-performance.md` manually |
| `security-review` | Step 7 — MANDATORY dispatch when diff touches auth/payments/secrets/credentials/crypto (gate, not advisory; Cmd VI) | Lead invokes `/security-review` manually before declaring verdict if auto-fire missed |
| `decision-stress-test` | ⚠️ Conditional — if Step 5 reveals an architectural decision that merits adversarial challenge (e.g., questionable abstraction or library choice) | Lead invokes `/decision-stress-test` manually if doubt warrants it |
| `explain-changes` | ⚠️ Conditional — if a human needs a walkthrough of the diff for context | Lead invokes `/explain-changes` manually if requested |
| `simplify` | ⚠️ Conditional — refactor opportunity surfaced but not mandatory | Lead may invoke `/simplify` post-review if findings warrant |

> Skill-to-skill invocation is **probabilistic** per docs Anthropic + [issue #59968](https://github.com/anthropics/claude-code/issues/59968). Critical auxiliaries in Phase 4 are `review-patterns` (catalog) and `security-review` (gate — MANDATORY DISPATCH even if auto-fire succeeded). Other auxiliaries are best-effort; the fallback column documents manual recovery.

## SIEMPRE rules

- Honest findings — no softening (Commandment I). If a BLOCKER exists, the verdict is BLOCKED, no exceptions.
- Trace each spec.md AC to a closed HU; flag any AC without a corresponding closed HU as a Correctness finding.
- `security-review` mandatory dispatch when critical area touched — gate, not advisory.
- Tests pass on the assembled branch BEFORE declaring APPROVED (Cmd IV).
- Spec-drift is flagged + classified, never silently absorbed (Cmd IX — observability).
- Findings cite `file:line` exactly; no vague "somewhere in the auth module".
- Independent review = panel ≥4 (Workflow) or inline-with-declared-bias — never a single spawned reviewer (P1).

## Adaptation intra-phase (Principio 2 — "no siempre más es más")

| Signal | Adaptation |
|---|---|
| Mode `light` (trivial feature, 1-2 HUs, no security/perf) | Base checks + drillme Q1 only; skip review panel + review-patterns + security-review |
| Mode `standard` (default, 3-N HUs, no critical area) | Full 5-section + review-patterns quality + drillme 4/4 |
| Mode `full` (architectural / auth / payments / complexity >60) | Standard + review panel ≥4 (Workflow opt-in) + security-review + review-patterns both modes |
| Doc-only feature (markdown changes, no code) | Quality + Maintainability sections only; skip Performance + Security; drillme Q1 |
| Bug fix with reproducible test | Correctness section + drillme Q3 (edge case); skip Performance unless bug was performance-related |

Declare adaptation in `review.md` frontmatter (`review_level` + reason).

## Casos edge

- **Edge 1** — HUs marcadas `completed` pero tests fallan en la rama ensamblada → STOP; escalate; do not generate review.md as APPROVED.
- **Edge 2** — `spec.md` editada después de approved (timestamp post-approval) → revisar contra la versión actual + flag in review.md; the Phase 5 retro decides whether the edit is ratified.
- **Edge 3** — `review-patterns` no existe (cortada por error) → fallback al checklist embebido + flag in Issues; this should never happen (AC8 KEEP).
- **Edge 4** — Review panel (Workflow) not opted into by the user on a full-level review → critic reviews inline + declares residual author-bias in `review.md.review_panel_invoked: no (inline)`; do not block the verdict on Workflow availability.
- **Edge 5** — Panel perspectives return conflicting verdicts → majority wins on architectural/security concerns; critic's inline judgment wins on operational/test concerns; if irreconcilable → escalate to user.
- **Edge 6** — Diff is empty (no commits since spec approved) → STOP; ask if Phase 3 was actually executed.

## Smell signals

- ⚠️ Verdict always APPROVED with zero findings → review theater; the skill is missing rigor. Inspect Step 5 checklist application.
- ⚠️ NEEDS_CHANGES on >3 consecutive critic runs of the same feature → spec.md or HUs are poorly defined; reopen Phase 1/2.
- ⚠️ Findings cite line numbers that don't exist in the file → anti-hallucination skipped; redo with verification.
- ⚠️ `spec_drift: legitimate` proposed in >50% of reviews → planning is not capturing emergent requirements; review the planning process in Phase 5.
- ⚠️ Review panel invoked on every feature regardless of complexity → KEEP-conditional criterion ignored; cost-blind. Restrict to genuine complexity >60 OR critical area OR author≠evaluator concern.

## Anti-patterns

| Anti-pattern | Detection | Correction |
|---|---|---|
| Vague findings | Finding without `file:line` reference | Reject; re-locate the issue precisely |
| Severity inflation | All findings tagged BLOCKER | Re-classify by Cmd IV blocking criteria; BLOCKER = data loss/security/breaking change/hardcoded secret/fundamental design flaw |
| Spec drift silently absorbed | `review.md` doesn't mention spec.md delta despite diff diverging | Add Spec-drift section with classification |
| Skipping security on auth code | Diff touches auth but `security-review` not invoked | Re-run with security-review dispatched (mandatory gate) |
| Review panel invoked for trivial features | `review_panel_invoked: yes` on light review | Reset to no; criterion is "complejidad >60 OR critical area OR author-bias", not "every feature" |
| Verdict APPROVED with failing tests | base checks (Step 4) red but verdict green | Re-verdict to NEEDS_CHANGES at minimum; tests-passing is a precondition |

## Embedded fallback (if `review.template.md` missing)

```markdown
# Review — {feature-name}

## Frontmatter
spec / phase / review_level / verdict / spec_drift / findings_count / created

## 1. Correctness
- [ ] spec.md problem solved E2E
- [ ] Each AC mapped to a closed HU
- [ ] Tests pass on assembled branch
- [ ] Happy path manual walkthrough OK
- [ ] Known edge cases covered

## 2. Quality
- [ ] Coverage respects test-policy.md
- [ ] Style matches project
- [ ] No introduced duplication
- [ ] No over-engineering per AC

## 3. Security
- [ ] No hardcoded secrets
- [ ] Inputs validated at boundaries
- [ ] No OWASP Top 10 vectors introduced
- [ ] security-review invoked if critical area

## 4. Performance
- [ ] No O(n²) where O(n) reachable
- [ ] No I/O in loops (N+1)
- [ ] Parallelism opportunities flagged
- [ ] Memory profile reasonable

## 5. Maintainability
- [ ] Comments only where "why" is non-obvious
- [ ] No TODOs without issue link
- [ ] New abstractions justified
- [ ] Naming consistent

## Findings
| ID | Severity | File:line | Section | Recommendation |
|---|---|---|---|---|

## Verdict
<APPROVED | APPROVED_WITH_WARNINGS | NEEDS_CHANGES | BLOCKED>

## Spec-drift
<none | legitimate | scope_creep | skipped_ac> + description
```

## Commandments cubiertos

| # | Cómo |
|---|---|
| I | Honest findings sin softening; BLOCKED if BLOCKER exists; residual author-bias declared when no panel |
| II | `anti-hallucination` before every finding — no invented file:line |
| III | Severity inflation anti-pattern blocked; simple by default |
| IV | APPROVED only if tests pass on assembled branch (blocking gate) |
| V | Read spec.md + tasks/ + tests/validations BEFORE producing review.md |
| VI | `security-review` mandatory dispatch on auth/payments/secrets — gate, not advisory |
| VII | Base checks executed in parallel (Step 4); independent review = panel ≥4 (P1/P3) not a single spawn |
| VIII | Panel prompts include AC trace + skills + read-only role (Arch H) |
| IX | Spec-drift detection + classification feeds living-spec loop in Phase 5 (observability) |

## Verification (post-implementation of this skill)

- Smoke: invoke `/critic` on a feature with all HUs closed → produces `review.md` with 5 sections + verdict.
- Verify `review.md` frontmatter declares `review_level` + reason.
- Verify findings cite `file:line` (no vague references).
- Verify `review_panel_invoked` flag matches the level + complexity decision.
- `bun test ./.claude/hooks/` → green (this skill is markdown — no hook test impact).

## Output format reminder

When this skill closes a review:

```
{✅|⚠️|❌|🚫} Critic verdict for {NNN}-{slug}: <VERDICT>
- review.md: .claude/plans/{NNN}-{slug}/review.md
- review_level: <light|standard|full> (<reason>)
- Findings: blocker=N major=N minor=N nit=N
- spec_drift: <none|legitimate|scope_creep|skipped_ac>
- review panel (≥4 perspectives): <invoked (N) | inline | skipped> (<reason>)
- review-patterns modes: [<quality?>, <performance?>]
- security-review: <invoked|skipped|n/a>
- drillme: covered 3/4 canonical Socratic categories

Next:
  → /retro    (APPROVED / APPROVED_WITH_WARNINGS)
  → /build US{N}  (NEEDS_CHANGES with specific HU)
  → STOP — escalate to user (BLOCKED)
```
