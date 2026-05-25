<!-- Last verified: 2026-05-25 -->

# Error Recovery

When a subagent fails, the Lead diagnoses inline (loading `diagnostic-patterns` skill if needed) and decides: retry, re-plan, or escalate. No dedicated diagnosis agent — the Lead handles it.

## Retry Budget

| Error Type | Max Retries | Backoff | Then |
|------------|-------------|---------|------|
| Builder test failure | 2 | None | Lead diagnoses with `diagnostic-patterns` → SendMessage or re-spawn |
| Builder Edit conflict | 1 | Re-read file | Lead inspects, re-issues with updated context |
| Agent timeout | 1 | Double timeout | Escalate to user |
| Reviewer BLOCKED | 0 | - | Re-plan with `planner-protocol` skill |
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
| Lead diagnosed a fix | SendMessage to original builder | Avoids re-exploring codebase |
| Builder failed 2+ times | Re-spawn with full diagnosis | Original context may be contaminated |
| Error in a different agent | Re-spawn new agent | SendMessage does not cross agents |

```
SendMessage({
  to: "builder-a3f8c2",
  message: "Test failed: TypeError at auth.ts:23. Diagnosis: null check missing on user object. Fix: add guard clause before user.id access. Do NOT remove existing tests."
})
```

> SendMessage auto-resumes agents stopped in background.

## Diagnosis Workflow (Lead-driven)

When a builder fails, the Lead:

1. Read the error from the builder report (full message + stack).
2. Invoke `Skill('diagnostic-patterns')` if the error type is non-obvious (cascading failures, retry storms, timeouts, transient errors).
3. Apply a recovery strategy from the skill (5 Whys, stack-trace analysis, classification) using `Read`/`Grep`/`LSP` directly — no separate diagnosis subagent.
4. Decide: SendMessage to original builder with the fix, re-spawn with full diagnosis, or escalate to user.

## Recovery Prompt Template

When re-spawning, ALWAYS include:

| Field | Content |
|-------|---------|
| **Original error** | Full error message |
| **Diagnosis** | Root cause identified by the Lead (cite line + reasoning) |
| **Do NOT repeat** | Specific action that caused the failure |
| **Changed constraints** | New limits or additional context |

## Stuck Detection

| Condition | Action |
|-----------|--------|
| 3+ retries on the same task | STOP → AskUserQuestion |
| 2+ diagnoses without a working fix | STOP → AskUserQuestion |
| Same exact error 2 times | STOP → AskUserQuestion |

When blocked, ask: (1) missing context, (2) approach change, (3) task split.

## Worktree Cleanup on Failure

| Condition | Action |
|-----------|--------|
| Builder in worktree fails | Preserve worktree, Lead diagnoses |
| Lead identifies a fix | Retry builder in the SAME worktree via SendMessage |
| Retry fails | Delete worktree + branch, escalate to user |
| Merge conflict in worktree | Delegate to builder |
| Builder fails on merge | Preserve worktree, escalate to user with diff |

## Hook Reliability (Issue #6305)

PreToolUse and PostToolUse hooks may silently fail to fire (known Claude Code bug, open issue #6305). Design validation accordingly:

| Hook type | Reliability | Use for |
|-----------|-------------|---------|
| `Stop` | Reliable | Primary quality gate — tests, security validation |
| `UserPromptSubmit` | Reliable | Memory injection, routing hints |
| `SubagentStop` | Reliable | Agent scoring, memory insights |
| `PreToolUse` | Unreliable | Best-effort only — never sole gate for critical checks |
| `PostToolUse` | Unreliable | Best-effort only — never sole gate for critical checks |

`validate-tests-pass.ts` (Stop) is the authoritative gate. Never rely solely on PostToolUse for security enforcement.
