---
name: meta-create-mcp
description: |
  Meta-skill for configuring MCP servers in Claude Code from standardized templates.
  Use proactively when: adding an MCP server, configuring tool integrations, setting up external services.
  Keywords - create mcp, add mcp, mcp server, tool integration, external service
type: encoded-preference
disable-model-invocation: true
argument-hint: "[server-name] [transport?]"
effort: medium
activation:
  keywords:
    - create mcp
    - add mcp
    - mcp server
    - configure mcp
    - tool integration
for_agents: [extension-architect]
version: "1.0"
---

# Create MCP Server

Meta-skill for configuring MCP servers in Claude Code from standardized templates.

## When to Use

Activate this skill when:
- User requests adding an MCP server
- Need for configuring tool integrations with external services
- Request for connecting Claude Code to external APIs or local processes
- Setting up persistent server connections for tools

## Official Documentation

Before generating, fetch the latest MCP format:
`https://code.claude.com/docs/en/mcp.md`

## Workflow

### Step 1: Parse Arguments

Extract from `$ARGUMENTS`:

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `server-name` | Yes | - | Unique kebab-case identifier |
| `transport` | No | prompt user | `http` or `stdio` |

### Step 2: Determine Transport

If `transport` was not provided, ask:

```
What transport does this MCP server use?

| Transport | Use Case | Required Info |
|-----------|----------|---------------|
| http | Cloud services, remote APIs, webhooks | URL + optional auth headers |
| stdio | Local processes, CLI tools, system access | Command + args + optional env |
```

**Decision guide**:

| Signal | Transport |
|--------|-----------|
| URL, endpoint, API, cloud, remote, webhook | `http` |
| npx, command, local, process, CLI, binary | `stdio` |
| SSE, streaming (legacy) | `http` (SSE is deprecated) |

### Step 3: Determine Scope

Ask the user which scope to use:

```
Where should this MCP server be configured?

| Scope | Stored In | Shared via VCS | Best For |
|-------|-----------|----------------|----------|
| local (default) | ~/.claude.json | No | Personal API keys, dev tools |
| project | .mcp.json (project root) | Yes | Team-shared servers |
| user | ~/.claude.json (global) | No | Cross-project personal tools |
```

**Decision guide**:

| Signal | Scope |
|--------|-------|
| Team needs access, shared credentials | `project` |
| Personal API key, local dev tool | `local` |
| Use across all projects, personal utility | `user` |
| Contains secrets/tokens | `local` or `user` (NEVER `project`) |

**Precedence**: local > project > user. A local config overrides project and user.

### Step 4: Gather Server Details

Based on transport, collect:

**For HTTP servers**:

| Field | Required | Example |
|-------|----------|---------|
| URL | Yes | `https://api.example.com/mcp` |
| Auth method | No | Bearer token, OAuth, headersHelper |
| API key env var | If auth | `EXAMPLE_API_KEY` |

**For stdio servers**:

| Field | Required | Example |
|-------|----------|---------|
| Command | Yes | `npx`, `node`, `python` |
| Args | Yes | `["-y", "@modelcontextprotocol/server-github"]` |
| Env vars | No | `{ "GITHUB_TOKEN": "${GITHUB_TOKEN}" }` |

### Step 5: Generate Config

Generate BOTH the JSON config entry AND the equivalent CLI command.

**Output format**:

```
## MCP Server Configuration

**Server**: {server-name}
**Transport**: {http|stdio}
**Scope**: {local|project|user}

### JSON Config ({config-file})

{json entry}

### CLI Command

{claude mcp add command}

### Environment Variables Required

| Variable | Purpose | How to Set |
|----------|---------|------------|
| {VAR} | {purpose} | export {VAR}="..." |

### Verification

Run `claude mcp list` to confirm the server appears.
```

### Step 6: Confirm Setup

```
## MCP Server Configured

**Name**: {server-name}
**Transport**: {transport}
**Scope**: {scope}
**Config File**: {file path}

### Next Steps
1. Set required environment variables
2. Restart Claude Code session for changes to take effect
3. Verify with `claude mcp list`
4. Test by asking Claude to use a tool from this server
```

---

## Reference

### Transports

| Transport | Use Case | Config Fields |
|-----------|----------|---------------|
| **http** (recommended) | Cloud services, remote APIs | `type: "http"`, `url`, `headers` |
| **sse** (deprecated) | Legacy streaming | Use `http` instead |
| **stdio** | Local processes, direct system access | `command`, `args`, `env` |

### Scopes

| Scope | Default | Stored In | Shared via VCS |
|-------|---------|-----------|----------------|
| `local` | Yes | `~/.claude.json` (per project path) | No |
| `project` | No | `.mcp.json` at project root | Yes |
| `user` | No | `~/.claude.json` (global) | No |

**Precedence**: local > project > user.

### Environment Variable Expansion

Syntax: `${VAR}` or `${VAR:-default}` in command, args, env, url, and headers.

