# Poneglyph Repository Addendum

The user-level Poneglyph doctrine is loaded by Codex from `$CODEX_HOME/AGENTS.md`.
This file intentionally contains only repository-specific instructions so the same
doctrine is not injected twice when developing Poneglyph itself.

- Global Claude configuration belongs in `.claude/settings.global.json`; the
  project `.claude/settings.json` must stay hook-free.
- Run `bun test ./.claude/` after behavioral configuration changes.
- Use `bun .claude/commands/sync-claude.ts --status` to inspect the Claude layer
  and `bun .claude/scripts/sync-codex.ts --status` to inspect the Codex layer.
- Codex adapters deliberately expose only portable skills. Do not copy Claude
  hooks, slash commands, or permissions into Codex without a native contract.
