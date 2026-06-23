---
paths:
  - ".claude/hooks/**"
---

<!-- Last verified: 2026-06-19 -->

## Hooks Context

### Shebang Gotcha (Windows / Reduced PATH)

| Shebang | Works | Alternative |
|---------|-------|-------------|
| `#!/usr/bin/env bash` | NO | `#!/bin/bash` (absolute path) |
| `#!/usr/bin/env bun` | YES | Poneglyph includes bun in PATH via settings.json |
| `#!/bin/bash` | YES | Absolute path, does not depend on env |

**Prefer `.ts` with bun** over `.sh`. If `.sh` is needed, use `#!/bin/bash`.

### Available Hook Events + reliability

Reliability matters because PreToolUse/PostToolUse may silently fail to fire (open issue #6305) — never use them as the *sole* gate for a critical check.

| Event | When | Reliability | Usage in Poneglyph |
|-------|------|-------------|--------------------|
| PreToolUse | Before tool | Unreliable (#6305) | — (none registered) — best-effort only |
| PostToolUse | After tool | Unreliable (#6305) | `code-validator.ts` — best-effort only |
| Stop | End of turn | Reliable | `security-gate.ts` + `learning-inbox.ts` — quality gate (security warn + learning capture) |
| UserPromptSubmit | On prompt submit | Reliable as event (gap early-session/post-compaction, #17277) | `skill-activation.ts` — injects `Skill(<name>)` on keyword match; best-effort layer. Skips ALL slash commands (incl. `/goal` — it runs as the Lead, which has the always-loaded routing core and can invoke `Skill()` itself; no injected hint needed) |
| InstructionsLoaded | On instruction load | Reliable as event | `instructions-loaded.ts` (async) — logs every CLAUDE.md/rules load (load-layer proof) |
| SubagentStop | End of subagent | Reliable as event | — (none registered) |
| StopFailure | API error (rate limit, auth) | — | — |
| PermissionRequest | Claude requests permission | — | auto-approve |
| PostCompact | After compaction | — | post-compact |
| MessageDisplay | Assistant text about to render | — | — (can transform/hide assistant message text, CC ≥2.1.152) |

There is no automatic test-pass validator — the Lead verifies tests manually after each build step (Stop test-gate declined, 017/US4). Never rely solely on PostToolUse for security enforcement.

> **Stop / SubagentStop feedback** (CC ≥2.1.163): both can return `hookSpecificOutput.additionalContext` to feed Claude and keep the turn going without being flagged a hook error — an alternative to the warn-only `systemMessage` the Stop gate uses today.

### `if` field for conditional filtering

```json
{"matcher": "Edit|Write", "if": "Edit(*.ts)|Write(*.ts)"}
```
