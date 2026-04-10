---
name: meta-create-plugin
description: |
  Meta-skill for creating Claude Code plugins from standardized templates.
  Use proactively when: creating a plugin, packaging extensions, building a marketplace entry.
  Keywords - create plugin, new plugin, scaffold plugin, package extension, marketplace
type: encoded-preference
disable-model-invocation: true
argument-hint: "[plugin-name] [components?]"
effort: medium
activation:
  keywords:
    - create plugin
    - new plugin
    - scaffold plugin
    - package extension
    - marketplace
for_agents: [extension-architect]
version: "1.0"
---

# Create Plugin

Meta-skill for creating Claude Code plugins from standardized templates.

## When to Use

Activate this skill when:
- User requests creating a new plugin
- Need for packaging extensions for distribution
- Request for a marketplace entry
- Bundling agents + skills + hooks + MCP + LSP into a reusable package

## Official Documentation

Before generating, fetch the latest plugin format:
- `https://code.claude.com/docs/en/plugins-reference.md` (complete schema)
- `https://code.claude.com/docs/en/plugin-marketplaces.md` (distribution)

## Workflow

### Step 1: Parse Arguments

Extract from `$ARGUMENTS`:

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `plugin-name` | Yes | - | kebab-case unique identifier |
| `components` | No | prompt user | Comma-separated: skills,agents,hooks,mcp,lsp |

### Step 2: Determine Components

If `components` was not provided, ask:

```
Which components should this plugin include?

| Component | What It Provides | Example |
|-----------|------------------|---------|
| skills | Reusable knowledge and workflows | Code review checklist |
| agents | Subagent definitions | Database validator |
| hooks | Event-driven automation | Auto-format on save |
| mcp | MCP server integrations | External API connectors |
| lsp | LSP server configurations | Custom language support |
| output-styles | Output format templates | Markdown report style |

Enter as comma-separated list (e.g., skills,hooks,mcp):
```

### Step 3: Gather Plugin Details

Ask the user:

```
Plugin configuration:
- Description: (brief purpose of this plugin)
- Author: (name and optional email)
- Components: (confirm or adjust from Step 2)
- User-configurable values? (API keys, endpoints, etc.)
```

### Step 4: Generate Plugin Structure

1. Create the directory tree based on selected components
2. Generate `plugin.json` manifest
3. Create component stubs for each selected component
4. Add `hooks/hooks.json` if hooks are selected
5. Add `.mcp.json` if MCP is selected
6. Add `.lsp.json` if LSP is selected

### Step 5: Optional: Generate Marketplace Entry

If the user wants to distribute the plugin:

1. Generate `marketplace.json` at the marketplace repo root
2. Add the plugin as a source entry
3. Include metadata (description, version, keywords)

### Step 6: Confirm Creation

```
## Plugin Created

**Name**: {plugin-name}
**Location**: {plugin-name}/

### Structure
{generated directory tree}

### Components
| Component | Path | Status |
|-----------|------|--------|
| manifest | .claude-plugin/plugin.json | Created |
| {component} | {path} | Created |

### Next Steps
1. Edit component files with your implementations
2. Test locally: `claude plugin validate`
3. Enable: `claude plugin install ./{plugin-name} --scope local`
4. Debug: `claude --debug` (shows plugin loading)
5. Distribute: add to a marketplace (see marketplace template)
```

---

## Plugin System Reference

### Directory Structure (Standard Layout)

```
{plugin-name}/
├── .claude-plugin/
│   └── plugin.json          # Manifest (optional but recommended)
├── skills/                   # Skills with name/SKILL.md structure
│   └── {skill-name}/
│       └── SKILL.md
├── commands/                 # Skills as flat .md files
├── agents/                   # Subagent definitions
│   └── {agent-name}.md
├── hooks/
│   └── hooks.json            # Hook configuration (NOT settings.json)
├── .mcp.json                 # MCP server definitions
├── .lsp.json                 # LSP server configurations
├── output-styles/            # Output style definitions
├── bin/                      # Executables added to PATH
├── scripts/                  # Hook and utility scripts
├── settings.json             # Default settings (only agent settings supported)
└── CHANGELOG.md
```

**CRITICAL**: `.claude-plugin/` contains ONLY `plugin.json`. All component directories (skills/, agents/, hooks/) go at plugin ROOT, not inside `.claude-plugin/`.

### Manifest Schema (plugin.json)

