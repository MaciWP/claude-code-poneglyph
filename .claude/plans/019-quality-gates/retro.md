---
spec: 019-quality-gates
phase: 5
retro_level: standard
verdict_phase4: APPROVED
spec_drift: none
promotions_proposed: 2
promotions_approved: 2
commandment_violations: 0
living_spec_delta: no
action_items: 4
created: 2026-06-10
status: approved
---

# Retro — 019-quality-gates

## Summary

The problem (spec): poneglyph's quality gates were weaker than the evidence supports — panel-default code review (~80% FP form), no regression harness for meta-config, no named best-of-N practice. Delivered: 5/5 HUs same-day — critic redesigned around mechanical checks + ONE fresh-context reviewer (panel demoted to decisions, doctrine propagated to 4 ecosystem files), `.claude/evals/` harness (5 pure graders TDD'd red→green, runner with offline mode, 18 real-failure cases, suspect-the-eval-first protocol, wired into meta-create/meta-settings-cookbook), and the `best-of-n` pilot skill with mandatory outcome log. Verdict: smooth — APPROVED with 0 MAJOR; the 3 MINORs are live-validation debts inherent to authoring a harness from a sandbox that cannot run the `claude` binary.

## Lessons

### ✅ Patterns that worked

- **Evidence-first planning**: 018's decision memos served as Phase 2 research wholesale — zero Context7/WebFetch debt, constraints pre-locked, and every design choice citable. A research feature feeding an implementation feature is a strong two-step shape; reuse for 020/021.
- **Up-front ratification questionnaire** (3 questions at flow entry): locked the panel demotion + scope cut + corpus size before any artifact existed → 0 AskUserQuestion fired across all 5 HUs.
- **Same-feature dogfood**: Phase 4 ran the redesigned critic on the feature that redesigned it — the fresh-context reviewer (Explore, read-only, correctness-only) returned structured AC-traced findings on first try. Doctrine validated live, not just written.
- **`tdd: forced` opt-in on pure functions**: 12 tests written red against missing modules; green in one implementation pass. Cheap, binding, exactly the auxiliary-policy escape hatch working as designed.

### ❌ Patterns that didn't work

- **Sandbox can't reach the `claude` binary** (`~/.local/bin` not on the Bash PATH): runLive, the real stream-json shape, and the `-p --worktree` combo shipped unverified → all 3 review MINORs share this single root cause. Authoring harnesses that shell `claude` needs a live smoke step the sandbox cannot provide.
- **learning-inbox noise recurrence**: the error-resolution regex matched the assistant's own review prose again (3 entries this session, all noise — second consecutive feature). The 017 fix candidate (A5) hasn't landed; the inbox is currently net-negative signal.
- **advisor tool unavailable** the whole session — external failure, no workaround; triage decisions proceeded on own judgment (no observed harm, but the second-opinion layer was absent).

## Process audit

| Phase | Effort | Friction observed | Improvement candidate |
|---|---|---|---|
| Phase 1 (scope) | S | None — roadmap-019.md was a pre-spec; questionnaire reduced to 3 ratifications | — |
| Phase 2 (tech-plan) | M | None — research pre-paid by 018 | — |
| Phase 2.5 (tdd-design) | S | None | — |
| Phase 3 (build) | L | claude-binary PATH gap (live smokes impossible) | Document binary path; add live-run action item discipline |
| Phase 4 (critic) | M | None — fresh reviewer worked first try | — |

Heaviest: Phase 3, inherently (5 HUs, one TDD'd) — friction was environmental (PATH), not tooling.

## Drillme — Phase 5

1. `[approach]` **Phase too heavy?** No — weight tracked HU count; nothing ceremonial detected.
2. `[approach]` **Avoidable friction?** Partially: the PATH gap is discoverable up-front; a build-start check ("does this HU need the claude binary live?") would have surfaced the 3 MINORs as known limitations at plan time instead of review time.
3. `[approach]` **Reusable pattern?** Research-feature → implementation-feature pairing (018→019); and the up-front ratification questionnaire for features born from a roadmap.
4. `[context]` **Global vs local vs memory?** The two candidates below: one memory (single fact), one local (hook fix).
5. `[failure]` **Commandment violated silently?** None detected — 18-vs-20 declared, MINORs surfaced, no softening.

## Promotion candidates

| Candidate | Scope | Type | Why | Concrete proposal |
|---|---|---|---|---|
| claude-binary sandbox path | memory | memory entry | 3 review MINORs share this root cause; next live-run session needs the fact immediately | Memory file: `claude` CLI lives at `~/.local/bin/claude`, NOT on sandboxed-Bash PATH; live smokes of `claude -p` must use the absolute path or run outside the sandbox |
| learning-inbox self-match filter | local | hook fix | 2nd consecutive feature where 100% of inbox entries are the assistant's own review prose (error-resolution regex) — inbox is net-negative until fixed | Edit `.claude/hooks/learning-inbox.ts`: exclude matches inside assistant-authored review/verdict text (e.g., skip when the match context contains `verdict\|APPROVED\|review`) + add regression test in `__tests__/learning-inbox.test.ts` |

Verified: no path collisions (hook + test exist, edit not create; memory file name new).

## Living-spec

Spec drift: none — delivered matches spec.md exactly (review.md F5: 18-vs-20 covered by the spec's own out-of-scope clause). No diff proposed.

## Commandments audit

| # | Commandment | Cumplido? | Evidencia |
|---|---|---|---|
| I | Honest symbiosis | ✅ | 18/20 declared; 3 MINORs self-reported; ratification gates real (3 AskUserQuestion rounds) |
| II | Factual truth | ✅ | Every design choice cites 018 W1/W2; flag surface verified via `claude --help` before writing best-of-n commands |
| III | Simple by default | ✅ | 5 graders, no judge path, no negatives-mode speculatively built (declared gap instead) |
| IV | Blocking gates | ✅ | 2 hard gates human-approved; US3 red→green; 114/114 green at verdict |
| V | Understand before acting | ✅ | Discovery (blast-radius grep) before plan; style anchors read before code |
| VI | Security | ✅ | No sensitive paths touched; no destructive ops |
| VII | Performance/efficiency | ✅ | Parallel tool batches throughout; panel cost removed from default path (the feature itself) |
| VIII | Meta-prompting | ✅ | 5 execution prompts (Task/Context/Constraints/Deliverable/Verify/Ask-first); fresh-reviewer prompt constrained per Arch H |
| IX | Observability | ✅ | state.json updated per transition; best-of-n log mandates outcome capture |
| X | Maintainability | ✅ | Doctrine propagated same-feature (no truth-debt); repo-wide grep confirms zero stale panel-default sites |

## Action items

| Action | Owner | Trigger | Due |
|---|---|---|---|
| Validate runLive + real stream-json shape (review F1/F2) | next-session | First live eval run (`bun .claude/evals/run.ts` with absolute claude path) | before next meta-config change |
| First best-of-n pilot + log row (review F3) | user/Lead | Next hard+testable task | opportunistic |
| Apply approved promotions (2 candidates above) | Lead | User ratification of this retro | this session or next |
| Document offline single-trial behavior (review F4) | Lead | Bundled with F1 validation | with F1 |
