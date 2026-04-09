---
description: Syncs .claude/ configuration to global (~/.claude/) via symlinks
allowed-tools: [Bash, AskUserQuestion]
version: 2.0.0
---

# /sync-claude

Syncs files from the current project's `.claude/` to the user's `~/.claude/` via symlinks.

## Quick Start

```bash
# 1. Verify system first
/sync-claude --check

# 2. Preview changes
/sync-claude

# 3. Execute with backup
/sync-claude --execute --backup
```

## Options

| Argument | Effect |
|----------|--------|
| `--check` | Verify system and permissions (recommended first) |
| `--status` | Show current status only |
| `--execute` | Apply changes |
| `--backup` | Save existing content |
| `--unlink` | Remove symlinks |
| `--method` | Force: `auto`, `symlink`, `junction`, `copy` |
| `--force` | No confirmation prompt |

## Examples

```bash
# Verify if the system can create symlinks
/sync-claude --check

# Preview what changes would be made
/sync-claude

# Execute (with backup of existing)
/sync-claude --execute --backup

# On Windows without permissions: force junction
/sync-claude --method junction --execute

# Remove all symlinks
/sync-claude --unlink

# Show current status
/sync-claude --status
```

## Execution

$ARGUMENTS contains the additional options.

```bash
bun .claude/skills/sync-claude/scripts/sync-claude.ts $ARGUMENTS
```
