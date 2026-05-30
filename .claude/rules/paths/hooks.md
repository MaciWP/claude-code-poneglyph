---
globs:
  - ".claude/hooks/**"
priority: 15
---

<!-- Last verified: 2026-05-30 -->

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
| PreToolUse | Before tool | — (none registered) |
| PostToolUse | After tool | code-validator |
| Stop | End of turn | security-gate |
| SubagentStop | End of subagent | — |
| StopFailure | API error (rate limit, auth) | — |
| PermissionRequest | Claude requests permission | auto-approve |
| PostCompact | After compaction | post-compact |
| UserPromptSubmit | On prompt submit | — (none registered) |

### `if` field for conditional filtering

```json
{"matcher": "Edit|Write", "if": "Edit(*.ts)|Write(*.ts)"}
```
