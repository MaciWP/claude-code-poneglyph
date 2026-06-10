---
spec: 017-personal-optimization
phase: 5
retro_level: full
verdict_phase4: APPROVED_WITH_WARNINGS
spec_drift: legitimate
promotions_proposed: 6
promotions_approved: 3 # P1-P3 applied (build Step 9 + rubric S7 + rubric anti-pattern); P4-P5 NOT approved (no memory entries); P6 deferred as A5
commandment_violations: 3
living_spec_delta: yes
action_items: 5
inbox_consumed: 1 entry (1 discarded as noise — first real cycle of the learning-inbox hook)
created: 2026-06-10
status: approved
---

# Retro — 017-personal-optimization

## 1. Executive summary

The problem (spec): accumulated meta-system debt degrading every session — context bloat, lying docs, dead artifacts, translated-English style, and an orchestration doctrine that contradicted the user's lived evidence that agents never worked for building. Delivered: 15/15 HUs across 4 waves — CLAUDE.md 264→150 lines, inline-first doctrine canonical, es-ES style spec'd, hooks fixed/tested/pruned (102/102 green), 9 plans archived, truth sweep with cited version pins, settings modernized against the verified schema, 2 new observability/activation hooks, the project-onboard skill, and a curated 21→16 memory. Verdict: friction-bearing but smooth — the two Phase 4 MAJORs were self-inflicted and self-caught; one planned mechanism (disable-model-invocation) died honestly on a live smoke and closed via documented revert.

## 2. Technical lessons

