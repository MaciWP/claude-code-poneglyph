---
name: meta-create-hook
description: |
  Meta-skill for creating Claude Code hooks from standardized templates.
  Use proactively when: creating a new hook, automating tool validation, adding event handlers.
  Keywords - create hook, new hook, scaffold hook, event handler, automation, validator
type: encoded-preference
disable-model-invocation: true
argument-hint: "[hook-name] [event?]"
effort: medium
activation:
  keywords:
    - create hook
    - new hook
    - add hook
    - scaffold hook
    - event handler
for_agents: [extension-architect]
version: "1.0"
---

# Create Hook

Meta-skill for generating Claude Code hooks from standardized templates.

## When to Use

Activate this skill when:
- User requests creating a new hook
- Need for tool validation or automation
- Request for event-driven behavior (pre/post tool, stop, permissions)

## Official Documentation

Before generating, fetch the latest hook format:
`https://code.claude.com/docs/en/hooks.md`

## Workflow

### Step 1: Parse Arguments

Extract from `$ARGUMENTS`:

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `hook-name` | Yes | - | Name in kebab-case (e.g., `format-on-save`) |
| `event` | No | prompt user | Hook event from the reference table below |

### Step 2: Determine Event

If `event` was not provided, ask:

```
What event should trigger this hook?

| Cadence | Event | When It Fires |
|---------|-------|----------------|
| Per Session | SessionStart | Session begins |
| Per Session | SessionEnd | Session ends |
| Per Turn | UserPromptSubmit | User submits a prompt |
| Per Turn | Stop | Agent turn ends normally |
| Per Turn | StopFailure | Agent turn ends with API error |
| Per Tool Call | PreToolUse | Before a tool executes |
| Per Tool Call | PostToolUse | After a tool executes successfully |
| Per Tool Call | PostToolUseFailure | After a tool fails |
| Per Tool Call | PermissionRequest | Claude requests permission |
| Per Tool Call | PermissionDenied | User denies permission |
| Subagent | SubagentStart | Subagent spawns |
| Subagent | SubagentStop | Subagent completes |
| Tasks | TaskCreated | Task is created |
| Tasks | TaskCompleted | Task is completed |
| Teams | TeammateIdle | Teammate has nothing to do |
| Config | InstructionsLoaded | Instructions/rules loaded |
| Config | ConfigChange | Settings changed |
| Filesystem | CwdChanged | Working directory changed |
| Filesystem | FileChanged | Watched file modified |
| Worktree | WorktreeCreate | Git worktree created |
| Worktree | WorktreeRemove | Git worktree removed |
| Context | PreCompact | Before context compaction |
| Context | PostCompact | After context compaction |
| UI | Elicitation | Claude asks the user a question |
| UI | ElicitationResult | User answers the question |
| System | Notification | System notification |
```

### Step 3: Determine Handler Type

Ask the user:

```
What handler type should this hook use?

| Type | Use Case | Typical |
|------|----------|---------|
| command | Shell scripts (.ts, .sh) — 95% of hooks | Validators, loggers, formatters |
| http | External webhook call | Slack notifications, CI triggers |
| prompt | LLM-generated decision (Claude evaluates) | Complex policy checks |
| agent | Autonomous sub-agent (full Claude instance) | Deep analysis on events |
```

### Step 4: Gather Hook Details

Ask the user based on the handler type:

**For command hooks:**
```
Hook behavior details:
- Purpose: (e.g., validate imports, format code, log metrics)
- Blocking: Should it block on failure? (yes = exit 2 blocks, no = best-effort)
- Async: Fire-and-forget? (yes = stdout/exit code ignored, no = synchronous)
- Matcher: Tool pattern filter (e.g., "Edit|Write", "*", "Bash")
- If filter: Permission rule syntax (e.g., "Edit(*.ts)|Write(*.ts)")
```

**For http hooks:**
```
Webhook details:
- URL: Target endpoint
- Headers: Required headers (use env vars for secrets)
- Allowed env vars: Which env vars to pass
- Timeout: Max seconds to wait (default: 30)
```

