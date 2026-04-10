---
name: meta-quick-config
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
for_agents: [extension-architect]
version: "1.0"
---

# Quick Config

Quick-reference templates for Claude Code configurations that don't warrant individual meta-skills.

## When to Use

- Setting up a new project's Claude Code configuration
- Creating or editing CLAUDE.md files
- Configuring settings.json (permissions, env, hooks registration)
- Creating custom output styles
- Setting up environment variables
- Configuring permission rules

## Official Documentation

| Config Type | Docs URL |
|-------------|----------|
| CLAUDE.md & Rules | `https://code.claude.com/docs/en/memory.md` |
| Settings | `https://code.claude.com/docs/en/settings.md` |
| Output Styles | `https://code.claude.com/docs/en/output-styles.md` |
| Environment Variables | `https://code.claude.com/docs/en/env-vars.md` |
| Permissions | `https://code.claude.com/docs/en/permissions.md` |

---

## 1. CLAUDE.md

### What It Is

Project instructions loaded into every session. Claude reads them as context but they are user messages, not enforced config.

### Locations & Precedence (specific > broad)

| Scope | File | Shared |
|-------|------|--------|
| Managed | System-level `CLAUDE.md` | Org-wide |
| Project | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Team (VCS) |
| User | `~/.claude/CLAUDE.md` | Personal (all projects) |
| Local | `./CLAUDE.local.md` | Personal (this project) |

Loading: walks UP directory tree from cwd. `CLAUDE.local.md` appended after `CLAUDE.md` at each level.

### Template: Project CLAUDE.md

```markdown
# Project Name

## Tech Stack
- Language: TypeScript
- Runtime: Bun
- Framework: Elysia
- Database: PostgreSQL + Drizzle ORM

## Conventions
- Use typed errors, never throw raw strings
- All API responses follow `{ data, error }` pattern
- Tests colocated with source: `foo.test.ts` next to `foo.ts`

## Commands
- `bun test` — run all tests
- `bun run dev` — start dev server
- `bun run build` — production build

## Architecture
- `src/routes/` — API endpoints
- `src/services/` — business logic
- `src/data/` — database access
- `src/utils/` — shared utilities
```

### Import Syntax

`@path/to/file` — expands file inline (max 5 hops deep). Use for splitting large CLAUDE.md:

```markdown
@.claude/rules/coding-standards.md
@.claude/rules/api-patterns.md
```

### Gotchas

| Gotcha | Detail |
|--------|--------|
| Not enforced config | CLAUDE.md is a user message, can be overridden. Use `--append-system-prompt` for system-level enforcement |
| HTML comments stripped | `<!-- ... -->` removed before injection (saves tokens) |
| After /compact | Project-root CLAUDE.md re-injected; nested ones only reload when their subdirectory is accessed |
| Size matters | Large CLAUDE.md = more input tokens per request. Move detailed patterns to skills |
| `claudeMdExcludes` | Setting to skip specific CLAUDE.md files by glob |

---

## 2. settings.json

### Scopes & Precedence

| Priority | Scope | File | Shared |
|----------|-------|------|--------|
| 1 (highest) | Managed | System paths | Org |
| 2 | CLI args | `--flag` | Session |
| 3 | Local | `.claude/settings.local.json` | No |
| 4 | Project | `.claude/settings.json` | Team |
| 5 (lowest) | User | `~/.claude/settings.json` | No |

Arrays **merge + deduplicate** across scopes (not replace).

### Template: Project settings.json

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

### Template: User settings.json (personal preferences)

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "effortLevel": "high",
  "language": "english",
  "showThinkingSummaries": true,
  "voiceEnabled": false
}
```

### Key Settings Reference

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
| `sandbox` | object | Sandboxing configuration |
| `autoMode` | object | Auto mode classifier customization |
| `claudeMdExcludes` | array | Globs for CLAUDE.md files to skip |
| `showThinkingSummaries` | boolean | Show thinking process summaries |

### Gotchas

| Gotcha | Detail |
|--------|--------|
| `$schema` field | Add for IDE autocomplete: `"$schema": "https://json.schemastore.org/claude-code-settings.json"` |
| MCP is NOT in settings.json | MCP servers go in `.mcp.json` (project) or `~/.claude.json` (user/local) |
| Arrays merge, not replace | `allow` rules from user + project + managed all concatenate |
| `.local.json` is gitignored | Use for personal overrides that should not be committed |

---

## 3. Output Styles

### What They Are

Modify how Claude responds (role, tone, format). They edit the system prompt, not add to it.

### File Locations

| Scope | Path |
|-------|------|
| User | `~/.claude/output-styles/` |
| Project | `.claude/output-styles/` |
| Plugins | `output-styles/` in plugin root |

### Template: Custom Output Style

```markdown
---
name: Concise Engineer
description: Terse responses focused on code, minimal explanation
keep-coding-instructions: true
---

