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
| PostToolUse | After tool | Unreliable (#6305) | — (none registered; `code-validator.ts` cut 2026-08-05/030: fail-closed on an unreliable event; secrets covered by Stop gate) |
| Stop | End of turn | Reliable | `security-gate.ts` — quality gate (secret warn + **git-discipline warn on unasked git mutations, 029/US4** — both dual-channel: systemMessage to user + additionalContext to the model). `learning-inbox.ts` cut 2026-08-05/030 (4 entries/6 weeks, half noise) |
| UserPromptSubmit | On prompt submit | Reliable as event (gap early-session/post-compaction, #17277) | `skill-activation.ts` — injects `Skill(<name>)` on keyword match + `/flow` line on feature-shaped prompts + shape-only model/effort hint, and logs every emitted hint to `<cwd>/.claude/learned/skill-hints.log` (honor-rate emit side, 029/US13); best-effort layer. Skips slash commands EXCEPT `/goal <task>` (its arg is real work — processed since 023, tests T2.2) |
| InstructionsLoaded | On instruction load | Reliable as event | `instructions-loaded.ts` (async) — logs every CLAUDE.md/rules load (load-layer proof) |
| SessionStart | On every session start (incl. resume/clear) | Reliable as event | `session-start-plans.ts` — open-plans reminder on EVERY session (027/US1; post-compact's copy only fires after a compaction). Silent when 0 open |
| SubagentStop | End of subagent | Reliable as event | — (none registered) |
| StopFailure | API error (rate limit, auth) | — | — |
| PermissionRequest | Claude requests permission | — | auto-approve |
| PostCompact | After compaction | — | post-compact |
| MessageDisplay | Assistant text about to render | — | — (can transform/hide assistant message text, CC ≥2.1.152) |

There is no automatic test-pass validator — the Lead verifies tests manually after each build step (Stop test-gate declined, 017/US4). Never rely solely on PostToolUse for security enforcement.

> **Stop / SubagentStop feedback** (CC ≥2.1.163): both can return `hookSpecificOutput.additionalContext` to feed Claude and keep the turn going without being flagged a hook error. The security gate uses BOTH channels since 028/US4: `systemMessage` for the user + `additionalContext` instructing the model to verify/redact in-turn.

### `if` field for conditional filtering

```json
{"matcher": "Edit|Write", "if": "Edit(*.ts)|Write(*.ts)"}
```