**For prompt hooks:**
```
Prompt hook details:
- Prompt: What should Claude evaluate? (use $ARGUMENTS for input)
- Model: Which model? (haiku for cheap checks, sonnet for nuanced)
- Timeout: Max seconds (default: 30)
```

**For agent hooks:**
```
Agent hook details:
- Prompt: Task description for the sub-agent
- Model: Which model? (sonnet or opus)
- Timeout: Max seconds (default: 60)
```

### Step 5: Generate Hook Files

1. Generate the hook script using the appropriate template from the Templates section
2. Generate the `settings.json` entry for registration
3. Write script to `.claude/hooks/{hook-name}.ts` (command) or configure in settings
4. Update `settings.json` with the hook registration

### Step 6: Confirm Creation

```
## Hook Created

**Name**: {hook-name}
**Event**: {event}
**Location**: .claude/hooks/{hook-name}.ts

### Configuration
| Field | Value |
|-------|-------|
| Handler | {type} |
| Event | {event} |
| Blocking | {yes/no} |
| Async | {yes/no} |
| Matcher | {matcher} |

### settings.json Entry
{Show the exact JSON to add}

### Next Steps
1. Implement hook logic in the script
2. Add the settings.json entry to your project or global settings
3. Test with: `echo '{"tool_name":"Edit"}' | bun run .claude/hooks/{hook-name}.ts`
```

---

## Hook Events Reference

Complete list of all Claude Code hook events (April 2026), grouped by cadence.

### Per Session

| Event | When | Stdin Shape | Common Use |
|-------|------|-------------|------------|
| `SessionStart` | Session begins | `{ session_id }` | Initialize state, setup logging |
| `SessionEnd` | Session ends | `{ session_id, transcript }` | Cleanup, final report |

### Per Turn

| Event | When | Stdin Shape | Common Use |
|-------|------|-------------|------------|
| `UserPromptSubmit` | User submits prompt | `{ session_id, prompt }` | Memory injection, prompt transform |
| `Stop` | Turn ends normally | `{ session_id, last_assistant_message, transcript, stop_hook_active }` | Trace logging, test validation, digest |
| `StopFailure` | API error (rate limit, auth) | `{ session_id, error, transcript_path }` | Error recording, alerting |

### Per Tool Call

| Event | When | Stdin Shape | Common Use |
|-------|------|-------------|------------|
| `PreToolUse` | Before tool executes | `{ session_id, tool_name, tool_input }` | Validation, blocking, enforcement |
| `PostToolUse` | After tool succeeds | `{ session_id, tool_name, tool_input, tool_output }` | Formatting, context tracking, metrics |
| `PostToolUseFailure` | After tool fails | `{ session_id, tool_name, tool_input, error }` | Error tracking, retry logic |
| `PermissionRequest` | Claude requests permission | `{ session_id, tool_name, tool_input }` | Auto-approve, custom policies |
| `PermissionDenied` | User denies permission | `{ session_id, tool_name, tool_input }` | Analytics, UX feedback |

### Subagent Lifecycle

| Event | When | Stdin Shape | Common Use |
|-------|------|-------------|------------|
| `SubagentStart` | Subagent spawns | `{ session_id, agent_type, agent_id }` | Logging, resource tracking |
| `SubagentStop` | Subagent completes | `{ session_id, agent_type, agent_id, result, transcript }` | Scoring, expertise extraction |

### Task Management

| Event | When | Stdin Shape | Common Use |
|-------|------|-------------|------------|
| `TaskCreated` | Task created | `{ session_id, task }` | Task tracking, notifications |
| `TaskCompleted` | Task completed | `{ session_id, task, result }` | Progress tracking, chaining |

### Team Coordination

| Event | When | Stdin Shape | Common Use |
|-------|------|-------------|------------|
| `TeammateIdle` | Teammate has no work | `{ session_id, teammate_id }` | Load balancing, reassignment |

### Configuration

| Event | When | Stdin Shape | Common Use |
|-------|------|-------------|------------|
| `InstructionsLoaded` | Instructions/rules loaded | `{ session_id, instructions }` | Validation, override injection |
| `ConfigChange` | Settings changed | `{ session_id, config }` | React to config updates |

