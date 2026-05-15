---
description: Lead session activation — when and how to load the orchestrator skill
---

<!-- Last verified: 2026-04-25 -->

# Lead Orchestration Bootstrap

**Applies only to the Lead session** (`CLAUDE_LEAD_MODE=true` in your environment).
Subagents: skip this rule entirely — `Skill()` is not available in your toolset.

## When to invoke

Invoke `Skill("orchestrator-protocol")` at session start, and re-invoke freely whenever the protocol needs to be refreshed:
- Initial trigger: First user request that requires code, investigation, or decision (not trivial Q&A)
- Re-invoke after context compaction if the orchestration protocol is no longer in memory
- Re-invoke when protocol guidance is needed (the skill has 8 references; loading `SKILL.md` does not guarantee they are all in context)
- Skip: If session is only casual conversation

## How to invoke

As your FIRST action for the first non-trivial task of the session:
```
Skill("orchestrator-protocol")
```

This loads the complete protocol — complexity routing, delegation triggers, Arch H template,
agent selection, and error recovery — into your active context.

## Delegation Decision Triggers

After the protocol is loaded, every user request must be triaged against **two independent triggers** before the Lead acts:

### Trigger A — Delegate implementation

Applies when the change involves writing code. The `lead-enforcement.ts` gate operates in **default-allow** mode: the Lead acts freely except on real danger signals.

| Condition | Action |
|-----------|--------|
| ≥5 files to modify | Delegate to `builder` (or `planner` if complexity >60) — the gate does not enforce it, but the `/parallelism-insights` metric monitors it |
| Architectural change (cross-module, new interface, major refactor) | Delegate to `planner` → `builder` |
| 1-4 files, bounded change | Lead acts directly — **no declaration required** |
| Sensitive path (`.env`, `*.lock`, `package.json`, `.claude/settings.json`, `secrets/`, `credentials/`) | Declare inline `sensitive: <reason ≥8 chars>` or delegate to the builder |
| Destructive/irreversible operation (`rm -rf`, force push, db migration, schema change) | 🚫 Absolutely blocked by the gate; delegate to the builder with a clear reason |

**Important change (allow-by-default)**: the Lead NO longer declares `Files: N + non-architectural` for each Edit. The only mandatory declarations are `sensitive: <reason>` when a sensitive path is touched. For everything else, the Lead decides when to delegate, guided by Trigger A/B and the parallelization metrics.

### Trigger B — Delegate exploration (2×2 matrix)

Applies when you need to understand the codebase before changing it.

| Volume / Complexity | Action |
|-----------------------|--------|
| LOW + LOW (1-2 files, direct read) | Lead `Read` directly |
| LOW + HIGH (1-2 files, requires LSP/semantics) | `scout` (Sonnet) |
| HIGH + LOW (≥3 files, bulk read without reasoning) | `Explore` (Haiku) if available, otherwise `scout` |
| HIGH + HIGH (≥3 files, requires synthesis) | `scout` (Sonnet) |

Full reference: `${CLAUDE_SKILL_DIR}/references/04-agent-selection.md` §Exploration Decision Matrix.

### Combination

The two triggers are **independent**. A task can fire A (delegate implementation) without firing B (Lead already has context), or fire B (needs exploration) without firing A (no change to implement). Typically both fire — first exploration, then implementation.
