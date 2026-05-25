---
description: Lead bootstrap — orchestrator-protocol in normal sessions, planner-protocol in plan mode
---

<!-- Last verified: 2026-05-25 -->

# Lead Orchestration Bootstrap

**Applies only to the Lead session** (`CLAUDE_LEAD_MODE=true` in your environment).
Subagents: skip this rule entirely — `Skill()` is not available in your toolset.

This rule covers two independent bootstrap triggers. Re-invoke either skill freely after context compaction or whenever the protocol guidance is no longer in memory (each skill has ~8 references; loading `SKILL.md` does not guarantee they are all in context).

## Default trigger (orchestrator-protocol)

Invoke `Skill("orchestrator-protocol")` at session start, on the first non-trivial request:

- **When**: first user request that requires code, investigation, or decision (not trivial Q&A)
- **How**: as your FIRST action for the first non-trivial task of the session
  ```
  Skill("orchestrator-protocol")
  ```
- **Skip**: casual conversation, trivial Q&A
- **Re-invoke**: after context compaction, or when protocol guidance is needed

This loads the complete protocol — complexity routing, delegation triggers, Arch H template, agent selection, and error recovery — into your active context.

## Plan mode trigger (planner-protocol)

Invoke `Skill("planner-protocol")` as your FIRST action whenever you enter plan mode:

- **Primary trigger**: a system-reminder containing `Plan mode is active` (emitted by the Claude Code harness when plan mode is enabled). Invoke the skill immediately before any other action.
- **Secondary trigger**: user explicitly invokes `/planner` or asks to plan/decompose/roadmap a non-trivial task.
- **Skip**: trivial Q&A or pure conversation that does not require planning.
- **Re-invoke**: after context compaction, or when protocol guidance is needed.

```
Skill("planner-protocol")
```

This loads the adaptive planning protocol — Discovery, Research, Gap Analysis, Task Classification, Execution Roadmap with DAGs, TDD, Validation — into your active context.

### Level triage is automatic

The skill applies its own level triage (Quick / Standard / Full) based on complexity and scope:

| Level | When | Cost target |
|---|---|---|
| **Quick** | Complexity <30, clear scope, 1-2 files | ~3-5 min |
| **Standard** (default) | Complexity 30-60, some ambiguity | ~10 min |
| **Full** | Complexity >60, multi-domain, plan mode with architectural risk | ~20-30 min |

You do not need to pre-decide the level — the skill handles triage on its first step (§0). The Lead can force a level via flag (`--quick`, `--standard`, `--full`) or explicit instruction if needed.

## Delegation Decision Triggers

After the protocol is loaded, every user request must be triaged against **two independent triggers** before the Lead acts:

### Trigger A — Delegate implementation

Applies when the change involves writing code. The `lead-enforcement.ts` gate operates in **default-allow** mode: the Lead acts freely except on real danger signals.

| Condition | Action |
|-----------|--------|
| ≥5 files to modify | Delegate to `builder` (or `planner` if complexity >60) — the gate does not enforce it; rely on judgment |
| Architectural change (cross-module, new interface, major refactor) | Delegate to `planner` → `builder` |
| 1-4 files, bounded change | Lead acts directly — **no declaration required** |
| Sensitive path (`.env`, `*.lock`, `package.json`, `.claude/settings.json`, `secrets/`, `credentials/`) | Declare inline `sensitive: <reason ≥8 chars>` or delegate to the builder |
| Destructive/irreversible operation (`rm -rf`, force push, db migration, schema change) | 🚫 Absolutely blocked by the gate; delegate to the builder with a clear reason |

**Important change (allow-by-default)**: the Lead NO longer declares `Files: N + non-architectural` for each Edit. The only mandatory declarations are `sensitive: <reason>` when a sensitive path is touched. For everything else, the Lead decides when to delegate, guided by Trigger A/B and the parallelization metrics.

### Trigger B — Delegate exploration

Applies when you need to understand the codebase before changing it.

**Default exploration agent: `Explore`** (built-in, Haiku, fast & cheap, empirical score 83). Reach for the custom `scout` (Sonnet, score 60, ~5× cost) **only** when Explore's limits would actually hurt the task — Explore reads excerpts rather than whole files, misses content past its read window, and is not meant for open-ended analysis, design-doc auditing, or cross-file consistency checks.

| Volume / Complexity | Action |
|-----------------------|--------|
| LOW + LOW (1-2 files, direct read) | Lead `Read` directly |
| LOW + HIGH (1-2 files, requires LSP/semantics) | `Explore` (default); `scout` only if full-file synthesis is needed |
| HIGH + LOW (≥3 files, bulk read without reasoning) | `Explore` — best fit |
| HIGH + HIGH (≥3 files, cross-file synthesis / open-ended analysis) | `scout` (Sonnet) |
| Design-doc audit, cross-file consistency check, full-file analysis past Explore's window | `scout` (Sonnet) |

Both agents have WebSearch / WebFetch; that is **not** a discriminator. The discriminator is read window + synthesis depth.

Full reference: `${CLAUDE_SKILL_DIR}/references/04-agent-selection.md` §Exploration Decision Matrix.

### Combination

The two triggers are **independent**. A task can fire A (delegate implementation) without firing B (Lead already has context), or fire B (needs exploration) without firing A (no change to implement). Typically both fire — first exploration, then implementation.
