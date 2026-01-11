---
name: tools
description: Show available skills, agents, commands, and MCP servers when the user asks what tools are available.
---

# Tools Overview

1. List skills from `.codex/skills/**/SKILL.md` and `.claude/skills/**/SKILL.md`.
2. List agents from `.claude/agents/*.md`.
3. List commands from `.claude/commands/*.md`.
4. Read `.codex/config.toml` for `mcp_servers` if present.
5. Present a concise summary grouped by category.