### Filesystem

| Event | When | Stdin Shape | Common Use |
|-------|------|-------------|------------|
| `CwdChanged` | Working directory changed | `{ session_id, old_cwd, new_cwd }` | Context switch, project detection |
| `FileChanged` | Watched file modified | `{ session_id, file_path }` | Hot reload, re-validation |

### Worktree

| Event | When | Stdin Shape | Common Use |
|-------|------|-------------|------------|
| `WorktreeCreate` | Git worktree created | `{ session_id, worktree_path, branch }` | Resource tracking |
| `WorktreeRemove` | Git worktree removed | `{ session_id, worktree_path }` | Cleanup verification |

### Context Management

| Event | When | Stdin Shape | Common Use |
|-------|------|-------------|------------|
| `PreCompact` | Before context compaction | `{ session_id, context_size }` | Save critical state |
| `PostCompact` | After context compaction | `{ session_id, context_size, compacted_size }` | Restore state, inject summaries |

### UI Interaction

| Event | When | Stdin Shape | Common Use |
|-------|------|-------------|------------|
| `Elicitation` | Claude asks user a question | `{ session_id, question }` | Auto-answer, logging |
| `ElicitationResult` | User answers | `{ session_id, question, answer }` | Preference learning |

### System

| Event | When | Stdin Shape | Common Use |
|-------|------|-------------|------------|
| `Notification` | System notification | `{ session_id, notification }` | Forwarding, filtering |

---

## Handler Types

| Type | Fields | Blocking | Async Support | Use Case |
|------|--------|----------|---------------|----------|
| `command` | `command`, `async`, `shell`, `timeout` | Yes (exit 2) | Yes | Shell scripts, TypeScript with bun |
| `http` | `url`, `headers`, `allowedEnvVars`, `timeout` | No | Inherently | External webhooks |
| `prompt` | `prompt`, `model`, `timeout` | Yes | No | LLM-evaluated policy checks |
| `agent` | `prompt`, `model`, `timeout` | Yes | No | Autonomous sub-agent decisions |

---

## Templates

### Template: Command Hook (Observability)

For async, non-blocking hooks (trace-logger, metrics, scoring):

```typescript
#!/usr/bin/env bun
// {hook-name} - {description}
// Event: {event} | Async: true | Blocking: No

import { appendFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

interface HookInput {
  session_id?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_output?: string;
  last_assistant_message?: string;
  transcript?: Array<{ role: string; content: unknown }>;
  stop_hook_active?: boolean;
}

async function main(): Promise<void> {
  const raw = await Bun.stdin.text();
  const input: HookInput = JSON.parse(raw || "{}");

  // GUARD: prevent infinite loops in Stop/SubagentStop hooks
  // Uncomment if this hook is for Stop or SubagentStop event:
  // if (input.stop_hook_active) process.exit(0);

  // --- Hook logic starts here ---

  const logDir = join(homedir(), ".claude", "logs");
  mkdirSync(logDir, { recursive: true });

  const entry = {
    ts: new Date().toISOString(),
    sessionId: input.session_id ?? null,
    // Add your fields here
  };

  const logFile = join(logDir, `${new Date().toISOString().slice(0, 10)}.jsonl`);
  appendFileSync(logFile, JSON.stringify(entry) + "\n");
}

main().catch(() => process.exit(0)); // Best-effort: never block Claude
```

### Template: Command Hook (Validator)

For blocking hooks that enforce rules (PreToolUse, PermissionRequest):

```typescript
#!/usr/bin/env bun
// {hook-name} - {description}
// Event: {event} | Blocking: Yes (exit 2 to block)

interface HookInput {
  session_id?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
}

function main(): void {
  const raw = require("fs").readFileSync("/dev/stdin", "utf-8");
  const input: HookInput = JSON.parse(raw || "{}");

  const toolName = input.tool_name ?? "";
  const toolInput = input.tool_input ?? {};

  // --- Validation logic starts here ---
  const isValid = true; // Replace with actual check

  if (!isValid) {
    // stderr message is shown to the user as a warning
    console.error("Blocked: {reason}");
    process.exit(2); // Block the tool call
  }

  // Optional: return JSON to modify behavior or add context
  // console.log(JSON.stringify({
  //   hookSpecificOutput: { additionalContext: "..." }
  // }));

  process.exit(0);
}

main();
```