```json
{
  "name": "plugin-name",
  "version": "1.0.0",
  "description": "Brief plugin description",
  "author": {
    "name": "Author Name",
    "email": "author@example.com"
  },
  "homepage": "https://docs.example.com/plugin",
  "repository": "https://github.com/author/plugin",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"],
  "skills": "./skills/",
  "commands": "./commands/",
  "agents": "./agents/",
  "hooks": "./hooks/hooks.json",
  "mcpServers": "./.mcp.json",
  "lspServers": "./.lsp.json",
  "outputStyles": "./output-styles/"
}
```

Only `name` is required if manifest exists. Manifest itself is optional -- Claude Code auto-discovers components in default locations.

### Component Path Fields

| Field | Type | Description |
|-------|------|-------------|
| `skills` | string\|array | Skill directories with `name/SKILL.md` |
| `commands` | string\|array | Flat `.md` skill files |
| `agents` | string\|array | Agent markdown files |
| `hooks` | string\|array\|object | Hook config file or inline definition |
| `mcpServers` | string\|array\|object | MCP config file or inline definition |
| `lspServers` | string\|array\|object | LSP config file or inline definition |
| `outputStyles` | string\|array | Output style files |
| `userConfig` | object | User-configurable values prompted at enable time |
| `channels` | array | Channel declarations for message injection |

### Environment Variables

| Variable | Purpose | Persists across updates |
|----------|---------|------------------------|
| `${CLAUDE_PLUGIN_ROOT}` | Absolute path to plugin installation dir | NO (changes on update) |
| `${CLAUDE_PLUGIN_DATA}` | Persistent directory for plugin state | YES (`~/.claude/plugins/data/{id}/`) |

Both are substituted inline in skill content, agent content, hook commands, MCP/LSP configs. Also exported as env vars to subprocesses.

### userConfig (User-Facing Settings)

```json
{
  "userConfig": {
    "api_endpoint": {
      "description": "Your team's API endpoint",
      "sensitive": false
    },
    "api_token": {
      "description": "API authentication token",
      "sensitive": true
    }
  }
}
```

| Aspect | Behavior |
|--------|----------|
| Reference in configs | `${user_config.KEY}` in MCP, LSP, hooks |
| Env var export | `CLAUDE_PLUGIN_OPTION_<KEY>` to subprocesses |
| Sensitive values | Stored in system keychain (~2KB limit) |
| Non-sensitive values | Stored in `settings.json` under `pluginConfigs` |
| Prompted when | At plugin enable time |

### Installation Scopes

| Scope | Settings file | Use case |
|-------|---------------|----------|
| `user` | `~/.claude/settings.json` | Personal (default) |
| `project` | `.claude/settings.json` | Team, via VCS |
| `local` | `.claude/settings.local.json` | Project-specific, gitignored |

### Agent Security Restrictions in Plugins

Plugin agents have restricted frontmatter. The following fields are NOT supported:

| Forbidden | Reason |
|-----------|--------|
| `hooks` | Security: agent-scoped hooks could bypass plugin sandbox |
| `mcpServers` | Security: agent cannot declare its own MCP servers |
| `permissionMode` | Security: agent cannot escalate its own permissions |

Plugin agents DO support: `name`, `description`, `model`, `effort`, `maxTurns`, `tools`, `disallowedTools`, `skills`, `memory`, `background`, `isolation`.

---

## Hooks in Plugins

