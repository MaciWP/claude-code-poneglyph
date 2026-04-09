# Team Routing Rule

Quick reference for the Lead when executing team mode. See `complexity-routing.md` for decision criteria.

## Prerequisites

| Requirement | Check |
|-------------|-------|
| Env var active | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` |
| Planner recommended team | `executionMode: team` in roadmap |
| Complexity > 60 | Calculated in complexity routing |
| 3+ independent domains | No shared files between domains |

If any prerequisite fails → use subagents (current flow).

## Opt-Out

| Variable | Effect |
|----------|--------|
| `PONEGLYPH_DISABLE_TEAM_MODE=1` | Always forces subagents, ignores planner recommendation |

## Teammate Prompt Template

Each teammate receives a prompt with:

| Field | Content |
|-------|---------|
| **Domain** | "Your domain is [X]. You only touch files in [paths]." |
| **Tasks** | Roadmap subtasks assigned to this domain |
| **Interfaces** | Contracts to expose/consume with other domains |
| **Constraint** | "DO NOT modify files outside your domain" |
| **Coordination** | "Use the task list to coordinate with other teammates" |

## Coordination Protocol

| Phase | Lead Action |
|-------|-------------|
| **Spawn** | Create one teammate per domain using the prompt template |
| **Monitor** | Review task list for progress. Do not intervene unless stuck. |
| **Interfaces** | Teammates negotiate contracts via task list (TaskCreate/TaskUpdate) |
| **Integration** | After all teammates complete, Lead runs reviewer over the full changeset |
| **Cleanup** | Verify no file conflicts between teammate outputs |

## Fallback to Subagents

| Trigger | Action |
|---------|--------|
| Teammate fails 2x | Extract domain tasks → run as builder subagent |
| Multiple teammates fail | Abort team mode → full fallback to subagents |
| File conflict between teammates | Lead arbitrates via reviewer. Losing domain re-executes. |
| Env var missing but planner recommended team | Silent fallback to subagents. Log warning. |

## Comparative Cost

| Mode | Relative Cost | When it's worth it |
|------|---------------|--------------------|
| Subagents | 1x (baseline) | 95% of tasks |
| Team Agents | 3-7x | Truly independent domains, complexity >60, need for interface negotiation |

## Current Limitation

Teammates are always `general-purpose` (issue anthropics/claude-code#24316). They cannot use custom `.claude/agents/`. However, each teammate loads `~/.claude/` automatically — Poneglyph rules, skills and hooks apply.