### Template: Command Hook (Transform)

For hooks that modify tool input/output (PostToolUse formatters, UserPromptSubmit enrichers):

```typescript
#!/usr/bin/env bun
// {hook-name} - {description}
// Event: {event} | Blocking: No | Transforms output

interface HookInput {
  session_id?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_output?: string;
}

async function main(): Promise<void> {
  const raw = await Bun.stdin.text();
  const input: HookInput = JSON.parse(raw || "{}");

  // --- Transform logic starts here ---

  // Return JSON on stdout to pass data back to Claude
  const output = {
    hookSpecificOutput: {
      // Fields here are merged into the hook result
      additionalContext: "Transformed by {hook-name}",
    },
  };

  console.log(JSON.stringify(output));
  process.exit(0);
}

main().catch(() => process.exit(0));
```

### Template: HTTP Hook

For external webhook integrations:

```json
{
  "type": "http",
  "url": "https://your-api.example.com/webhook/{event}",
  "headers": {
    "Authorization": "Bearer ${API_KEY}",
    "Content-Type": "application/json"
  },
  "allowedEnvVars": ["API_KEY"],
  "timeout": 30
}
```

### Template: Prompt Hook

For LLM-evaluated policy decisions:

```json
{
  "type": "prompt",
  "prompt": "Review the following tool call and decide if it should proceed. If it should NOT proceed, respond with BLOCK and a reason. If it should proceed, respond with ALLOW.\n\nTool: $ARGUMENTS",
  "model": "haiku",
  "timeout": 30
}
```

### Template: Agent Hook

For autonomous sub-agent decisions on events:

```json
{
  "type": "agent",
  "prompt": "Analyze the following event and take appropriate action: $ARGUMENTS",
  "model": "sonnet",
  "timeout": 60
}
```

---

## Settings.json Entry Template

The EXACT JSON structure for registering hooks in `settings.json`:

### Single Hook on an Event

```json
{
  "hooks": {
    "{EVENT}": [
      {
        "matcher": "{TOOL_OR_PATTERN}",
        "if": "{PERMISSION_RULE_SYNTAX}",
        "hooks": [
          {
            "type": "command",
            "command": "bun run $HOME/.claude/hooks/{hook-name}.ts",
            "timeout": 600,
            "async": false
          }
        ]
      }
    ]
  }
}
```

### Multiple Hooks on the Same Event

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "bun run $HOME/.claude/hooks/format-code.ts",
            "timeout": 30
          }
        ]
      },
      {
        "matcher": "Read",
        "hooks": [
          {
            "type": "command",
            "command": "bun run $HOME/.claude/hooks/record-read.ts",
            "timeout": 10,
            "async": true
          }
        ]
      }
    ]
  }
}
```

### Hook with `if` Filter

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "if": "Bash(rm *)|Bash(git push --force*)",
        "hooks": [
          {
            "type": "command",
            "command": "bun run $HOME/.claude/hooks/block-dangerous.ts"
          }
        ]
      }
    ]
  }
}
```

---

## Matcher and `if` Field

### Matcher Evaluation Rules

| Matcher Value | Evaluated As | Example |
|---------------|-------------|---------|
| `"*"`, `""`, or omitted | Match ALL tool calls | Catch-all hooks |
| Only letters/digits/`_`/`\|` | Exact match or `\|`-separated list | `"Edit\|Write"` matches Edit or Write |
| Contains any other char | JavaScript regex | `"mcp__.*__query"` matches MCP tools |

### `if` Field (Permission Rule Syntax)

The `if` field provides fine-grained filtering beyond the matcher:

