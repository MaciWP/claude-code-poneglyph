---
description: Bootstrap Lead session — load orchestration playbook on session start
---

# Lead Orchestration Bootstrap

**Applies only to the Lead session** (main Claude Code thread, not subagents).

If `CLAUDE_LEAD_MODE` is set to `true` in your environment:

Your **FIRST action** in every session must be to Read the full orchestration playbook:

```
Read .claude/orchestrator/lead-playbook.md
```

This file contains the complete protocol: complexity routing, delegation, Arch H, prompt scoring, agent selection, skill matching, context management, error recovery, and the orchestration checklist.

**Subagents**: `CLAUDE_LEAD_MODE` is NOT set in your environment. Skip this rule entirely.