| Syntax | Behavior |
|--------|----------|
| `${VAR}` | Expands to value of VAR. Config parse fails if unset. |
| `${VAR:-fallback}` | Expands to value of VAR, or `fallback` if unset. |

### Authentication Methods

| Method | Config | When to Use |
|--------|--------|-------------|
| API key in header | `headers: { "Authorization": "Bearer ${API_KEY}" }` | Static API keys |
| OAuth 2.0 | `/mcp` in session to authenticate in browser | Cloud services (Google, GitHub) |
| headersHelper | `headersHelper: "path/to/script"` | Dynamic/SSO tokens, short-lived credentials |
| Pre-configured OAuth | `--client-id` + `--client-secret` in CLI | CI/CD pipelines |

### CLI Shortcuts

| Action | Command |
|--------|---------|
| Add HTTP server | `claude mcp add --transport http <name> <url>` |
| Add stdio server | `claude mcp add <name> -- <command> [args...]` |
| Add with scope | `claude mcp add --scope project <name> -- <command>` |
| Add with env vars | `claude mcp add --env KEY=val <name> -- <command>` |
| Add with headers | `claude mcp add --transport http --header "Auth: Bearer token" <name> <url>` |
| List all servers | `claude mcp list` |
| Remove server | `claude mcp remove <name>` |
| Add raw JSON | `claude mcp add-json <name> '<json>'` |
| Import from Desktop | `claude mcp add-from-claude-desktop` |

**IMPORTANT**: All flags (`--transport`, `--env`, `--scope`, `--header`) MUST come BEFORE the server name. `--` separates server name from command in stdio transport.

---

## Templates

### Template: HTTP Server (Remote API)

```json
{
  "mcpServers": {
    "{{SERVER_NAME}}": {
      "type": "http",
      "url": "{{URL}}",
      "headers": {
        "Authorization": "Bearer ${{{API_KEY_VAR}}}"
      }
    }
  }
}
```

**Placeholders**:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{SERVER_NAME}}` | kebab-case server name | `my-api` |
| `{{URL}}` | Full URL to MCP endpoint | `https://api.example.com/mcp` |
| `{{API_KEY_VAR}}` | Env var name for API key | `MY_API_KEY` |

### Template: HTTP Server with headersHelper

```json
{
  "mcpServers": {
    "{{SERVER_NAME}}": {
      "type": "http",
      "url": "{{URL}}",
      "headersHelper": "{{SCRIPT_PATH}}"
    }
  }
}
```

**Placeholders**:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{SERVER_NAME}}` | kebab-case server name | `corporate-api` |
| `{{URL}}` | Full URL to MCP endpoint | `https://internal.corp.com/mcp` |
| `{{SCRIPT_PATH}}` | Path to script that outputs JSON headers | `./scripts/get-auth-headers.sh` |

### Template: stdio Server (Local Process)

```json
{
  "mcpServers": {
    "{{SERVER_NAME}}": {
      "command": "{{COMMAND}}",
      "args": [{{ARGS}}],
      "env": {
        "{{ENV_KEY}}": "${{{ENV_VAR}}}"
      }
    }
  }
}
```