Plugins use `hooks/hooks.json` (NOT `settings.json`). Same hook format as global hooks:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/format-code.sh"
          }
        ]
      }
    ]
  }
}
```

**Key difference**: Use `${CLAUDE_PLUGIN_ROOT}` to reference scripts bundled with the plugin, ensuring paths resolve correctly regardless of installation location.

---

## Gotchas

| Gotcha | Why | Workaround |
|--------|-----|------------|
| `.claude-plugin/` contains ONLY `plugin.json` | Components at root are auto-discovered; nesting them inside `.claude-plugin/` hides them | Always place skills/, agents/, hooks/ at plugin ROOT |
| `hooks/hooks.json` not `settings.json` | Plugin hooks have their own config file, separate from global settings | Create `hooks/hooks.json` with the standard hooks format |
| Path traversal forbidden | Security: `../` in component paths could escape plugin sandbox | All paths must start with `./` and stay within plugin dir |
| `CLAUDE_PLUGIN_ROOT` changes on update | Plugin installation dir is not stable across versions | Use `CLAUDE_PLUGIN_DATA` for persistent state, `CLAUDE_PLUGIN_ROOT` only for bundled assets |
| Agent security restrictions | Plugin agents cannot have `hooks`, `mcpServers`, or `permissionMode` | Define hooks at plugin level, not agent level; use plugin-scoped MCP |
| Version conflict between plugin.json and marketplace.json | If version appears in both, `plugin.json` always wins silently | Set version in ONE place only |
| `strict` mode (default `true`) | `plugin.json` is authority for components; marketplace entry supplements | Set `"strict": false` only if marketplace entry is sole authority |
| Event names are case-sensitive | `PostToolUse` not `postToolUse` | Match exact casing from hook events reference |
| All paths must be relative | Absolute paths fail validation | Always start paths with `./` |
| Plugin cache at `~/.claude/plugins/cache` | Updated code without version bump = existing users see stale version | Always bump version in `plugin.json` when publishing changes |
| Symlinks preserved in cache | Useful for external dependencies | Create symlinks within plugin dir; they survive caching |

---

## CLI Reference

| Action | Command |
|--------|---------|
| Install from marketplace | `claude plugin install <name>@<marketplace>` |
| Install local | `claude plugin install ./<path> --scope local` |
| Install with scope | `claude plugin install <name> --scope project` |
| Uninstall | `claude plugin uninstall <name>` |
| Enable | `claude plugin enable <name>` |
| Disable | `claude plugin disable <name>` |
| Update | `claude plugin update <name>` |
| Validate | `claude plugin validate` |
| Debug loading | `claude --debug` (shows plugin loading details) |
| Add marketplace | `claude plugin marketplace add <source>` |
| List marketplaces | `claude plugin marketplace list` |
| Remove marketplace | `claude plugin marketplace remove <name>` |
| Reload after changes | `/reload-plugins` |

---

## Templates

### Template: Minimal Plugin (Skills Only)

**Use when**: Packaging reusable knowledge without automation.

**Directory structure**:

```
{plugin-name}/
├── .claude-plugin/
│   └── plugin.json
└── skills/
    └── {skill-name}/
        └── SKILL.md
```

**plugin.json**:

```json
{
  "name": "{{PLUGIN_NAME}}",
  "version": "1.0.0",
  "description": "{{DESCRIPTION}}",
  "author": {
    "name": "{{AUTHOR_NAME}}"
  },
  "keywords": ["{{KEYWORD_1}}", "{{KEYWORD_2}}"],
  "skills": "./skills/"
}
```

**Placeholders**:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{PLUGIN_NAME}}` | kebab-case plugin name | `code-quality-pack` |
| `{{DESCRIPTION}}` | Brief purpose | `Code quality skills and patterns` |
| `{{AUTHOR_NAME}}` | Author display name | `Dev Team` |
| `{{KEYWORD_1}}` | Primary keyword | `quality` |
| `{{KEYWORD_2}}` | Secondary keyword | `review` |
| `{{SKILL_NAME}}` | kebab-case skill name | `quality-checklist` |

---

### Template: Full Plugin (All Components)

**Use when**: Complete extension with skills, agents, hooks, and MCP.

**Directory structure**:

```
{plugin-name}/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── {skill-name}/
│       └── SKILL.md
├── agents/
│   └── {agent-name}.md
├── hooks/
│   └── hooks.json
├── .mcp.json
├── scripts/
│   └── format-code.sh
└── CHANGELOG.md
```

**plugin.json**:

```json
{
  "name": "{{PLUGIN_NAME}}",
  "version": "1.0.0",
  "description": "{{DESCRIPTION}}",
  "author": {
    "name": "{{AUTHOR_NAME}}",
    "email": "{{AUTHOR_EMAIL}}"
  },
  "repository": "{{REPO_URL}}",
  "license": "MIT",
  "keywords": ["{{KEYWORD_1}}", "{{KEYWORD_2}}", "{{KEYWORD_3}}"],
  "skills": "./skills/",
  "agents": "./agents/",
  "hooks": "./hooks/hooks.json",
  "mcpServers": "./.mcp.json",
  "userConfig": {
    "{{CONFIG_KEY}}": {
      "description": "{{CONFIG_DESCRIPTION}}",
      "sensitive": false
    }
  }
}
```

**hooks/hooks.json**:

```json
{
  "hooks": {
    "{{EVENT}}": [
      {
        "matcher": "{{MATCHER}}",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/{{SCRIPT_NAME}}"
          }
        ]
      }
    ]
  }
}
```

**.mcp.json**:

```json
{
  "mcpServers": {
    "{{SERVER_NAME}}": {
      "command": "{{COMMAND}}",
      "args": ["{{ARG_1}}"],
      "env": {
        "API_TOKEN": "${user_config.api_token}"
      }
    }
  }
}
```

