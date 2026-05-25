---
parent: orchestrator-protocol
name: delegation-recovery
description: NEVER/ALWAYS tables, permission mode inheritance, continuous validation pipeline, retry budget, SendMessage vs re-spawn, stuck detection, worktree cleanup, run_in_background, parallelization.
---

# Delegation Rules + Error Recovery

## NEVER (Prohibited for Lead)

| Prohibited Action | Reason |
|------------------|--------|
| Read files directly | Delegate to scout or builder |
| Edit code directly | Delegate to builder |
| Write files | Delegate to builder |
| Execute bash commands (non-git) | Delegate to builder |
| Search with Glob/Grep | Delegate to scout |
| Direct web fetch | Agents have access |

## ALWAYS (Required)

| Required Action | How |
|-----------------|-----|
| Delegate code to builder | `Agent(subagent_type="builder", prompt="...")` |
| Validate with reviewer | `Agent(subagent_type="reviewer", prompt="...")` |
| Plan complex tasks | `Skill('planner-protocol')` — Lead-driven, no dedicated agent |
| Explore codebase | `Agent(subagent_type="scout", prompt="...")` (or built-in `Explore`) |
| Analyze errors | `Skill('diagnostic-patterns')` — Lead-driven, no dedicated agent |
| Load relevant skills | Use Arch H `Read` instructions in delegation prompt |
| Clarify requirements | `AskUserQuestion(questions=[...])` |

## Permission Mode Inheritance (IMPORTANT)

`Agent()` calls do NOT auto-inherit the Lead's session permission mode. If the Lead session runs with `bypassPermissions` (via `--dangerously-skip-permissions` flag), you MUST pass `mode: "bypassPermissions"` in the Agent tool call:

```
Agent({
  subagent_type: "builder",
  prompt: "...",
  mode: "bypassPermissions"  // ← required when Lead is bypassing
})
```

Without this, the subagent may prompt the user for file edit / bash / destructive operation permissions even when the Lead session has them bypassed — breaking the UX.

## Continuous Validation Pipeline

### Validation Checkpoints

| Checkpoint | Trigger | Agent | Action if Fails |
|-----------|---------|--------|-----------------|
| Pre-implementation | Before delegating to builder | Lead with `Skill('planner-protocol')` | Re-plan with constraints |
| Mid-implementation | Builder reports partial progress | reviewer (background) | Early feedback to builder |
| Post-implementation | Builder completes task | reviewer | NEEDS_CHANGES → re-delegate |
| Pre-merge | Worktree ready to merge | reviewer | Block merge if fails |
| Post-merge | After successful merge | reviewer (background) | Rollback if tests fail |

### Validation by Change Type

| Change Type | Required Validations |
|-------------|---------------------|
| Single file, low complexity | Post-implementation reviewer |
| Multi-file, same domain | Post-implementation reviewer |
| Multi-file, cross-domain | Mid-checkpoint + Post reviewer |
| Security-related | Pre + Post reviewer (security-review skill, model: opus) |
| Infrastructure/config | Pre + Post reviewer + manual approval |

### Reviewer Feedback Template

When sending reviewer feedback to builder, include:

| Field | Content |
|-------|---------|
| **Status** | APPROVED / NEEDS_CHANGES / BLOCKED |
| **Issues found** | List of specific problems |
| **Suggested fixes** | Concrete actions to resolve |
| **Files affected** | Files that need changes |
| **Priority** | Critical / Major / Minor |

**NEVER report "completed" without confirmation that tests are passing.**

## Retry Budget

| Error Type | Max Retries | Backoff | Then |
|------------|-------------|---------|------|
| Builder test failure | 2 | None | Lead diagnoses with `diagnostic-patterns` → SendMessage or re-spawn |
| Builder Edit conflict | 1 | Re-read file | Lead inspects, re-issues with updated context |
| Agent timeout | 1 | Double timeout | Escalate to user |
| Reviewer BLOCKED | 0 | — | Re-plan with `Skill('planner-protocol')` |
| Reviewer NEEDS_CHANGES | 2 | Apply feedback | Escalate to user |
| Worktree merge conflict | 1 | builder | Escalate to user |
| Teammate failure | 1 | Re-prompt with context | Extract domain → builder subagent |
| Teammate stuck (no progress) | 0 | — | Extract domain → builder subagent |
| Teammate file conflict | 0 | — | Lead resolves boundaries, re-assign |

## SendMessage vs Re-spawn

Use `SendMessage({to: agentId})` to continue a failed agent — preserves context, saves ~2K-5K tokens vs re-spawn.

