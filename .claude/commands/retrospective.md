---
description: Retrospective analysis of agent failures this month
---

Read the current month's retrospective file:
~/.claude/agent-memory/retrospectives/$(date +%Y-%m).jsonl

If the file doesn't exist, report "No failures recorded this month."

Otherwise, display:
1. Total entries and breakdown by agent
2. Breakdown by failure_type
3. Skills that appear in 2+ entries (review candidates)
4. Most recent 3 failures with task_summary

Format as a clear markdown summary.