**Placeholders**:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{PLUGIN_NAME}}` | kebab-case plugin name | `database-toolkit` |
| `{{DESCRIPTION}}` | Brief purpose | `Database tools with query validation` |
| `{{AUTHOR_NAME}}` | Author display name | `Dev Team` |
| `{{AUTHOR_EMAIL}}` | Author email | `dev@example.com` |
| `{{REPO_URL}}` | Git repository URL | `https://github.com/org/plugin` |
| `{{KEYWORD_1-3}}` | Relevant keywords | `database`, `sql`, `validation` |
| `{{CONFIG_KEY}}` | userConfig key name | `db_connection_string` |
| `{{CONFIG_DESCRIPTION}}` | What the config does | `Database connection string` |
| `{{EVENT}}` | Hook event name | `PostToolUse` |
| `{{MATCHER}}` | Tool matcher pattern | `Write\|Edit` |
| `{{SCRIPT_NAME}}` | Script filename | `format-code.sh` |
| `{{SERVER_NAME}}` | MCP server identifier | `db-query` |
| `{{COMMAND}}` | MCP server command | `npx` |
| `{{ARG_1}}` | Command argument | `@org/db-mcp-server` |
| `{{AGENT_NAME}}` | Agent filename (no ext) | `db-validator` |
| `{{SKILL_NAME}}` | Skill directory name | `query-patterns` |

---

### Template: Marketplace Entry

**Use when**: Distributing one or more plugins via a marketplace.

**marketplace.json** (at marketplace repo root):

```json
{
  "name": "{{MARKETPLACE_NAME}}",
  "owner": {
    "name": "{{OWNER_NAME}}"
  },
  "plugins": [
    {
      "name": "{{PLUGIN_NAME}}",
      "source": "{{SOURCE}}",
      "description": "{{DESCRIPTION}}",
      "version": "1.0.0"
    }
  ]
}
```

**Source types**:

| Type | Format | Example |
|------|--------|---------|
| Relative path | `./plugins/{name}` | `./plugins/code-quality` |
| GitHub repo | `{"source": "github", "repo": "owner/repo"}` | `{"source": "github", "repo": "acme/lint-plugin"}` |
| Git URL | `{"source": "git", "url": "https://..."}` | `{"source": "git", "url": "https://git.corp.com/plugin.git"}` |
| Git subdirectory | `{"source": "git-subdir", "url": "...", "path": "..."}` | Path within a monorepo |
| npm | `{"source": "npm", "package": "@org/plugin"}` | npm registry package |

**Placeholders**:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{MARKETPLACE_NAME}}` | Marketplace identifier | `acme-tools` |
| `{{OWNER_NAME}}` | Marketplace owner | `ACME Corp` |
| `{{PLUGIN_NAME}}` | Plugin name | `code-quality` |
| `{{SOURCE}}` | Plugin source location | `./plugins/code-quality` |
| `{{DESCRIPTION}}` | Plugin description | `Code quality review tools` |

---

## Arguments

| Argument | Required | Format | Description |
|----------|----------|--------|-------------|
| `plugin-name` | Yes | kebab-case | Unique identifier for the plugin |
| `components` | No | comma-separated | skills,agents,hooks,mcp,lsp,output-styles |

### Validation Rules

| Rule | Check | Error Message |
|------|-------|---------------|
| Name format | Must be kebab-case, no spaces | "Plugin name must be kebab-case (e.g., code-quality-pack)" |
| Name unique | No existing plugin with same name | "Plugin {name} already exists" |
| Components valid | Each must be: skills,agents,hooks,mcp,lsp,output-styles | "Invalid component: {x}. Valid: skills, agents, hooks, mcp, lsp, output-styles" |
| Paths relative | All paths start with `./` | "All paths must be relative, starting with ./" |
| No path traversal | No `../` in any path | "Path traversal (../) is forbidden in plugin paths" |

---

## Examples

### Example 1: Code Quality Plugin (Skills + Hooks)

```
/meta-create-plugin code-quality-pack skills,hooks
```

**Creates**:

```
code-quality-pack/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── quality-review/
│       └── SKILL.md
├── hooks/
│   └── hooks.json
└── scripts/
    └── check-complexity.sh