### ✅ Patterns that worked
- **Predicted-red TDD** (tests.md declares the exact expected red error): 3/3 forced HUs matched the literal predicted error before impl — the oracle caught misunderstandings at zero cost. Reuse: keep as tdd-design standard.
- **1-unit smoke before rollout** (US9): flipping `disable-model-invocation` on ONE skill and testing the live Skill-tool path saved `/flow` from a 6-skill breakage. Reuse: any config field rollout.
- **Script over N edits** (US10): 51 reference ToCs inserted by one Python pass instead of 51 manual Edits — faster, uniform, verifiable in one re-scan.
- **Schema/docs verification BEFORE writing config** (US8/US12): killed two invented fields (`requiredMinimumVersion`, `fallbackModel`) and confirmed `InstructionsLoaded` exists — zero invented config shipped.
- **USs as execution prompts** (017's own tasks carried the block): build consumed Task/Context/Constraints/Deliverable/Verify directly; now wired permanently (US13).
- **Decision absorption with user ratification at build** (8 AskUserQuestions): every deferred decision (gate NO, json deletes, archive classification, env drops, MCP set, scope expansion, memory deletes, panel) resolved at the moment of maximum context.

### ❌ Patterns that didn't work
- **Truth sweep sequenced BEFORE component creation**: US7 (truth sweep) ran in W2; US11/US12 created hooks in W3 and regenerated truth-debt (stale error-recovery table) that Phase 4 had to catch. The sweep must be the LAST wave or re-run at feature end.
- **`git add -A` with a parallel active plan**: 3 commits (d1367f4, 2b78b81, efc187f) swept 018-evidence-roadmap files into 017 history. Caught on the third occurrence, not the first.
- **Late, unbudgeted review panel**: launched at session end; all 4 agents died on the account session limit — ~278K tokens for zero verdicts. Independence concern left to declared-bias fallback.
- **New-artifact protection as an afterthought**: learning-inbox writes transcript snippets to disk and the dir wasn't gitignored at creation (potential secret-persistence path). Caught in Phase 4, not in the HU.
- **Learning-inbox first capture = false positive**: the error-resolution regex matched the assistant's own review.md prose about failures, not a real learning. The heuristic needs source-attribution (user-text vs assistant-report) before it earns trust.

## 3. Process audit

| Phase | Effort | Friction observed | Improvement candidate |
|---|---|---|---|
| 1 (scope) | M | None visible from build — ACs were mechanically checkable | — |
| 2 (tech-plan) | L | Baselines stale by build time (631 test lines vs 547; "13 state.json null" vs 8 truthful) | Re-verify per-US baselines at build open (cheap grep/wc) |
| 2.5 (tdd-design) | S | None — predicted reds were exact | — |
| 3 (build) | XL (12 HUs one session) | The 3 ❌ above (sequencing, git add, artifact protection) | docs-sync rule + scoped add + protection-at-creation |
| 4 (critic) | M | Panel infra-death; inline fallback carried the weight | Launch panels early / budget-aware sizing |

Heaviest: Phase 3, inherently (12 HUs) — no missing tool detected; the friction was discipline, not tooling.

## 4. Drillme — Phase 5

1. `[approach]` **Phase too heavy?** Phase 3, by design (12 HUs in one session). The real overweight moment was the panel at the end of it — wrong sequencing, not wrong phase.
2. `[approach]` **Avoidable friction?** Yes: the 2 self-inflicted MAJORs (gitignore + stale table) — both avoidable with a "component → its docs, same HU" rule.
3. `[approach]` **Reusable pattern?** Predicted-red TDD, 1-unit smoke before rollout, script-over-N-edits — all reusable beyond poneglyph.
4. `[context]` **Global vs local vs memory?** The docs-sync rule and smoke-before-rollout are global (build/meta-create are global skills); git-add scoping and panel-early are memory; inbox refinement is local code.
5. `[failure]` **Commandment violated silently?** Three ⚠️ (II, VI, VII) — none silent by the end: all surfaced in Phase 4/5 with forensics below.

## 5. Promotion candidates (user approves before ANY write)

| # | Candidate | Scope | Type | Evidence | Concrete proposal |
|---|---|---|---|---|---|
| P1 | **docs-sync-same-HU** | global | skill edit | F2 (stale hook table) + ❌ lesson 1 | `build/SKILL.md` Step 9: add check "if the HU created/changed a component, the docs that DESCRIBE it (rules tables, inventory) update in the SAME HU" |
| P2 | **protection-at-creation** | global | skill edit | F1 (learned/ committable) | `meta-create/references/01-authoring-rubric.md` §scripts: add row "artifact that persists runtime/transcript data → its path enters .gitignore in the same change" |
| P3 | **smoke-before-rollout** | global | skill edit | US9 saved /flow | same rubric, new anti-pattern row: "config field applied to N units without a 1-unit live smoke first" |
| P4 | **scoped-git-add** | memory | memory entry | 3 polluted commits | feedback entry: explicit paths during features; `-A` only when no parallel plan is active |
| P5 | **panel-early-and-budgeted** | memory | memory entry | 278K tokens, 0 verdicts | feedback entry: review panels launch early-session and sized to remaining budget |
| P6 | **inbox source-attribution** | local | hook edit (future minimal HU) | first capture = false positive | `learning-inbox.ts`: match signals only in user-attributed transcript lines, or drop error-resolution confidence to 0.3 until proven |

Path collisions verified: P1-P3 edit existing files (no new paths); P4-P5 new memory slugs (no collision); P6 edits existing hook.

## 6. Living-spec deltas (proposals — NOT applied)

1. **AC7**: replace "fallback models + disable-model-invocation where appropriate" with "version gate + reviewed permissions + field-existence findings documented (fallbackModel absent from schema; disable-model-invocation blocks explicit Skill-tool invocation — revert recorded)". Trigger: live findings US8/US9.
2. **AC3**: "only the active plan remains" → "only active plans + justified retained-by-reference files remain (001 canonical matrix, research files); closed/abandoned → gitignored archive". Trigger: ratified classification US6.
3. **§Out of scope / US14**: note "project-onboard v1 scope expanded at build by user decision: full personalized component menu". Trigger: explicit user ratification at build.

All three pass the legitimacy criteria (real edge case + no contradiction with intent + documented why).

## 7. Commandments audit

| # | Commandment | Cumplido | Evidencia |
|---|---|---|---|
| I | Honest symbiosis | ✅ | 8 ratification questions; MAJORs self-reported; revert declared, not hidden |
| II | Factual truth | ⚠️ | Schema/docs/event verification before every config write ✅ — BUT error-recovery table went stale post-US12 (truth-debt regenerated in-feature) |
| III | Simple by default | ✅ | Revert over forcing; loops over per-case tests; lean templates; no new abstractions |
| IV | Blocking gates | ✅ | Suite green per HU (102/102 final); red→green ×3 with predicted reds; verdict gates honored |
| V | Understand before acting | ✅ | Stale baselines re-verified case by case; stash-check before claiming pre-existing bug |
| VI | Security | ⚠️ | Deny lists intact, secrets clean ✅ — BUT learned/ created without gitignore (secret-persistence path open until Phase 4) |
| VII | Performance/efficiency | ⚠️ | Inline execution efficient ✅ — BUT panel burned ~278K tokens for zero output (late, unbudgeted) |
| VIII | Optimal meta-prompting | ✅ | USs-as-prompts consumed directly; panel prompts schema-forced (though unconsumed) |
| IX | Observability/self-improvement | ✅ | learning-inbox + instructions-loaded built AND first cycle ran (1 capture, honestly discarded) |
| X | Maintainability | ✅ | Truth sweep, archive, rubric vendored, memory curated — P1 closes the remaining gap |

### Forensics (3 ⚠️)

- **II — stale hook table**: occurred at US12 close (registered hooks without re-touching error-recovery.md). Alternative path: P1 rule. Action: A1.
- **VI — unprotected learned/**: occurred at US11 design (output path defined, protection forgotten). Alternative path: P2 rule. Action: A1.
- **VII — panel token burn**: occurred at Phase 4 launch decision (no budget check before 4-agent fan-out near session limit). Alternative path: P5 lesson + early scheduling. Action: A3.

## 8. Action items

| # | Action | Owner | Trigger | Due |
|---|---|---|---|---|
| A1 | Apply approved promotions (P1-P5 file edits + memory entries) | Lead | user ratification of §5 | this session |
| A2 | Apply approved living-spec diffs (§6) to spec.md with "v2 — delta from retro 017" note | Lead | user ratification | this session |
| A3 | Behavioral validation next session: es-ES style register, skill-activation injections on real prompts, `grep instructions-loaded.log` (first mechanical load-layer proof) | next-session | session start | next session |
| A4 | Resolve merge with `html-report-palette-md-charts` favoring 017 (stdin fix + research file overlap) | user/Lead | next merge to main | before next feature on main |
| A5 | P6 inbox source-attribution refinement | Lead | next minimal HU (or fold into next feature) | when inbox noise repeats |

## Inbox consumption (Step 13c pre-record)

1 entry consumed: `error-resolution (0.5)` from this session — **discarded as noise** (regex matched the assistant's own review prose, not a learning). Discard count: 1. Inbox cleared at lifecycle close.
