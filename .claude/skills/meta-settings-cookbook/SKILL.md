---
name: meta-settings-cookbook
description: |
  Quick-reference templates for small Claude Code configurations: CLAUDE.md, settings.json, output styles, env vars, permissions.
  Use proactively when: setting up project config, creating CLAUDE.md, configuring settings, adding permissions, creating output styles.
  Keywords - CLAUDE.md, settings, config, permissions, output style, env vars, setup
type: encoded-preference
disable-model-invocation: true
argument-hint: "[config-type]"
effort: low
activation:
  keywords:
    - CLAUDE.md
    - settings.json
    - output style
    - permissions
    - env vars
    - project setup
    - statusline
    - ccstatusline
for_agents: [extension-architect]
version: "1.2"
---

# Quick Config

Quick-reference templates for Claude Code configurations.

## Official Documentation

| Config Type | Docs URL |
|-------------|----------|
| CLAUDE.md & Rules | `https://code.claude.com/docs/en/memory.md` |
| Settings | `https://code.claude.com/docs/en/settings.md` |
| Output Styles | `https://code.claude.com/docs/en/output-styles.md` |
| Environment Variables | `https://code.claude.com/docs/en/env-vars.md` |
| Permissions | `https://code.claude.com/docs/en/permissions.md` |

## References

| Reference | Contents |
|-----------|----------|
| `${CLAUDE_SKILL_DIR}/references/01-claude-md.md` | Locations, precedence, template, `@path` imports, gotchas |
| `${CLAUDE_SKILL_DIR}/references/02-settings-json.md` | Scopes, templates (project + user), key settings table, gotchas |
| `${CLAUDE_SKILL_DIR}/references/03-output-styles.md` | File locations, template, frontmatter fields, gotchas |
| `${CLAUDE_SKILL_DIR}/references/04-env-vars.md` | Where to set, useful env vars table, gotchas |
| `${CLAUDE_SKILL_DIR}/references/05-permissions.md` | Syntax, evaluation order, templates, common patterns |
| `${CLAUDE_SKILL_DIR}/references/06-gitignore.md` | Template gitignore, what to commit vs gitignore |
| `${CLAUDE_SKILL_DIR}/references/07-statusline.md` | ccstatusline setup, widget types verificados, layout 4 líneas |

## Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `config-type` | No | show menu | `claude-md`, `settings`, `output-style`, `env-vars`, `permissions`, `gitignore` |

## Related

- `/meta-create-hook`: Create hooks (settings.json hooks field)
- `/meta-create-rule`: Create rules (.claude/rules/)
- `/meta-create-mcp`: Create MCP configs (.mcp.json)
- `/meta-create-plugin`: Create plugins (bundles all config types)
- `/meta-create-agent`: Create subagents
- `/meta-create-skill`: Create skills
- `extension-architect`: Meta-agent managing all extensions