```

**plugin.json**:

```json
{
  "name": "code-quality-pack",
  "version": "1.0.0",
  "description": "Code quality skills and automated formatting hooks",
  "author": {
    "name": "Dev Team"
  },
  "keywords": ["quality", "review", "formatting"],
  "skills": "./skills/",
  "hooks": "./hooks/hooks.json"
}
```

**hooks/hooks.json**:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/check-complexity.sh"
          }
        ]
      }
    ]
  }
}
```

**skills/quality-review/SKILL.md**:

```markdown
---
name: quality-review
description: |
  Code quality review patterns and checklist.
  Use proactively when: reviewing code quality, checking for smells, SOLID violations.
  Keywords - quality, review, smells, SOLID, clean code
type: encoded-preference
---

# Quality Review

Review code for quality patterns...
```

---

### Example 2: Database Tools Plugin (Skills + MCP + Agents)

```
/meta-create-plugin database-toolkit skills,mcp,agents
```

**Creates**:

```
database-toolkit/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── query-patterns/
│       └── SKILL.md
├── agents/
│   └── db-validator.md
└── .mcp.json
```

**plugin.json**:

```json
{
  "name": "database-toolkit",
  "version": "1.0.0",
  "description": "Database query patterns, MCP server, and validation agent",
  "author": {
    "name": "Data Team",
    "email": "data@example.com"
  },
  "keywords": ["database", "sql", "query", "validation"],
  "skills": "./skills/",
  "agents": "./agents/",
  "mcpServers": "./.mcp.json",
  "userConfig": {
    "db_connection_string": {
      "description": "Database connection string (e.g., postgres://user:pass@host/db)",
      "sensitive": true
    }
  }
}
```

**.mcp.json**:

```json
{
  "mcpServers": {
    "db-query": {
      "command": "npx",
      "args": ["@database-toolkit/mcp-server"],
      "env": {
        "DATABASE_URL": "${user_config.db_connection_string}"
      }
    }
  }
}
```

**agents/db-validator.md**:

```markdown
---
description: |
  Database query validator. Checks SQL queries for performance and safety.
  Use proactively when: validating SQL, checking query performance, reviewing migrations.
  Keywords - sql, query, validate, migration, performance
tools: Read, Grep, Glob
disallowedTools: Task, Edit, Write, Bash
effort: low
---

You are a database query validation specialist.

## Responsibilities
- Validate SQL queries for correctness
- Check for N+1 query patterns
- Review migration safety
- Suggest index optimizations

## Constraints
- Read-only analysis, no modifications
- Always cite file:line for findings
```

---

### Example 3: Marketplace Distribution

Publishing a plugin marketplace with GitHub source:

**marketplace.json** (at marketplace repo root):

```json
{
  "name": "acme-tools",
  "owner": {
    "name": "ACME Corp"
  },
  "plugins": [
    {
      "name": "code-quality-pack",
      "source": {
        "source": "github",
        "repo": "acme/code-quality-pack"
      },
      "description": "Code quality skills and automated formatting hooks",
      "version": "1.0.0"
    },
    {
      "name": "database-toolkit",
      "source": "./plugins/database-toolkit",
      "description": "Database tools with query validation and MCP server",
      "version": "1.0.0"
    }
  ]
}
```

**Usage**:

```bash
# Add the marketplace
claude plugin marketplace add https://github.com/acme/tool-marketplace

# Install a plugin from it
claude plugin install code-quality-pack@acme-tools

# Install with project scope (committed to VCS)
claude plugin install database-toolkit@acme-tools --scope project
```

---

## Validation Checklist

| Check | Requirement |
|-------|-------------|
| Name format | kebab-case, no spaces, no underscores |
| Name unique | No existing plugin with same name in target scope |
| Paths relative | All paths start with `./` |
| No path traversal | No `../` in any path |
| Components at root | Not inside `.claude-plugin/` |
| Scripts executable | `chmod +x` on hook scripts |
| Version bumped | If updating, version must change |
| Manifest valid JSON | `plugin.json` parses without errors |
| Hook events cased correctly | `PostToolUse` not `postToolUse` |
| Agent restrictions respected | No `hooks`, `mcpServers`, or `permissionMode` in plugin agents |
| userConfig keys documented | Each key has a `description` field |
| Sensitive values marked | API tokens and secrets have `"sensitive": true` |

---

## Related

- `/meta-create-agent`: Create subagents for plugins
- `/meta-create-skill`: Create skills for plugins
- `/meta-create-hook`: Create hooks for plugins
- `/meta-create-rule`: Create rules (project-level, not plugin)
- `/meta-create-mcp`: Create MCP configs for plugins
- `extension-architect`: Meta-agent managing all extensions
