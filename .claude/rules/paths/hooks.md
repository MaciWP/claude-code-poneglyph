---
globs:
  - ".claude/hooks/**"
priority: 15
---

## Hooks Context

Validation scripts executed by Claude Code at specific points in the workflow. Runtime and language depend on the project.

- Always exit 0 for best-effort hooks (Stop hooks)
- Use EXIT_CODES from validators/config (if it exists)
- Read stdin with readStdin() from config (if it exists)
- Handle errors gracefully — never block Claude Code
- Test with the project's test runner

### Gotcha: Shebangs on Windows / Reduced PATH

Claude Code executes hooks with a reduced PATH. **NEVER use `#!/usr/bin/env bash`** — `env` is not found.

| Shebang | Works | Alternative |
|---------|-------|-------------|
| `#!/usr/bin/env bash` | NO | `#!/bin/bash` (absolute path) |
| `#!/usr/bin/env bun` | YES | Poneglyph includes bun in PATH via settings.json |
| `#!/bin/bash` | YES | Absolute path, does not depend on env |

**Prefer `.ts` with bun** over `.sh` for hooks. If `.sh` is needed, use `#!/bin/bash`.

### Available Hook Events

| Event | When | Usage in Poneglyph |
|-------|------|--------------------|
| PreToolUse | Before tool | lead-enforcement, check-staleness |
| PostToolUse | After tool | format-code, validators, context |
| Stop | End of turn | trace-logger, validate-tests, session-digest |
| SubagentStop | End of subagent | agent-scoring |
| StopFailure | API error (rate limit, auth) | api-error-recorder |
| PermissionRequest | Claude requests permission | auto-approve |
| PostCompact | After compaction | post-compact |
| UserPromptSubmit | On prompt submit | memory-inject |

### `if` field for conditional filtering

In addition to `matcher`, `if` filters with permission rule syntax to avoid spawning a process unnecessarily:
```json
{"matcher": "Edit|Write", "if": "Edit(*.ts)|Write(*.ts)"}
```
