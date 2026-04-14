# Error Recovery

Recovery guide for when agents fail. Defines retry budgets, escalation, and stuck detection.

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

> Team mode specific recovery: see `complexity-routing.md §Team Mode Execution §Fallback to Subagents`.

## SendMessage Recovery (Preferred)

Since v2.1.77, use `SendMessage({to: agentId})` to continue a failed agent instead of spawning a new one. This preserves all agent context (files read, edits made) and saves ~2K-5K tokens of re-setup.

### When to use SendMessage vs Re-spawn

| Situation | Method | Reason |
|-----------|--------|--------|
| Builder failed test | SendMessage | Builder already has code context, only needs the error |
| Builder failed due to stale edit | SendMessage | Re-read the file and retry in the same context |
| Error-analyzer diagnosed a fix | SendMessage to original builder | Avoids re-exploring the codebase |
| Builder failed 2+ times | Re-spawn with full diagnosis | Original context may be contaminated |
| Error in a different agent than the original | Re-spawn new agent | SendMessage does not cross agents |

### SendMessage Recovery Example

```
// Builder failed on test
SendMessage({
  to: "builder-a3f8c2",
  message: "Test failed: TypeError at auth.ts:23. Diagnosis: null check missing on user object. Fix: add guard clause before user.id access. Do NOT remove existing tests."
})
```

> SendMessage auto-resumes agents stopped in background.

## Recovery Prompt Template

When retrying (with re-spawn), ALWAYS include in the builder prompt:

| Field | Content |
|-------|---------|
| **Original error** | Full error message |
| **Diagnosis** | error-analyzer output (if available) |
| **Do NOT repeat** | Specific action that caused the failure |
| **Changed constraints** | New limits or additional context |

## Pattern-Based Recovery (capability, opt-in)

`api-error-recorder.ts` and `permission-denied.ts` hooks record normalized error patterns to `~/.claude/error-patterns.jsonl` via `lib/error-patterns.ts`. The Lead or error-analyzer may consult this file to short-circuit retries on known patterns.

| Match quality | Action |
|---|---|
| Exact/regex match, success rate >70% | Apply known fix directly, skip error-analyzer |
| Match, success rate ≤70% | error-analyzer + include fix history in prompt |
| No match | Standard error-analyzer + new pattern recorded on outcome |

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
