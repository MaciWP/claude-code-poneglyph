---
globs:
  - ".claude/hooks/**"
priority: 15
---

<!-- Last verified: 2026-04-25 -->

## Hooks Context

### Shebang Gotcha (Windows / Reduced PATH)

| Shebang | Works | Alternative |
|---------|-------|-------------|
| `#!/usr/bin/env bash` | NO | `#!/bin/bash` (absolute path) |
| `#!/usr/bin/env bun` | YES | Poneglyph includes bun in PATH via settings.json |
| `#!/bin/bash` | YES | Absolute path, does not depend on env |

**Prefer `.ts` with bun** over `.sh`. If `.sh` is needed, use `#!/bin/bash`.

### Available Hook Events

| Event | When | Usage in Poneglyph |
|-------|------|--------------------|
| PreToolUse | Before tool | lead-enforcement, check-staleness |
| PostToolUse | After tool | validators, context |
| Stop | End of turn | trace-logger, validate-tests, session-digest |
| SubagentStop | End of subagent | agent-scoring |
| StopFailure | API error (rate limit, auth) | api-error-recorder |
| PermissionRequest | Claude requests permission | auto-approve |
| PostCompact | After compaction | post-compact |
| UserPromptSubmit | On prompt submit | memory-inject |

### `if` field for conditional filtering

```json
{"matcher": "Edit|Write", "if": "Edit(*.ts)|Write(*.ts)"}
```
