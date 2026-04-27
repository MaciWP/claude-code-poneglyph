# Environment Variables Reference

## Where to Set

| Method | Scope | Persistence |
|--------|-------|-------------|
| `settings.json` → `env` | Per scope (user/project/local) | Permanent |
| Shell export | Current terminal | Session |
| `.env` file | N/A — Claude Code does not read .env | N/A |

## Most Useful Env Vars

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CODE_EFFORT_LEVEL` | Override effort: `low`, `medium`, `high`, `max`, `auto` |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | Enable agent teams (`1`) |
| `MAX_THINKING_TOKENS` | Max tokens for extended thinking (`0` to disable) |
| `ANTHROPIC_MODEL` | Override model |
| `DISABLE_AUTO_COMPACT` | Disable auto-compaction (`1`) |
| `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | Context window threshold for compaction (default 200K) |
| `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` | Max parallel tools (default 10) |
| `BASH_DEFAULT_TIMEOUT_MS` | Bash timeout (default 120000) |
| `ENABLE_TOOL_SEARCH` | MCP tool search (`true`/`false`/`auto`) |
| `CLAUDE_CODE_DISABLE_AUTO_MEMORY` | Disable auto memory (`1`) |

## Gotchas

| Gotcha | Detail |
|--------|--------|
| Claude Code does NOT read `.env` files | Use `settings.json` `env` field or shell exports |
| Env var > setting | `CLAUDE_CODE_EFFORT_LEVEL` overrides `effortLevel` in settings.json |
| `CLAUDECODE=1` | Set automatically in Bash tool spawned shells (NOT in hooks or status line) |
