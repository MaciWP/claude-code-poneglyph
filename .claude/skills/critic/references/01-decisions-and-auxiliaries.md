# Critic — decisions history + auxiliary skills matrix

Extracted verbatim from `SKILL.md` (017/US9 — mechanical move, no content redesign).

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

## Verification (post-implementation of this skill)

- Smoke: invoke `/critic` on a feature with all HUs closed → produces `review.md` with 5 sections + verdict.
- Verify `review.md` frontmatter declares `review_level` + reason.
- Verify findings cite `file:line` (no vague references).
- Verify `review_panel_invoked` flag matches the level + complexity decision.
- `bun test ./.claude/hooks/` → green (this skill is markdown — no hook test impact).
