---
description: Retrospective analysis of agent learnings and recent fixes (last 30 days)
---

# Retrospective

Synthesize a retrospective from the surviving observability surfaces.

## Sources

1. **Agent memories** (lessons each subagent has accumulated):
   - `.claude/agent-memory/scout/MEMORY.md`
   - `.claude/agent-memory/builder/MEMORY.md`
   - `.claude/agent-memory/reviewer/MEMORY.md`

2. **Recent fixes** (commits in the last 30 days touching bugs/regressions):
   - Run: `git log --since="30 days ago" --grep="fix\|bug\|revert\|hotfix" --pretty=format:"%h %ad %s" --date=short`

## Output

Produce a markdown summary with:

1. **Per-agent lessons** — for each of the 3 agents, list the most recent entries in their MEMORY.md and surface any that mention recurring themes (failures, retries, gotchas).
2. **Recurring patterns** — themes that appear in ≥2 agent memories or ≥2 fix commits.
3. **Recent fixes** — bullet list of the last 30 days of fix commits (hash + date + subject).
4. **Recommendations** — 1-3 concrete suggestions for what to improve next, based on patterns above.

If a memory file is empty or doesn't exist, note it and continue. If `git log` returns no fixes, note "No fix commits in the last 30 days."