| `if` Value | Matches | Use Case |
|------------|---------|----------|
| `"Bash(git *)"` | Only git commands in Bash | Git-specific hooks |
| `"Edit(*.ts)\|Write(*.ts)"` | Only TypeScript file edits | Language-specific formatting |
| `"Bash(rm -rf *)"` | Only destructive rm commands | Safety checks |
| `"Edit(src/auth/*)"` | Only edits in auth directory | Domain-scoped validation |

### MCP Tool Matching

MCP (Model Context Protocol) tools follow the pattern `mcp__<server>__<tool>`:

| Pattern | Matches |
|---------|---------|
| `"mcp__memory__.*"` | All tools from the "memory" MCP server |
| `"mcp__.*__query"` | Any MCP server's "query" tool |
| `"mcp__github__create_issue"` | Specific MCP tool |

---

## Exit Code Protocol

| Code | Meaning | When | Stdout |
|------|---------|------|--------|
| `0` | Success | Hook completed normally | Parsed as JSON if valid |
| `2` | Block | Blocking events only (PreToolUse, PermissionRequest) | Ignored |
| Other | Non-blocking error | Any event | Ignored, stderr shown as warning |

### Stdout JSON Protocol

When a hook exits 0 and writes JSON to stdout, Claude Code parses it:

```typescript
interface HookOutput {
  // Merged into the hook result, available to Claude
  hookSpecificOutput?: {
    additionalContext?: string;  // Extra context for Claude
    [key: string]: unknown;
  };
  // For PermissionRequest hooks only
  decision?: "allow" | "deny";
}
```

---

## Gotchas

Critical pitfalls when creating hooks. Read these BEFORE writing any hook.

| # | Gotcha | Detail | Fix |
|---|--------|--------|-----|
| 1 | **Shebang on Windows** | `#!/usr/bin/env bash` fails — Claude Code runs with reduced PATH where `env` is not found | Use `#!/bin/bash` (absolute) or prefer `.ts` with `#!/usr/bin/env bun` (bun is in PATH via settings.json) |
| 2 | **stop_hook_active guard** | Stop and SubagentStop hooks that exit 2 create INFINITE LOOPS — Claude retries the stop, hook blocks again, forever | Check `if (input.stop_hook_active) process.exit(0);` at the top of every Stop/SubagentStop hook |
| 3 | **async: true ignores everything** | When `async: true`, exit codes AND stdout are completely ignored — fire-and-forget | Only use `async: true` for observability hooks (logging, metrics). Never for validators or transforms |
| 4 | **stdin is single-read** | `readStdin()` or `Bun.stdin.text()` can only be called ONCE per process. Second read returns empty | Read stdin into a variable once at the top, reuse the variable |
| 5 | **$HOME in settings.json** | Use `$HOME/.claude/hooks/` for global hooks. Relative paths resolve from the PROJECT cwd, not from `~/.claude/` | Always use `$HOME` prefix for hooks in global settings.json |
| 6 | **Timeout defaults** | `command`: 600s, `prompt`: 30s, `agent`: 60s — exceeding timeout kills the hook silently | Set explicit timeout matching your hook's expected duration |
| 7 | **MCP tool names** | MCP tools use `mcp__<server>__<tool>` pattern, not plain names | Use regex matcher: `"mcp__memory__.*"` |
| 8 | **once: true** | Available in skill/agent frontmatter hooks — runs only once per session, NOT in settings.json hooks | Use only in frontmatter-scoped hooks |
| 9 | **Hook ordering** | Multiple hooks on the same event run IN ORDER of the array in settings.json | Place blocking validators before async loggers |
| 10 | **Bun.stdin vs readFileSync** | `Bun.stdin.text()` is async and preferred. `readFileSync("/dev/stdin")` is sync but works. Do NOT mix both | Pick one approach per hook and stick with it |
| 11 | **Exit 2 only blocks on specific events** | Exit 2 only blocks on PreToolUse and PermissionRequest. On other events, exit 2 is treated as an error | Only use exit 2 for PreToolUse and PermissionRequest hooks |
| 12 | **Global vs project hooks** | Global hooks (`~/.claude/settings.json`) run for ALL projects. Project hooks (`.claude/settings.json`) are project-scoped | Put general-purpose hooks in global, project-specific in local |

