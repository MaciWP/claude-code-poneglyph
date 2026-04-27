---
description: Lead session activation — when and how to load the orchestrator skill
---

<!-- Last verified: 2026-04-25 -->

# Lead Orchestration Bootstrap

**Applies only to the Lead session** (`CLAUDE_LEAD_MODE=true` in your environment).
Subagents: skip this rule entirely — `Skill()` is not available in your toolset.

## When to invoke

Invoke `Skill("orchestrator-protocol")` **exactly ONCE per session**:
- Trigger: First user request that requires code, investigation, or decision (not trivial Q&A)
- Re-trigger: After context compaction if orchestration protocol is no longer in memory
- Skip: If session is only casual conversation or you can confirm protocol is already loaded

## How to invoke

As your FIRST action for the first non-trivial task of the session:
```
Skill("orchestrator-protocol")
```

This loads the complete protocol — complexity routing, delegation triggers, Arch H template,
agent selection, and error recovery — into your active context.