You respond in the most concise way possible.

## Rules
- Lead with the code change, not an explanation
- No preamble ("Sure!", "Great question!")
- Skip obvious explanations
- Use bullet points, not paragraphs
- If the answer is a single line of code, just give the line
```

### Frontmatter

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `name` | string | No | From filename |
| `description` | string | No | None |
| `keep-coding-instructions` | boolean | No | `false` |

### Gotchas

| Gotcha | Detail |
|--------|--------|
| `keep-coding-instructions: false` (default) | Removes coding-specific system prompt. Set to `true` if style is for coding tasks |
| Changes need new session | Output style changes take effect on next session start (prompt caching) |
| Built-in styles | Default, Explanatory, Learning |

---

## 4. Environment Variables

### Where to Set

| Method | Scope | Persistence |
|--------|-------|-------------|
| `settings.json` -> `env` | Per scope (user/project/local) | Permanent |
| Shell export | Current terminal | Session |
| `.env` file | N/A — Claude Code does not read .env | N/A |

### Most Useful Env Vars

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

### Gotchas

| Gotcha | Detail |
|--------|--------|
| Claude Code does NOT read `.env` files | Use `settings.json` `env` field or shell exports |
| Env var > setting | `CLAUDE_CODE_EFFORT_LEVEL` overrides `effortLevel` in settings.json |
| `CLAUDECODE=1` | Set automatically in Bash tool spawned shells (NOT in hooks or status line) |

---

## 5. Permission Rules

### Syntax

Format: `Tool` or `Tool(specifier)`

| Pattern | Matches |
|---------|---------|
| `Bash` | All bash commands |
| `Bash(git *)` | Commands starting with `git` |
| `Bash(npm run *)` | Commands starting with `npm run` |
| `Read(./.env)` | Specific file |
| `Read(./secrets/**)` | Directory glob |
| `Edit(*.ts)` | Files by extension |
| `WebFetch(domain:example.com)` | Fetch by domain |
| `Write` | All write operations |

### Evaluation Order

1. **deny** checked first — if matches, blocked
2. **ask** checked next — if matches, prompts user
3. **allow** checked last — if matches, auto-approved
4. No match -> default permission mode behavior

### Template: Restrictive Permissions

```json
{
  "permissions": {
    "allow": [
      "Bash(bun test *)",
      "Bash(bun run lint)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)"
    ],
    "ask": [
      "Bash(git push *)",
      "Bash(git commit *)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Bash(curl *)",
      "Bash(rm -rf *)",
      "WebFetch"
    ],
    "defaultMode": "acceptEdits"
  }
}
```

### Template: Permissive Permissions (trusted dev environment)

```json
{
  "permissions": {
    "allow": [
      "Bash(*)",
      "Read(*)",
      "Edit(*)",
      "Write(*)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./secrets/**)"
    ],
    "defaultMode": "bypassPermissions"
  }
}
```

### Common Permission Patterns

| Use Case | Rule |
|----------|------|
| Allow all git commands | `Bash(git *)` |
| Allow specific test runner | `Bash(bun test *)` |
| Block env files | `Read(./.env)`, `Read(./.env.*)` |
| Block secrets directory | `Read(./secrets/**)` |
| Allow fetching specific domain | `WebFetch(domain:api.example.com)` |
| Block all web fetching | `WebFetch` in deny |
| Allow editing TypeScript only | `Edit(*.ts)` |

---

## 6. .gitignore Patterns for Claude Code

### Template: Claude Code .gitignore entries

```gitignore
# Claude Code local settings (not shared)
.claude/settings.local.json
CLAUDE.local.md

# Claude Code auto-generated
.claude/agent-memory/*/MEMORY.md
```

### What to Commit vs Gitignore

| Commit (shared) | Gitignore (personal) |
|-----------------|---------------------|
| `.claude/settings.json` | `.claude/settings.local.json` |
| `.claude/agents/*.md` | `CLAUDE.local.md` |
| `.claude/skills/` | Agent expertise files |
| `CLAUDE.md` | |
| `.mcp.json` | |

---

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