---

## Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `hook-name` | Yes | - | kebab-case name for the hook (e.g., `format-on-save`) |
| `event` | No | prompt user | Hook event from the reference table above |

### Validation Rules

| Rule | Check | Error Message |
|------|-------|---------------|
| Name format | Must be kebab-case | "Hook name must be kebab-case (e.g., format-on-save)" |
| Name unique | No existing file at path | "Hook {name} already exists at .claude/hooks/{name}.ts" |
| Event valid | One of the documented events | "Event must be one of: PreToolUse, PostToolUse, Stop, ..." |

---

## Examples

### Example 1: Format Code on Edit

**PostToolUse** / command / async

```
/meta-create-hook format-on-edit PostToolUse
```

**Creates**: `.claude/hooks/format-on-edit.ts`

```typescript
#!/usr/bin/env bun
// format-on-edit - Auto-format TypeScript files after Edit/Write
// Event: PostToolUse | Async: true | Blocking: No

import { execSync } from "node:child_process";

interface HookInput {
  tool_name?: string;
  tool_input?: { file_path?: string };
}

async function main(): Promise<void> {
  const input: HookInput = JSON.parse(await Bun.stdin.text() || "{}");
  const tool = input.tool_name ?? "";
  const filePath = input.tool_input?.file_path ?? "";

  if (!["Edit", "Write"].includes(tool)) process.exit(0);
  if (!filePath.endsWith(".ts") && !filePath.endsWith(".tsx")) process.exit(0);

  try {
    execSync(`bunx biome format --write "${filePath}"`, {
      timeout: 10_000,
      stdio: "ignore",
    });
  } catch {
    // Best-effort: formatting failure should never block
  }
}

main().catch(() => process.exit(0));
```

**settings.json entry**:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "if": "Edit(*.ts)|Edit(*.tsx)|Write(*.ts)|Write(*.tsx)",
        "hooks": [
          {
            "type": "command",
            "command": "bun run $HOME/.claude/hooks/format-on-edit.ts",
            "timeout": 15,
            "async": true
          }
        ]
      }
    ]
  }
}
```

---

### Example 2: Block Dangerous Commands

**PreToolUse** / command / blocking

```
/meta-create-hook block-dangerous PreToolUse
```

**Creates**: `.claude/hooks/block-dangerous.ts`

```typescript
#!/usr/bin/env bun
// block-dangerous - Blocks destructive shell commands
// Event: PreToolUse | Blocking: Yes (exit 2 to block)

interface HookInput {
  tool_name?: string;
  tool_input?: { command?: string };
}

const BLOCKED_PATTERNS: RegExp[] = [
  /rm\s+(-rf?|--recursive)\s+\/(?!\S)/,  // rm -rf /
  /git\s+push\s+--force\s+(origin\s+)?(main|master)/,  // force push to main
  /git\s+reset\s+--hard\s+HEAD~?\d*/,  // destructive reset
  /DROP\s+(TABLE|DATABASE)/i,  // SQL drops
  /:\(\)\s*\{\s*:\|:\s*&\s*\}\s*;/,  // fork bomb
];

function main(): void {
  const raw = require("fs").readFileSync("/dev/stdin", "utf-8");
  const input: HookInput = JSON.parse(raw || "{}");

  if (input.tool_name !== "Bash") process.exit(0);

  const command = input.tool_input?.command ?? "";

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      console.error(`Blocked dangerous command: ${command.slice(0, 80)}`);
      process.exit(2);
    }
  }

  process.exit(0);
}

main();
```

**settings.json entry**:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bun run $HOME/.claude/hooks/block-dangerous.ts",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

---

### Example 3: Log API Errors

**StopFailure** / command / async

```
/meta-create-hook log-api-errors StopFailure
```

**Creates**: `.claude/hooks/log-api-errors.ts`

```typescript
#!/usr/bin/env bun
// log-api-errors - Records API errors to JSONL for analysis
// Event: StopFailure | Async: true | Blocking: No

import { appendFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

interface HookInput {
  session_id?: string;
  error?: string | { message: string };
  transcript_path?: string;
}

async function main(): Promise<void> {
  const input: HookInput = JSON.parse(await Bun.stdin.text() || "{}");

  const errorMsg =
    typeof input.error === "string"
      ? input.error
      : input.error?.message ?? "unknown";

  const logDir = join(homedir(), ".claude", "error-logs");
  mkdirSync(logDir, { recursive: true });

  const entry = {
    ts: new Date().toISOString(),
    sessionId: input.session_id ?? null,
    error: errorMsg,
    transcriptPath: input.transcript_path ?? null,
  };

  const logFile = join(logDir, `${new Date().toISOString().slice(0, 10)}.jsonl`);
  appendFileSync(logFile, JSON.stringify(entry) + "\n");
}

main().catch(() => process.exit(0));
```

**settings.json entry**:
```json
{
  "hooks": {
    "StopFailure": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun run $HOME/.claude/hooks/log-api-errors.ts",
            "timeout": 10,
            "async": true
          }
        ]
      }
    ]
  }
}
```

---

## Frontmatter Reference (settings.json)

Complete table of ALL JSON fields for hook configuration in `settings.json`:

### Hook Entry Fields (inside the event array)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `matcher` | string | No | Tool name pattern. `"*"` or omitted = match all. Pipe-separated or regex |
| `if` | string | No | Permission rule syntax for fine-grained filtering |
| `hooks` | array | Yes | Array of handler objects |

### Handler Fields (inside the `hooks` array)

| Field | Type | For Types | Required | Default | Description |
|-------|------|-----------|----------|---------|-------------|
| `type` | string | All | Yes | - | `"command"`, `"http"`, `"prompt"`, `"agent"` |
| `command` | string | command | Yes* | - | Shell command to execute |
| `url` | string | http | Yes* | - | Webhook URL |
| `prompt` | string | prompt, agent | Yes* | - | LLM prompt (`$ARGUMENTS` for input) |
| `model` | string | prompt, agent | No | varies | Model for LLM evaluation |
| `headers` | object | http | No | `{}` | HTTP headers (use `${ENV_VAR}` for secrets) |
| `allowedEnvVars` | string[] | http | No | `[]` | Environment variables passed to the request |
| `async` | boolean | command | No | `false` | Fire-and-forget (stdout/exit ignored) |
| `shell` | string | command | No | system default | Shell to use (e.g., `"bash"`, `"zsh"`) |
| `timeout` | number | All | No | varies | Seconds before kill: command=600, prompt=30, agent=60 |
| `statusMessage` | string | All | No | - | Message shown in UI while hook runs |
| `once` | boolean | frontmatter only | No | `false` | Run only once per session (NOT in settings.json) |

---

## Directory Structure

```
.claude/hooks/
├── {hook-name}.ts              # Hook scripts
├── {hook-name}.test.ts         # Tests for the hook
├── lib/                        # Shared utilities
│   ├── trace-extract.ts        # Transcript parsing
│   ├── trace-metrics.ts        # Cost/token calculation
│   └── error-patterns.ts       # Error pattern matching
└── validators/                 # Grouped validators
    ├── config.ts               # Shared config (exit codes, readStdin)
    ├── security/               # Security validators
    ├── code-quality/           # Quality validators
    ├── format/                 # Format validators
    ├── context/                # Context tracking
    └── stop/                   # Stop validators
```

---

## Testing Hooks

| Method | Command | When |
|--------|---------|------|
| Unit test | `bun test .claude/hooks/{hook-name}.test.ts` | After implementation |
| Manual stdin | `echo '{"tool_name":"Edit","tool_input":{}}' \| bun run .claude/hooks/{hook-name}.ts` | Quick validation |
| Dry run | Set `HOOK_DRY_RUN=1` env var (if supported) | Pre-deploy check |
| Integration | Trigger the event in Claude Code and check behavior | Final verification |

---

## Related

- `/meta-create-agent`: Create subagents
- `/meta-create-skill`: Create skills
- `extension-architect`: Meta-agent managing all extensions
- `.claude/rules/paths/hooks.md`: Hook-specific path rules
