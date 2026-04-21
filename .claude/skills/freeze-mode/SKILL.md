---
name: freeze-mode
description: |
  Activate read-only mode that blocks all file edits and writes.
  Use when: debugging without modifying, code exploration, read-only audit, investigation.
  Keywords - freeze, readonly, read-only, no-edit, no-write, lock, investigation
type: encoded-preference
disable-model-invocation: true
argument-hint: "[on|off]"
effort: low
activation:
  keywords:
    - freeze
    - readonly
    - read-only
    - no-edit
    - no-write
    - lock
    - investigation
for_agents: [builder, reviewer]
version: "1.0"
---

# Freeze Mode

Blocks all Edit and Write operations. Useful for debugging or investigation where you want to explore the codebase without accidentally modifying anything.

## What Changes

| Tool | Normal | Freeze |
|------|--------|--------|
| Edit | Allowed | Blocked |
| Write | Allowed | Blocked |
| Read, Glob, Grep, Bash | Allowed | Allowed |

## Activation

When this skill is invoked:

1. Set environment variable: `CLAUDE_FREEZE_MODE=true`
2. The lead-enforcement hook will block Edit/Write operations
3. Read-only tools continue working normally

## Deactivation

Invoke `/freeze off` or start a new session.
