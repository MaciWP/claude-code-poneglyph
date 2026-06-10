---
spec: 019-quality-gates
tasks: tasks/index.md
phase: 2.5
validation_mode: validation
test_policy: auxiliary
---

# Validations — 019-quality-gates

Validation-mode HUs: US1, US2, US4, US5 (markdown/config artefacts). US3 → `tests.md`.

## US1 — Critic redesign

### Pre
- `.claude/skills/critic/SKILL.md` + `references/01-decisions-and-auxiliaries.md` exist with the current panel-default model.
- 018 evidence files readable: `decision-memo-W1.md` (D1/D3), `decision-memo-W2.md` (D1).

### Post
- Step 7 describes ONE fresh-context read-only reviewer (correctness/requirements only) as the standard/full default; panel appears only as decision-review pointer (decision-stress-test).
- Verdict table unchanged: APPROVED / APPROVED_WITH_WARNINGS / NEEDS_CHANGES / BLOCKED.

### Structural assertions
- Frontmatter field `fresh_reviewer_invoked` replaces `review_panel_invoked` in the review.md frontmatter spec (and in `templates/review.template.md` if it carries the field — check at build).
- Every removed/retained mechanism carries an inline evidence citation (W1 D1/D3 or W2 D1).
- Description block updated (no "≥4-perspective panel" as code-review escalation); "Use when" + "Keywords" intact.

### Smoke
- `grep -rn "panel" .claude/skills/critic/` → hits only in decision-history/demotion context.
- `grep -n "fresh" .claude/skills/critic/SKILL.md` → reviewer present in Step 7 + output format.
- `bun test ./.claude/hooks/` green.

### Cross-validations
- `/flow` Phase 4 verdict handling (flow.md table) still matches critic's verdict values verbatim.
- `references/01` decision history row for 019 cites the gate-entry ratification date (2026-06-10).

## US2 — Ecosystem doctrine update

### Pre
- US1 closed — critic wording is canonical.
- Grep inventory: orchestrator-protocol SKILL.md (4 sites), references/04 (3 sites), flow.md, system-inventory.md (2 sites).

### Post
- All 4 files describe: code review = checks + ONE fresh reviewer; panel ≥4 = decisions/research only; P1 carries the fresh-reviewer exception with citation.

### Structural assertions
- orchestrator-protocol P1/P4 wording includes the exception clause.
- flow.md full-mode adaptation row no longer says "independent review panel (≥4 via Workflow)" for Phase 4 code review.

### Smoke
- `grep -rn "panel" .claude/skills/orchestrator-protocol/ .claude/commands/flow.md .claude/docs/system-inventory.md` → every hit scoped to decision review or read-only research fan-out.
- `bun test ./.claude/hooks/` green.

### Cross-validations
- No fifth file preaching the old doctrine: `grep -rln "panel" .claude/ --include="*.md"` (excluding plans/, html-report templates, decision-stress-test, tech-plan team-mode) yields no stale code-review-panel site.
- critic ↔ orchestrator-protocol references/04 §Workflow wiring agree on dispatch target.

## US4 — Evals corpus + protocol + wiring

### Pre
- US3 closed — schema + graders + runner exist; `bun test ./.claude/evals/` green.
- Harvest sources readable: memory feedback entries, retros 014-018, `learned/inbox.md`, `output-styles/poneglyph.md`, `_research-skill-activation-2026-06-09.md`.

### Post
- `cases.jsonl` with ~20 cases (or fewer, count declared); `README.md` protocol; 2 one-line wiring edits applied.

### Structural assertions
- Every case: `{id, prompt, type, grader, expected, source}` — `grader` matches a US3 grader name; `source` non-empty and points at a real file.
- README states: cadence (per meta-config change), expected ≈100% pass, suspect-the-eval-first, pass^k 2-3 trials policy, ≤50-case cap, cluster list.

### Smoke
- `bun .claude/evals/run.ts --offline <fixtures>` parses all cases without schema errors.
- `grep -n "evals/run.ts" .claude/skills/meta-create/SKILL.md .claude/skills/meta-settings-cookbook/SKILL.md` → 1 hit each.
- `bun test ./.claude/hooks/ ./.claude/evals/` green.

### Cross-validations
- No near-duplicate cases: cluster list in README accounts for every case id.
- Zero cases without traceable source (anti synthetic-filler — spec out-of-scope).

## US5 — best-of-n skill + log

### Pre
- `.claude/skills/best-of-n/` does not exist; `.claude/learned/` exists.
- `claude --help` flag surface checked at build start (open question #2).

### Post
- `SKILL.md` with the full pattern; `best-of-n-log.md` seeded (schema header, zero rows).

### Structural assertions
- Frontmatter per meta-create canon: `name`, `description` with "Use when:" + "Keywords -".
- Body contains: eligibility gate (hard + runnable check), N=2-3 cap, suite-selects + human tiebreak, NO LLM-judge rule, explicit `git worktree remove` cleanup, mandatory log-row step — each with W1 D1 citation.
- Anti-trigger section: easy tasks / no runnable check → do not use.
- Log schema columns: date, task, N, attempts-green, selected-by, cost estimate, win-vs-single judgment, notes.

### Smoke
- Frontmatter parses (skill registers next session); `bun test ./.claude/hooks/` green.

### Cross-validations
- SKILL.md commands match the verified `claude --help` flag surface (no invented flags).
- Out-of-scope honored: nothing automates best-of-N as default execution mode.

## Drillme — Phase 2.5

1. `[failure]` Happy + edge per HU: US3 has 11 tests (happy + edge per grader + integration); US1/2/4/5 have all 5 validation categories. ✓
2. `[approach]` Untestable HUs: none — 0% untestable rate. ✓
3. `[approach]` Property-based fit: considered and declined for US3 (declared in tests.md — no cheap meaningful generator for NL heuristics). ✓