**Placeholders**:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{SERVER_NAME}}` | kebab-case server name | `github-mcp` |
| `{{COMMAND}}` | Executable command | `npx` |
| `{{ARGS}}` | JSON array of arguments | `"-y", "@modelcontextprotocol/server-github"` |
| `{{ENV_KEY}}` | Key name in env block | `GITHUB_TOKEN` |
| `{{ENV_VAR}}` | Env var to expand | `GITHUB_TOKEN` |

### Template: stdio Server (Windows npx)

```json
{
  "mcpServers": {
    "{{SERVER_NAME}}": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "{{PACKAGE}}"],
      "env": {
        "{{ENV_KEY}}": "${{{ENV_VAR}}}"
      }
    }
  }
}
```

> **Windows gotcha**: `npx` in stdio requires a `cmd /c` wrapper. Without it, the process may not spawn correctly.

---

## Gotchas

| Gotcha | Problem | Solution |
|--------|---------|----------|
| **Windows npx** | stdio servers with `npx` fail to spawn on Windows | Use `cmd /c` wrapper: `"command": "cmd", "args": ["/c", "npx", "-y", "@some/package"]` |
| **Flag order** | `claude mcp add my-server --scope project` is WRONG | Flags MUST come before server name: `claude mcp add --scope project my-server` |
| **Local scope path** | `local` scope stores in `~/.claude.json`, NOT `.claude/settings.local.json` | Check `~/.claude.json` under the project path key |
| **OAuth auth** | Remote servers may require browser-based OAuth flow | Use `/mcp` command in session to authenticate interactively |
| **Output limits** | Warning at 10K tokens, hard max 25K per tool response | Override with env: `MAX_MCP_OUTPUT_TOKENS=50000` |
| **Deferred tools** | MCP tools are deferred by default (only names loaded at startup) | Claude searches tool definitions on demand. Requires Sonnet 4+ or Opus 4+ |
| **headersHelper** | For dynamic auth (SSO, short-lived tokens), static headers are insufficient | Use `headersHelper` field pointing to a script that outputs JSON headers to stdout |
| **Managed lockdown** | `managed-mcp.json` at system path prevents all user modifications | Contact IT admin; users cannot add/modify servers when managed config exists |
| **SSE deprecated** | `sse` transport still works but is legacy | Always use `http` transport for new remote servers |
| **Env var required** | `${VAR}` without default causes config parse failure if VAR is unset | Use `${VAR:-default}` for optional vars, or document required vars clearly |

---

## Arguments

| Argument | Required | Format | Description |
|----------|----------|--------|-------------|
| `server-name` | Yes | kebab-case | Unique identifier for the MCP server |
| `transport` | No | http\|stdio | Server transport type |

### Validation Rules

| Rule | Check | Error Message |
|------|-------|---------------|
| Name format | Must be kebab-case | "Server name must be kebab-case (e.g., my-api-server)" |
| Name unique | No existing server with same name | "Server {name} already exists. Use `claude mcp remove {name}` first." |
| Transport valid | One of 2 types | "Transport must be: http, stdio" |
| URL format | Valid URL for http transport | "URL must start with http:// or https://" |

---

## Examples

### Example 1: GitHub MCP (stdio, project scope)

```
/meta-create-mcp github-mcp stdio
```

**JSON Config** (`.mcp.json` at project root):

```json
{
  "mcpServers": {
    "github-mcp": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

**Windows variant** (`.mcp.json`):

```json
{
  "mcpServers": {
    "github-mcp": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

**CLI Command**:

```bash
claude mcp add --scope project github-mcp -- npx -y @modelcontextprotocol/server-github

# Windows:
claude mcp add --scope project github-mcp -- cmd /c npx -y @modelcontextprotocol/server-github
```

**Environment Variables**:

| Variable | Purpose | How to Set |
|----------|---------|------------|
| `GITHUB_TOKEN` | GitHub API access | `export GITHUB_TOKEN="ghp_..."` |

---

### Example 2: Custom API (http, local scope)

```
/meta-create-mcp analytics-api http
```

**JSON Config** (`~/.claude.json` under project path):

```json
{
  "mcpServers": {
    "analytics-api": {
      "type": "http",
      "url": "https://analytics.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${ANALYTICS_API_KEY}"
      }
    }
  }
}
```

**CLI Command**:

```bash
claude mcp add --transport http --header "Authorization: Bearer ${ANALYTICS_API_KEY}" analytics-api https://analytics.example.com/mcp
```

**Environment Variables**:

| Variable | Purpose | How to Set |
|----------|---------|------------|
| `ANALYTICS_API_KEY` | API authentication | `export ANALYTICS_API_KEY="ak_..."` |

---

### Example 3: Memory Server (stdio, user scope)

```
/meta-create-mcp memory-server stdio
```

**JSON Config** (`~/.claude.json` global section):

```json
{
  "mcpServers": {
    "memory-server": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "env": {}
    }
  }
}
```

**CLI Command**:

```bash
claude mcp add --scope user memory-server -- npx -y @modelcontextprotocol/server-memory

# Windows:
claude mcp add --scope user memory-server -- cmd /c npx -y @modelcontextprotocol/server-memory
```

**Environment Variables**: None required.

**Notes**: User scope makes this server available across all projects. Useful for persistent memory, note-taking, or cross-project context.

---

## Config File Reference

| Scope | File | Structure |
|-------|------|-----------|
| `project` | `.mcp.json` (project root) | Top-level `mcpServers` object |
| `local` | `~/.claude.json` | Nested under project path key |
| `user` | `~/.claude.json` | Global `mcpServers` section |

### .mcp.json (project scope)

```json
{
  "mcpServers": {
    "server-a": { ... },
    "server-b": { ... }
  }
}
```

### ~/.claude.json (local/user scope)

```json
{
  "projects": {
    "/path/to/project": {
      "mcpServers": {
        "local-server": { ... }
      }
    }
  },
  "mcpServers": {
    "global-server": { ... }
  }
}
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Server not appearing in `claude mcp list` | Config in wrong file/scope | Verify scope and file location |
| "Connection refused" on stdio | Command not found or wrong path | Check command exists: `which <command>` |
| "Unauthorized" on http | Missing or expired auth token | Verify env var is set, use `/mcp` for OAuth |
| Tools not available | Deferred loading, model too old | Use Sonnet 4+ or Opus 4+; tools load on demand |
| Config parse error | Env var referenced but not set | Set the variable or use `${VAR:-default}` syntax |
| "Cannot modify servers" | Managed lockdown active | Check for `managed-mcp.json` at system path |

---

## Related

- `/meta-create-agent`: Create subagents
- `/meta-create-skill`: Create skills
- `/meta-create-hook`: Create hooks
- `/meta-create-rule`: Create rules
- `extension-architect`: Meta-agent managing all extensions
