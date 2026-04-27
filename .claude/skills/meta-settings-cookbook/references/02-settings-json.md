# settings.json Reference

## Scopes & Precedence

| Priority | Scope | File | Shared |
|----------|-------|------|--------|
| 1 (highest) | Managed | System paths | Org |
| 2 | CLI args | `--flag` | Session |
| 3 | Local | `.claude/settings.local.json` | No |
| 4 | Project | `.claude/settings.json` | Team |
| 5 (lowest) | User | `~/.claude/settings.json` | No |

Arrays **merge + deduplicate** across scopes (not replace).

## Template: Project settings.json

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Bash(bun test *)",
      "Bash(bun run *)",
      "Bash(git *)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)"
    ]
  },
  "env": {
    "NODE_ENV": "development"
  }
}
```

## Template: User settings.json (personal preferences)

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "effortLevel": "high",
  "language": "english",
  "showThinkingSummaries": true,
  "voiceEnabled": false
}
```

## Key Settings Reference

| Setting | Type | Description |
|---------|------|-------------|
| `permissions` | object | allow/deny/ask arrays + defaultMode |
| `env` | object | Env vars applied to every session |
| `hooks` | object | Hook registration (see meta-create-hook) |
| `model` | string | Override default model |
| `effortLevel` | string | `low`, `medium`, `high` |
| `outputStyle` | string | Active output style name |
| `language` | string | Claude's response language |
| `attribution` | object | Git commit/PR attribution |
| `worktree` | object | `symlinkDirectories`, `sparsePaths` |
| `statusLine` | object | Custom status bar: `type`, `command`, `padding`, `refreshInterval` |
| `sandbox` | object | Sandboxing configuration |
| `autoMode` | object | Auto mode classifier customization |
| `claudeMdExcludes` | array | Globs for CLAUDE.md files to skip |
| `showThinkingSummaries` | boolean | Show thinking process summaries |

## Gotchas

| Gotcha | Detail |
|--------|--------|
| `$schema` field | Add for IDE autocomplete: `"$schema": "https://json.schemastore.org/claude-code-settings.json"` |
| MCP is NOT in settings.json | MCP servers go in `.mcp.json` (project) or `~/.claude.json` (user/local) |
| Arrays merge, not replace | `allow` rules from user + project + managed all concatenate |
| `.local.json` is gitignored | Use for personal overrides that should not be committed |
