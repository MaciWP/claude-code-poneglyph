---
parent: meta-create-hook
name: events-catalog
description: Complete catalog of all Claude Code hook events grouped by cadence, with stdin shapes.
---

# Hook Events Catalog

Complete list of all Claude Code hook events (April 2026), grouped by cadence. Each entry shows the stdin shape and common use cases.

## Per Session

| Event | When | Stdin Shape | Common Use |
|-------|------|-------------|------------|
| `SessionStart` | Session begins | `{ session_id }` | Initialize state, setup logging |
| `SessionEnd` | Session ends | `{ session_id, transcript }` | Cleanup, final report |

## Per Turn

| Event | When | Stdin Shape | Common Use |
|-------|------|-------------|------------|
| `UserPromptSubmit` | User submits prompt | `{ session_id, prompt }` | Memory injection, prompt transform |
| `Stop` | Turn ends normally | `{ session_id, last_assistant_message, transcript, stop_hook_active }` | Trace logging, test validation, digest |
| `StopFailure` | API error (rate limit, auth) | `{ session_id, error, transcript_path }` | Error recording, alerting |

## Per Tool Call

| Event | When | Stdin Shape | Common Use |
|-------|------|-------------|------------|
| `PreToolUse` | Before tool executes | `{ session_id, tool_name, tool_input }` | Validation, blocking, enforcement |
| `PostToolUse` | After tool succeeds | `{ session_id, tool_name, tool_input, tool_output }` | Formatting, context tracking, metrics |
| `PostToolUseFailure` | After tool fails | `{ session_id, tool_name, tool_input, error }` | Error tracking, retry logic |
| `PermissionRequest` | Claude requests permission | `{ session_id, tool_name, tool_input }` | Auto-approve, custom policies |
| `PermissionDenied` | User denies permission | `{ session_id, tool_name, tool_input }` | Analytics, UX feedback |

## Subagent Lifecycle

| Event | When | Stdin Shape | Common Use |
|-------|------|-------------|------------|
| `SubagentStart` | Subagent spawns | `{ session_id, agent_type, agent_id }` | Logging, resource tracking |
| `SubagentStop` | Subagent completes | `{ session_id, agent_type, agent_id, result, transcript }` | Scoring, expertise extraction |

## Task Management

| Event | When | Stdin Shape | Common Use |
|-------|------|-------------|------------|
| `TaskCreated` | Task created | `{ session_id, task }` | Task tracking, notifications |
| `TaskCompleted` | Task completed | `{ session_id, task, result }` | Progress tracking, chaining |

## Team Coordination

| Event | When | Stdin Shape | Common Use |
|-------|------|-------------|------------|
| `TeammateIdle` | Teammate has no work | `{ session_id, teammate_id }` | Load balancing, reassignment |

## Configuration

| Event | When | Stdin Shape | Common Use |
|-------|------|-------------|------------|
| `InstructionsLoaded` | Instructions/rules loaded | `{ session_id, instructions }` | Validation, override injection |
| `ConfigChange` | Settings changed | `{ session_id, config }` | React to config updates |

## Filesystem

| Event | When | Stdin Shape | Common Use |
|-------|------|-------------|------------|
| `CwdChanged` | Working directory changed | `{ session_id, old_cwd, new_cwd }` | Context switch, project detection |
| `FileChanged` | Watched file modified | `{ session_id, file_path }` | Hot reload, re-validation |

## Worktree

| Event | When | Stdin Shape | Common Use |
|-------|------|-------------|------------|
| `WorktreeCreate` | Git worktree created | `{ session_id, worktree_path, branch }` | Resource tracking |
| `WorktreeRemove` | Git worktree removed | `{ session_id, worktree_path }` | Cleanup verification |

## Context Management

| Event | When | Stdin Shape | Common Use |
|-------|------|-------------|------------|
| `PreCompact` | Before context compaction | `{ session_id, context_size }` | Save critical state |
| `PostCompact` | After context compaction | `{ session_id, context_size, compacted_size }` | Restore state, inject summaries |

## UI Interaction

| Event | When | Stdin Shape | Common Use |
|-------|------|-------------|------------|
| `Elicitation` | Claude asks user a question | `{ session_id, question }` | Auto-answer, logging |
| `ElicitationResult` | User answers | `{ session_id, question, answer }` | Preference learning |

## System

| Event | When | Stdin Shape | Common Use |
|-------|------|-------------|------------|
| `Notification` | System notification | `{ session_id, notification }` | Forwarding, filtering |
