# SPEC-023: MCP Integration System

> **Status**: approved | **Version**: 1.0 | **Updated**: 2026-01-21

## 0. Research Summary

### Fuentes Consultadas

| Tipo | Fuente | Link | Relevancia |
|------|--------|------|------------|
| Docs oficial | Claude Code MCP | [code.claude.com](https://code.claude.com/docs/en/mcp) | Alta |
| Protocol | Model Context Protocol | [modelcontextprotocol.io](https://modelcontextprotocol.io/docs/develop/connect-local-servers) | Alta |
| Announcement | Anthropic MCP | [anthropic.com](https://www.anthropic.com/news/model-context-protocol) | Alta |
| Integration | ClaudeCode.io Guide | [Guide](https://claudecode.io/guides/mcp-integration) | Alta |
| Community | awesome-mcp-servers | [GitHub](https://github.com/anthropics/servers) | Alta |

### Decisiones Informadas por Research

| Decisión | Basada en |
|----------|-----------|
| MCP como estándar de integración | Anthropic official - "USB-C for AI" |
| stdio para servers locales | Protocol docs - estándar para local |
| SSE/HTTP para remotos | Protocol docs - transport types |
| Tool Search dinámico | Claude Code docs - context optimization |
| Resources via @ mentions | Claude Code docs - reference pattern |

### Información No Encontrada

- Performance benchmarks de MCP vs direct integration
- Límites de servers simultáneos
- Best practices para custom server development

### Confidence Assessment

| Área | Nivel | Razón |
|------|-------|-------|
| MCP Protocol | Alta | Documentación oficial completa |
| Transport types | Alta | Protocol specification |
| Tool integration | Alta | Claude Code docs |
| Server development | Media | Limited docs |

---

## 1. Vision

> **Press Release**: El MCP Integration System proporciona un framework estandarizado para conectar Claude Code con herramientas externas, bases de datos y APIs mediante el Model Context Protocol. Incluye configuración, patrones de integración y guías para servers custom.

**Background**: MCP permite integrar cientos de herramientas, pero sin estándares las integraciones son inconsistentes.

**Usuario objetivo**: Desarrolladores que integran herramientas externas con Claude Code.

**Métricas de éxito**:
- Configuración MCP documentada
- Tool Search habilitado para context optimization
- Guías para crear custom servers

---

## 2. Goals & Non-Goals

### Goals

- [ ] Documentar configuración de MCP servers
- [ ] Listar servers oficiales disponibles
- [ ] Crear guía de integración de servers externos
- [ ] Documentar Tool Search y context optimization
- [ ] Definir patrones para resources y prompts
- [ ] Crear plantilla para custom MCP server

### Non-Goals

- [ ] Desarrollar MCP server propio (futuro)
- [ ] MCP server marketplace
- [ ] GUI para configurar MCP
- [ ] Testing framework para MCP servers

---

## 3. Alternatives Considered

| Alternativa | Pros | Cons | Fuente | Decisión |
|-------------|------|------|--------|----------|
| **MCP standard** | Oficial, growing ecosystem | Learning curve | Anthropic | ✅ Elegida |
| Direct API integration | Más control | No estándar, más código | - | ⚠️ Para casos específicos |
| Custom middleware | Flexible | No soportado oficialmente | - | ❌ |

---

## 4. Design

### 4.1 MCP Configuration Structure

```
~/.config/claude/                # Global config
├── mcp.json                     # MCP servers config
└── servers/                     # Custom server code
    └── my-server/

.claude/                         # Project config
├── mcp.json                     # Project-specific servers
└── servers/                     # Project servers
```

### 4.2 MCP Server Configuration

```json
// ~/.config/claude/mcp.json or .claude/mcp.json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["path/to/server.js"],
      "env": {
        "API_KEY": "xxx"
      },
      "transport": "stdio"
    },
    "remote-server": {
      "url": "https://api.example.com/mcp",
      "transport": "http",
      "headers": {
        "Authorization": "Bearer xxx"
      }
    }
  }
}
```

### 4.3 Transport Types

| Transport | Use Case | Config |
|-----------|----------|--------|
| `stdio` | Local processes | `command` + `args` |
| `http` | Cloud APIs | `url` + `headers` |
| `sse` | Streaming remote | `url` + `headers` |

### 4.4 Official MCP Servers

Servers pre-built disponibles:

| Server | Purpose | Link |
|--------|---------|------|
| `@modelcontextprotocol/server-filesystem` | File operations | Official |
| `@modelcontextprotocol/server-github` | GitHub integration | Official |
| `@modelcontextprotocol/server-postgres` | PostgreSQL queries | Official |
| `@modelcontextprotocol/server-slack` | Slack integration | Official |
| `@modelcontextprotocol/server-puppeteer` | Browser automation | Official |
| `@modelcontextprotocol/server-google-drive` | Google Drive | Official |
| `@modelcontextprotocol/server-memory` | Persistent memory | Official |

**Installation**:
```bash
# NPM package
npm install -g @modelcontextprotocol/server-github

# Configure
# In mcp.json:
{
  "mcpServers": {
    "github": {
      "command": "mcp-server-github",
      "args": [],
      "env": {
        "GITHUB_TOKEN": "$GITHUB_TOKEN"
      }
    }
  }
}
```

### 4.5 MCP Server Capabilities

| Capability | Description | Claude Access |
|------------|-------------|---------------|
| **Tools** | Functions Claude can call | Automatic discovery |
| **Resources** | Data Claude can reference | Via @ mentions |
| **Prompts** | Slash commands | As `/server-name:prompt` |

### 4.6 Tool Search (Context Optimization)

Cuando hay muchos tools, Claude Code activa Tool Search automáticamente:

```json
{
  "settings": {
    "mcp": {
      "toolSearchEnabled": true,           // Auto-enabled if >10% context
      "toolSearchThreshold": 0.10,         // 10% of context window
      "maxToolsInContext": 50              // Load dynamically beyond this
    }
  }
}
```

**Funcionamiento**:
1. Tool descriptions en contexto
2. Claude decide qué tool necesita
3. Tool se carga dinámicamente
4. Ejecuta con full definition

**Requisitos**: Sonnet 4+ o Opus 4+ (Haiku no soporta tool_reference)

### 4.7 Resources via @ Mentions

MCP servers pueden exponer resources:

```typescript
// Server exposes
server.resource("project-config", "config://project", async () => {
  return { content: await readFile("config.json") };
});

// Claude access via @ mention
// User: @project-config show me the settings
```

### 4.8 Prompts as Slash Commands

MCP servers pueden exponer prompts:

```typescript
// Server exposes
server.prompt("analyze", "Analyze the codebase", async (args) => {
  return `Analyze: ${args.target}`;
});

// Claude access via /command
// User: /server-name:analyze target=src/
```

### 4.9 Custom MCP Server Template

#### TypeScript Server Template

```typescript
// servers/my-server/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server(
  {
    name: "my-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// Define tools
server.setRequestHandler("tools/list", async () => {
  return {
    tools: [
      {
        name: "my_tool",
        description: "Does something useful",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
          },
          required: ["query"],
        },
      },
    ],
  };
});

server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "my_tool") {
    const query = request.params.arguments.query;
    const result = await doSomething(query);
    return { content: [{ type: "text", text: result }] };
  }
  throw new Error("Unknown tool");
});

// Define resources
server.setRequestHandler("resources/list", async () => {
  return {
    resources: [
      {
        uri: "myserver://config",
        name: "Configuration",
        description: "Server configuration",
        mimeType: "application/json",
      },
    ],
  };
});

server.setRequestHandler("resources/read", async (request) => {
  if (request.params.uri === "myserver://config") {
    return {
      contents: [{ uri: request.params.uri, text: JSON.stringify(config) }],
    };
  }
  throw new Error("Unknown resource");
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
```

#### Python Server Template

```python
# servers/my-server/server.py
import asyncio
from mcp.server import Server
from mcp.server.stdio import stdio_server

server = Server("my-server")

@server.list_tools()
async def list_tools():
    return [
        {
            "name": "my_tool",
            "description": "Does something useful",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"}
                },
                "required": ["query"]
            }
        }
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "my_tool":
        result = await do_something(arguments["query"])
        return [{"type": "text", "text": result}]
    raise ValueError(f"Unknown tool: {name}")

@server.list_resources()
async def list_resources():
    return [
        {
            "uri": "myserver://config",
            "name": "Configuration",
            "mimeType": "application/json"
        }
    ]

@server.read_resource()
async def read_resource(uri: str):
    if uri == "myserver://config":
        return {"contents": [{"uri": uri, "text": json.dumps(config)}]}
    raise ValueError(f"Unknown resource: {uri}")

async def main():
    async with stdio_server() as (read, write):
        await server.run(read, write)

if __name__ == "__main__":
    asyncio.run(main())
```

### 4.10 Integration Patterns

#### Pattern A: Database Integration

```json
{
  "mcpServers": {
    "postgres": {
      "command": "mcp-server-postgres",
      "args": [],
      "env": {
        "DATABASE_URL": "$DATABASE_URL"
      }
    }
  }
}
```

```
User: @postgres show tables

Claude: I'll query the database schema...
[Uses mcp__postgres__query tool]
```

#### Pattern B: External API Integration

```json
{
  "mcpServers": {
    "github": {
      "command": "mcp-server-github",
      "env": {
        "GITHUB_TOKEN": "$GITHUB_TOKEN"
      }
    }
  }
}
```

```
User: /github:list-prs owner=my-org repo=my-repo

Claude: Fetching pull requests...
[Uses mcp__github__list_pull_requests tool]
```

#### Pattern C: Local Service Integration

```json
{
  "mcpServers": {
    "local-api": {
      "command": "node",
      "args": [".claude/servers/local-api/index.js"],
      "env": {
        "PORT": "3001"
      }
    }
  }
}
```

### 4.11 Output Management

Cuando MCP tools producen outputs grandes:

```json
{
  "settings": {
    "mcp": {
      "outputWarningThreshold": 10000,  // Warn if >10k tokens
      "outputTruncateThreshold": 50000, // Truncate if >50k tokens
      "outputFormat": "summary"          // "full" | "summary" | "truncate"
    }
  }
}
```

---

## 5. FAQ

**Q: ¿Cuántos MCP servers puedo tener?**
A: Sin límite documentado, pero Tool Search se activa si tools >10% context. [Source: Docs]

**Q: ¿MCP servers persisten entre sesiones?**
A: Sí, configurados en mcp.json se reconectan. Servers locales se reinician. [Source: Docs]

**Q: ¿Puedo usar MCP en subagents?**
A: Sí, si no especificas tools whitelist el agent hereda MCP tools. [Source: Docs]

**Q: ¿Hay autenticación para MCP?**
A: Sí, via env vars para stdio o headers para HTTP. [Source: Protocol]

---

## 6. Acceptance Criteria (BDD)

```gherkin
Feature: MCP Integration System

Scenario: Configure MCP server
  Given mcp.json with github server config
  When Claude Code starts
  Then github tools are available
  And can list PRs, issues, etc.

Scenario: Tool Search optimization
  Given >50 MCP tools configured
  When tools would exceed 10% context
  Then Tool Search activates
  And tools load dynamically

Scenario: Resource via @ mention
  Given MCP server exposing "config" resource
  When user types @server:config
  Then resource content is loaded
  And Claude can reference it

Scenario: Prompt as slash command
  Given MCP server exposing "analyze" prompt
  When user types /server:analyze
  Then prompt executes
  And Claude processes result

Scenario: Large output handling
  Given MCP tool returns >10k tokens
  When tool executes
  Then warning is shown
  And output is summarized
```

---

## 7. Open Questions

- [ ] ¿MCP server para nuestro proyecto?
- [ ] ¿Integración con memory server?
- [ ] ¿Custom server para sessions?

---

## 8. Sources

- [Claude Code MCP Docs](https://code.claude.com/docs/en/mcp) - Official reference
- [Model Context Protocol](https://modelcontextprotocol.io) - Protocol specification
- [Anthropic MCP Announcement](https://www.anthropic.com/news/model-context-protocol) - Introduction
- [Official MCP Servers](https://github.com/anthropics/servers) - Pre-built servers
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) - TypeScript development
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) - Python development

---

## 9. Next Steps

- [ ] Configurar MCP servers básicos (GitHub, filesystem)
- [ ] Documentar servers configurados en proyecto
- [ ] Evaluar custom server para sessions/memory
- [ ] Crear guía de desarrollo de custom servers
- [ ] Integrar MCP con hooks para logging
- [ ] Definir políticas de output management
