<!-- Last verified: 2026-04-25 -->

# Error Recovery

## Retry Budget

| Error Type | Max Retries | Backoff | Then |
|------------|-------------|---------|------|
| Builder test failure | 2 | None | error-analyzer → re-plan |
| Builder Edit conflict | 1 | Re-read file | error-analyzer |
| Agent timeout | 1 | Double timeout | Escalate to user |
| Reviewer BLOCKED | 0 | - | Re-plan with planner |
| Reviewer NEEDS_CHANGES | 2 | Apply feedback | Escalate to user |
| Worktree merge conflict | 1 | builder | Escalate to user |
| Teammate failure | 1 | Re-prompt with context | Extract domain → run as builder subagent |
| Teammate stuck (no progress) | 0 | - | Extract domain → run as builder subagent |
| Teammate file conflict | 0 | - | Lead resolves boundaries, re-assign |

> Team mode recovery: see `complexity-routing.md §Team Mode Execution §Fallback to Subagents`.

## SendMessage Recovery (Preferred)

Use `SendMessage({to: agentId})` to continue a failed agent — preserves context, saves ~2K-5K tokens vs re-spawn.

| Situation | Method | Reason |
|-----------|--------|--------|
| Builder failed test | SendMessage | Builder already has code context |
| Builder failed due to stale edit | SendMessage | Re-read and retry in same context |
| Error-analyzer diagnosed a fix | SendMessage to original builder | Avoids re-exploring codebase |
| Builder failed 2+ times | Re-spawn with full diagnosis | Original context may be contaminated |
| Error in a different agent | Re-spawn new agent | SendMessage does not cross agents |

```
SendMessage({
  to: "builder-a3f8c2",
  message: "Test failed: TypeError at auth.ts:23. Diagnosis: null check missing on user object. Fix: add guard clause before user.id access. Do NOT remove existing tests."
})
```

> SendMessage auto-resumes agents stopped in background.

## Recovery Prompt Template

When re-spawning, ALWAYS include:

| Field | Content |
|-------|---------|
| **Original error** | Full error message |
| **Diagnosis** | error-analyzer output (if available) |
| **Do NOT repeat** | Specific action that caused the failure |
| **Changed constraints** | New limits or additional context |

## Stuck Detection

| Condition | Action |
|-----------|--------|
| 3+ retries on the same task | STOP → AskUserQuestion |
| 2+ error-analyzer runs without a fix | STOP → AskUserQuestion |
| Same exact error 2 times | STOP → AskUserQuestion |

When blocked, ask: (1) missing context, (2) approach change, (3) task split.

## Worktree Cleanup on Failure

| Condition | Action |
|-----------|--------|
| Builder in worktree fails | Preserve worktree, delegate to error-analyzer |
| Error-analyzer diagnoses a fix | Retry builder in the SAME worktree |
| Retry fails | Delete worktree + branch, escalate to user |
| Merge conflict in worktree | Delegate to builder |
| Builder fails on merge | Preserve worktree, escalate to user with diff |