| Situation | Method | Reason |
|-----------|--------|--------|
| Builder failed test | SendMessage | Builder already has code context |
| Builder failed due to stale edit | SendMessage | Re-read and retry in same context |
| Lead diagnosed a fix | SendMessage to original builder | Avoids re-exploring the codebase |
| Builder failed 2+ times | Re-spawn with full diagnosis | Original context may be contaminated |
| Error in a different agent | Re-spawn new agent | SendMessage does not cross agents |

### SendMessage Example

```
SendMessage({
  to: "builder-a3f8c2",
  message: "Test failed: TypeError at auth.ts:23. Diagnosis: null check missing on user object. Fix: add guard clause before user.id access. Do NOT remove existing tests."
})
```

> SendMessage auto-resumes agents stopped in background.

### Recovery Prompt Template (Re-spawn)

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
| Builder in worktree fails | Preserve worktree, Lead diagnoses with `diagnostic-patterns` |
| Lead identifies a fix | Retry builder in the SAME worktree via SendMessage |
| Retry fails | Delete worktree + branch, escalate to user |
| Merge conflict in worktree | Delegate to builder |
| Builder fails on merge | Preserve worktree, escalate to user with diff |

## Parallelization

### Wave PARALLEL Pattern

```
Wave PARALLEL = Agent(builder, T1) + Agent(builder, T2) + Agent(scout, T3) in the SAME assistant message.
Conditions: (a) no output→input dependencies, (b) disjoint files, (c) no shared state.
Do NOT parallelize: (a) builder uses planner output, (b) Edit on same file, (c) checkpoint review after writing.
```

### When to Parallelize vs Sequential

| Parallel (same message) | Sequential (wait for result) |
|-------------------------|------------------------------|
| scout + builder on different files | builder that needs scout output |
| 2+ builders on files without dependency | builder after the Lead's planning pass |
| 2+ reviewers on independent modules | reviewer after builder on same file |
| scout for two independent areas | any Task with data dependency |

### When to Use `run_in_background=true`

| Use | Do not use |
|-----|------------|
| reviewer that does not block next step | builder that produces files needed for next Task |
| exploratory scout when builder can start with known files | a Lead planning pass whose output is needed before delegating |
| audit reviewer in parallel with next feature | a Lead diagnosis whose result determines next action |

### Anti-Patterns

| NO | YES |
|----|-----|
| scout → wait → builder (no dependency) | scout + builder in parallel |
| builder A → wait → builder B (different files) | 2 builders in parallel |
| reviewer M1 → wait → reviewer M2 | 2 reviewers in background |
| Solo delegation message without stated dependency reason | batch with 2nd Task or state "waiting on X" |
| Inline reading >10 files instead of delegating to scout | delegate to scout, reserve Lead context |
| Lead (opus) doing simple parallel work inline | delegate batch of cheap-model agents (sub-clause A.1) |

**Self-check before EVERY delegation**: "Is there another independent Task I could batch here?" If not, state the reason inline ("solo delegation — waiting on scout before builder").

## Delegation Triggers

| Trigger | Threshold |
|---------|-----------|
| **A. Parallelization** | 2+ subtasks with NO data dependency between them |
| **B. Context preservation** | Task would require reading >10 files, >5 grep/glob queries, or processing >15K tokens of content inline |

When ANY trigger fires → delegate. When BOTH fire → batch in parallel (one message, multiple Agent calls).

| Guardrail | Rule |
|-----------|------|
| **Cost arbitrage (A.1)** | Complexity <30 + parallelizable → prefer haiku/sonnet agent batch over inline opus |
| **Coordination cost veto** | 2+ "parallel" tasks share >40% of context → use 1 agent |

## Hook Reliability (Issue #6305)

PreToolUse and PostToolUse hooks may silently fail to fire (known Claude Code bug, open issue #6305). Design validation accordingly:

| Hook type | Reliability | Use for |
|---|---|---|
| `Stop` | ✅ Reliable | Quality gate — currently security validation (`security-gate.ts`). Test verification is manual by the Lead after the builder report. |
| `UserPromptSubmit` | ✅ Reliable | Memory injection, routing hints |
| `SubagentStop` | ✅ Reliable | Agent scoring, memory insights |
| `PreToolUse` | ⚠️ Unreliable | Best-effort only — never sole gate for critical checks |
| `PostToolUse` | ⚠️ Unreliable | Best-effort only — never sole gate for critical checks |

**Implication**: `secrets-validator.ts` and `injection-validator.ts` (PostToolUse) are best-effort. The current Stop hook is `security-gate.ts` (async) — there is no automatic test-pass validator; the Lead is responsible for verifying tests after each builder report. Never rely solely on PostToolUse for security enforcement.
