---
description: "Syncs .claude/ from poneglyph to ~/.claude/ via symlinks/junctions (multi-OS)."
argument-hint: "[--check|--status|--execute|--unlink] [--backup] [--method auto|symlink|junction|copy] [--force]"
---

# Sync Claude Config

Creates symlinks (or junctions on Windows) in `~/.claude/` pointing to `poneglyph/.claude/`, allowing skills/agents/commands/rules to be used in any project.

## Multi-OS Compatibility

| OS | Default method | Required permissions |
|----|----------------|----------------------|
| Windows | Junction | None |
| Windows (Dev Mode) | Symlink | Developer Mode ON |
| macOS | Symlink | User permissions |
| Linux | Symlink | User permissions |

## Recommended Workflow

```mermaid
graph TD
    A[1. --check] --> B{System OK?}
    B -->|Yes| C[2. Preview without flags]
    B -->|No| D[Follow recommendations]
    D --> A
    C --> E{Existing content?}
    E -->|Yes| F[3. --execute --backup]
    E -->|No| G[3. --execute]
    F --> H[4. --status verify]
    G --> H
```

## Usage

### 1. Verify system (recommended first)

```bash
bun .claude/commands/sync-claude.ts --check
```

Shows OS/version, admin/root status, Developer Mode (Windows), whether symlinks/junctions can be created, plus recommendations if anything is missing.

### 2. Preview changes

```bash
bun .claude/commands/sync-claude.ts
```

### 3. Run sync

```bash
# Normal
bun .claude/commands/sync-claude.ts --execute

# With backup of existing content
bun .claude/commands/sync-claude.ts --execute --backup

# Force a specific method
bun .claude/commands/sync-claude.ts --method junction --execute
```

### 4. View current status

```bash
bun .claude/commands/sync-claude.ts --status
```

### 5. Undo (remove symlinks)

```bash
bun .claude/commands/sync-claude.ts --unlink
```

## CLI Options

| Option | Description |
|--------|-------------|
| `--check` | Verify system and permissions |
| `--status` | Show current status |
| `--execute` | Apply changes |
| `--backup` | Save existing content before replacing |
| `--unlink` | Remove symlinks |
| `--method` | Force method: `auto`, `symlink`, `junction`, `copy` |
| `--force` | Do not prompt for confirmation |

## Linking Methods

| Method | Advantages | Disadvantages |
|--------|------------|---------------|
| `symlink` | Standard, works with files and folders | Windows: requires Dev Mode or Admin |
| `junction` | Windows: no special permissions | Folders only, Windows only |
| `copy` | Always works | Does not sync changes |

## Synced Folders

| Folder | Contents |
|--------|----------|
| `agents/` | Delegated agents |
| `skills/` | Reusable skills |
| `commands/` | Slash commands |
| `rules/` | Behavior rules |
| `docs/` | Technical documentation |
| `hooks/` | Automations |
| `knowledge/` | Knowledge base |
| `output-styles/` | Output style modes (e.g. Poneglyph) |
| `CLAUDE.md` | Global instructions |

## NOT Synced (project-specific)

| Folder | Reason |
|--------|--------|
| `agent_docs/` | Project-specific docs |
| `experts/` | Learned expertise |
| `plans/` | Temporary plans |
| `metrics/` | Session metrics |

## Troubleshooting

### Windows: Developer Mode

If `--check` shows Developer Mode disabled (and symlinks unavailable):

1. **Option A**: Enable Developer Mode → Settings → Privacy & Security → For developers → Developer Mode: ON → restart terminal.
2. **Option B**: Use junction (default). Junctions work without special permissions; `--method junction` is automatic when symlink is unavailable.
3. **Option C**: Run terminal as Administrator.

### macOS: Permissions

```bash
ls -la ~                # Check home permissions
chmod 755 ~/.claude     # Fix if needed
```

### Linux: Permissions

```bash
ls -la ~/.claude
sudo chown -R $USER:$USER ~/.claude
```

### Symlink Conflicts

```bash
bun .claude/commands/sync-claude.ts --status            # See where they point
bun .claude/commands/sync-claude.ts --execute --backup  # Replace with backup
```

---

**Version**: 2.1.0 (migrated from skill → slash command 2026-05-25)
