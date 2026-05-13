---
description: Plan mode activation — when and how to load the planner-protocol skill
---

<!-- Last verified: 2026-05-13 -->

# Plan Mode Bootstrap

**Applies only to the Lead session** (`CLAUDE_LEAD_MODE=true` in your environment).
Subagents: skip this rule entirely — `Skill()` is not available in your toolset.

## When to invoke

Invoke `Skill("planner-protocol")` as your FIRST action whenever you enter plan mode, and re-invoke freely whenever the protocol needs to be refreshed:
- **Primary trigger**: If you see a system-reminder containing `Plan mode is active` (the Claude Code harness emits this reminder when plan mode is enabled), invoke the skill immediately before any other action.
- **Secondary trigger**: User explicitly invokes `/planner` or asks to plan/decompose/roadmap a non-trivial task.
- **Re-invoke** after context compaction if the planning protocol is no longer in memory.
- **Re-invoke** when protocol guidance is needed (the skill has 8 references; loading `SKILL.md` does not guarantee they are all in context).
- **Skip**: trivial Q&A or pure conversation that does not require planning.

No "ONCE per session" guard: re-invoking is cheap and refreshes the protocol when it drifts out of context.

## How to invoke

As your FIRST action upon entering plan mode:
```
Skill("planner-protocol")
```

This loads the complete adaptive protocol — Discovery, Research, Gap Analysis, Task Classification,
Execution Roadmap with DAGs, TDD, Validation — into your active context.

## Level triage is automatic

The skill applies its own level triage (Quick / Standard / Full) based on complexity and scope:

| Level | When | Cost target |
|---|---|---|
| **Quick** | Complexity <30, clear scope, 1-2 files | ~3-5 min |
| **Standard** (default) | Complexity 30-60, some ambiguity | ~10 min |
| **Full** | Complexity >60, multi-domain, plan mode with architectural risk | ~20-30 min |

You do not need to pre-decide the level — the skill handles triage on its first step (§0). The Lead can force a level via flag (`--quick`, `--standard`, `--full`) or explicit instruction if needed.
