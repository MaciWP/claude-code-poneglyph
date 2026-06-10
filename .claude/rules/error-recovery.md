<!-- Last verified: 2026-06-09 -->

# Error Recovery

When a build step fails (inline, 1-3 units) or a `Workflow` unit fails (≥4 fan-out), the Lead diagnoses inline (loading `diagnostic-patterns` skill if needed) and decides: retry, re-plan, or escalate. No dedicated diagnosis agent — the Lead handles it. The custom `builder`/`reviewer`/`scout` agents were **cut in feature 008**; "recovery" now means re-running the inline step, the failed Workflow unit, or folding a stuck Team domain back to inline.

## Retry Budget

| Error Type | Max Retries | Backoff | Then |
|------------|-------------|---------|------|
| Inline build — test failure | 2 | None | Lead diagnoses with `diagnostic-patterns` → fix inline |
| Inline build — Edit conflict | 1 | Re-read file | Lead re-reads and re-issues the edit |
| Workflow unit failure | 1 | Re-run unit | Lead diagnoses → re-run the unit (or fold inline) |
| Workflow unit timeout | 1 | Double timeout | Escalate to user |
| Critic BLOCKED | 0 | - | Re-plan with `tech-plan` skill |
| Critic NEEDS_CHANGES | 2 | Apply feedback | Escalate to user |
| Worktree merge conflict | 1 | Re-run unit | Escalate to user |
| Team teammate failure | 1 | Re-prompt with context | Fold the domain back to inline / a Workflow unit |
| Team teammate stuck (no progress) | 0 | - | Fold the domain back to inline / a Workflow unit |
| Team teammate file conflict | 0 | - | Lead resolves boundaries, re-assign |

> **Identical-error override**: the retry counts above assume each attempt yields a *different* or *progressing* error. If a retry reproduces the **exact same error**, stop immediately per §Stuck Detection ("Same exact error 2 times → STOP") — do not spend the remaining budget on a non-progressing failure.

> Team mode recovery: see `.claude/skills/orchestrator-protocol/references/03-complexity-routing.md` §Team Mode Execution §Fallback to Subagents.

## SendMessage Recovery (Workflow / Team agents only)

`SendMessage({to: agentId})` continues a still-running **Workflow or Team agent** — preserves context, saves ~2K-5K tokens vs re-spawn. It does NOT apply to inline work (1-3 units): there is no agent to message — the Lead simply re-runs the step in its own session.

| Situation | Method | Reason |
|-----------|--------|--------|
| Inline build failed a test | Re-run inline | The Lead already holds the code context — no agent to message |
| Workflow unit failed a test | SendMessage to that unit | The unit already has its code context |
| Workflow unit failed on a stale edit | SendMessage | Re-read and retry in the same context |
| Lead diagnosed a fix for a live unit | SendMessage to that unit | Avoids re-exploring the codebase |
| Unit failed 2+ times | Re-run unit with full diagnosis | Original context may be contaminated |
| Error in a different agent | New unit / inline | SendMessage does not cross agents |

```
SendMessage({
  to: "wf-unit-a3f8c2",
  message: "Test failed: TypeError at auth.ts:23. Diagnosis: null check missing on user object. Fix: add guard clause before user.id access. Do NOT remove existing tests."
})
```

> SendMessage auto-resumes agents stopped in background.

## Diagnosis Workflow (Lead-driven)

When a build step or Workflow unit fails, the Lead:

1. Read the error from the failure report (full message + stack).
2. Invoke `Skill('diagnostic-patterns')` if the error type is non-obvious (cascading failures, retry storms, timeouts, transient errors).
3. Apply a recovery strategy from the skill (5 Whys, stack-trace analysis, classification) using `Read`/`Grep`/`LSP` directly — no separate diagnosis subagent.
4. Decide: fix inline, SendMessage to the live Workflow unit with the fix, re-run with full diagnosis, or escalate to user.

## Recovery Prompt Template

When re-running a Workflow unit, ALWAYS include:

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
| Workflow unit in worktree fails | Preserve worktree, Lead diagnoses |
| Lead identifies a fix | Re-run the unit in the SAME worktree via SendMessage |
| Retry fails | Delete worktree + branch, escalate to user |
| Merge conflict in worktree | Lead resolves inline (or re-run the unit) |
| Unit fails on merge | Preserve worktree, escalate to user with diff |

## Hook Reliability (Issue #6305)

PreToolUse and PostToolUse hooks may silently fail to fire (known Claude Code bug, open issue #6305). Design validation accordingly:

| Hook type | Reliability | Registered today | Use for |
|-----------|-------------|------------------|---------|
| `Stop` | Reliable | YES — `security-gate.ts` | Quality gate — security validation. Test verification is performed manually by the Lead after the build step. |
| `UserPromptSubmit` | Reliable as event (gap early-session/post-compaction — issue #17277) | **NO — none registered** | Candidate surface for skill-activation injection (planned 017/US12) |
| `SubagentStop` | Reliable as event | **NO — none registered** | Available for future use |
| `PreToolUse` | Unreliable (#6305) | NO | Best-effort only — never sole gate for critical checks |
| `PostToolUse` | Unreliable (#6305) | YES — `code-validator.ts` | Best-effort only — never sole gate for critical checks |

`security-gate.ts` (Stop, async) is the current Stop hook. There is no automatic test-pass validator at the moment — the Lead is responsible for verifying tests after each build step. Never rely solely on PostToolUse for security enforcement.
