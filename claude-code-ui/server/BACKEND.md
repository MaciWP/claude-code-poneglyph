# Backend Architecture - Claude Code UI

> Technical documentation for AI comprehension. Last updated: December 2024.

---

## Stack

| Technology | Purpose |
|------------|---------|
| **Bun 1.x** | Runtime + Package manager |
| **Elysia** | HTTP + WebSocket framework |
| **@anthropic-ai/claude-agent-sdk** | SDK mode execution |
| **CLI Spawn** | `Bun.spawn('claude', [...])` for full Claude Code capabilities |
| **Zod** | Config validation |
| **@xenova/transformers** | Local embeddings (MiniLM-L6-v2) |

### Alternative Providers

| Provider | Service | Implementation |
|----------|---------|----------------|
| Codex | `CodexService` | OpenAI Codex CLI (`codex exec`) |
| Gemini | `GeminiService` | Google Generative AI SDK |

---

## Folder Structure

```
server/
├── src/
│   ├── index.ts           # Entry point: Elysia app setup
│   ├── config.ts          # Zod-validated env config
│   ├── logger.ts          # Structured logging
│   ├── errors.ts          # Custom error classes
│   ├── cache.ts           # Generic caching utilities
│   ├── routes/
│   │   ├── index.ts       # Route exports
│   │   ├── health.ts      # GET /api/health
│   │   ├── sessions.ts    # CRUD /api/sessions
│   │   ├── agents.ts      # /api/agents endpoints
│   │   ├── memory.ts      # /api/memory endpoints
│   │   ├── claude-config.ts  # GET /api/claude-config
│   │   ├── claude-execute.ts # POST /api/execute[-cli]
│   │   └── websocket.ts   # WS /ws streaming
│   └── services/
│       ├── claude.ts      # ClaudeService (SDK + CLI)
│       ├── codex.ts       # CodexService (alternative)
│       ├── gemini.ts      # GeminiService (alternative)
│       ├── sessions.ts    # SessionStore (JSON persistence)
│       ├── agent-registry.ts  # AgentRegistry (EventEmitter)
│       ├── orchestrator.ts    # Prompt enrichment + intent classification
│       └── memory/
│           ├── index.ts       # Unified exports + init
│           ├── types.ts       # Memory type definitions
│           ├── store.ts       # JSON persistence (data/memories/)
│           ├── vector.ts      # Embeddings with transformers.js
│           ├── graph.ts       # Memory relationships
│           ├── extractor.ts   # Pattern-based extraction
│           ├── abstractor.ts  # Clustering + patterns
│           ├── confidence.ts  # Decay + reinforcement
│           ├── temporal.ts    # Time-based operations
│           └── active-learning.ts  # Feedback triggers
├── data/
│   ├── sessions/          # Session JSON files
│   ├── memories/          # Memory JSON files + index
│   └── images/            # Session image storage
└── expertise/
    ├── orchestration-rules.md  # Orchestration system prompt
    └── intents.yaml       # Intent classification config
```

---

## Entry Point (`index.ts`)

### Initialization Flow

1. Create data directory (`data/`)
2. Instantiate services: `ClaudeService`, `CodexService`, `GeminiService`, `SessionStore`
3. Configure Elysia with CORS plugin
4. Mount routes in order
5. Listen on `config.PORT` (default: 8080)

### Plugin Chain

```typescript
app
  .use(cors())
  .use(healthRoutes)
  .use(claudeConfigRoutes)
  .use(createSessionRoutes(sessions))
  .use(createClaudeExecuteRoutes(claude, codex, gemini, sessions, orchestrator))
  .use(createAgentRoutes(agentRegistry))
  .use(memoryRoutes)
  .use(createWebSocketRoutes(...))
```

---

## Services

### ClaudeService (`services/claude.ts`)

**Primary AI execution service** with two modes:

| Mode | Method | Use Case |
|------|--------|----------|
| **SDK** | `execute()`, `stream()` | Headless, automated tasks |
| **CLI Spawn** | `executeCLI()`, `streamCLI()`, `streamCLIWithAbort()` | Interactive, full capabilities |

**Key Features:**
- `validateWorkDir()`: Security - only allows paths under `$HOME`
- `getSafeEnv()`: Whitelist of environment variables (PATH, HOME, ANTHROPIC_*, CLAUDE_*, etc.)
- `streamCLIWithAbort()`: Returns `{ stream, abort, sendUserAnswer }` for cancellation + AskUserQuestion support
- Supports images via stdin in `stream-json` format
- Parses NDJSON stream events: `init`, `assistant`, `user`, `result`, `control_request`

**Stream Chunk Types:**
```typescript
type: 'init' | 'text' | 'tool_use' | 'tool_result' | 'result' | 'error' | 'done' | 'thinking' | 'context' | 'agent_event'
```

### CodexService / GeminiService

**Alternative providers** implementing the same interface:

```typescript
interface ProviderService {
  executeCLI(options: CLIOptions): Promise<CLIResult>
  streamCLI(options: CLIOptions): AsyncGenerator<StreamChunk>
  streamCLIWithAbort(options: CLIOptions): { stream, abort }
}
```

### SessionStore (`services/sessions.ts`)

**JSON-based session persistence** in `data/sessions/`.

| Method | Description |
|--------|-------------|
| `create(name?, workDir?)` | New session with UUID |
| `get(id)` | Load session + hydrate images |
| `list()` | All sessions sorted by `updatedAt` |
| `save(session)` | Persist to JSON |
| `delete(id)` | Remove session + images |
| `addMessage(sessionId, role, content, toolsUsed?, images?)` | Append message with lock |

**Image Handling:** Base64 images are saved as files in `data/images/{sessionId}/` and referenced as `img://{sessionId}/{filename}`.

### AgentRegistry (`services/agent-registry.ts`)

**In-memory agent tracking** with EventEmitter pattern.

| Lifecycle | Method | Event |
|-----------|--------|-------|
| Create | `createAgent({ type, sessionId, task })` | `agent:created` |
| Start | `startAgent(id)` | `agent:started` |
| Complete | `completeAgent(id, result, tokensUsed?)` | `agent:completed` |
| Fail | `failAgent(id, error)` | `agent:failed` |
| Delete | `deleteAgent(id)` | `agent:deleted` |

**Auto-Cleanup:** TTL cleanup runs every 60s, removing completed/failed agents after 1 hour.

### Orchestrator (`services/orchestrator.ts`)

**Prompt enrichment + intent classification** for orchestration mode.

| Function | Purpose |
|----------|---------|
| `classifyIntent(prompt)` | Keyword-based intent detection |
| `enrichPrompt(prompt, options)` | Injects rules, delegation hints, memory context |
| `formatEnrichedPrompt(enriched)` | Combines system context + user prompt |
| `createWorkflowAgents(sessionId, intent, task)` | Pre-creates agents for workflow |

**Intent Classification:** Matches keywords from `expertise/intents.yaml` to determine workflow (e.g., `implementation` -> `['Explore', 'general-purpose']`).

**Memory Integration:** Calls `searchRelevantMemories()` to inject top 3 relevant memories into context.

---

## Memory System (`services/memory/`)

### Components

| Component | File | Responsibility |
|-----------|------|----------------|
| **Store** | `store.ts` | CRUD + text search, JSON persistence |
| **Vector** | `vector.ts` | Embeddings via `@xenova/transformers` |
| **Graph** | `graph.ts` | Relationships (reinforces, contradicts, extends...) |
| **Extractor** | `extractor.ts` | Pattern-based memory extraction |
| **Abstractor** | `abstractor.ts` | Clustering similar memories |
| **Confidence** | `confidence.ts` | Decay + reinforcement scoring |

### Memory Types

```typescript
type MemoryType = 'episodic' | 'semantic' | 'procedural'
type MemorySource = 'interaction' | 'explicit' | 'inferred' | 'agent' | 'abstraction'
```

### Initialization

```typescript
await initMemorySystem({
  enableEmbeddings: true,      // Use vector search
  enableActiveLearning: true,  // Feedback triggers
  enableAutoExtraction: true,  // Extract from conversations
  preloadEmbeddingModel: false // Lazy load model
})
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/sessions` | List all sessions |
| POST | `/api/sessions` | Create session |
| GET | `/api/sessions/:id` | Get session by ID |
| DELETE | `/api/sessions/:id` | Delete session |
| DELETE | `/api/sessions` | Delete all sessions |
| POST | `/api/execute` | Execute prompt (SDK mode) |
| POST | `/api/execute-cli` | Execute prompt (CLI mode) |
| GET | `/api/claude-config` | Get agents/skills/commands |
| GET | `/api/agents` | List all agents |
| GET | `/api/agents/active` | List active agents |
| GET | `/api/agents/session/:id` | Agents by session |
| DELETE | `/api/agents/:id` | Delete agent |
| POST | `/api/memory/search` | Search memories |
| POST | `/api/memory/feedback` | Provide feedback |
| GET | `/api/memory/stats` | Memory statistics |
| WS | `/ws` | WebSocket streaming |

---

## Request Flow

```
┌─────────┐    ┌─────────────┐    ┌─────────────────┐    ┌─────────────┐
│ Request │───>│ Elysia      │───>│ Route Handler   │───>│ AI Service  │
└─────────┘    │ Router      │    │ (+ Orchestrator)│    │ (Claude/    │
               └─────────────┘    └────────┬────────┘    │  Codex/     │
                                           │             │  Gemini)    │
                                           v             └──────┬──────┘
                                  ┌─────────────────┐           │
                                  │ AgentRegistry   │           │
                                  │ (tracking)      │           │
                                  └─────────────────┘           │
                                           │                    │
                                           v                    v
                                  ┌─────────────────┐   ┌──────────────┐
                                  │ Memory System   │   │ SessionStore │
                                  │ (extraction)    │   │ (persist)    │
                                  └─────────────────┘   └──────────────┘
```

---

## WebSocket Streaming

### Message Types (Client -> Server)

```typescript
{ type: 'execute-cli', data: { prompt, sessionId, workDir, images?, orchestrate?, ... } }
{ type: 'abort', data: { requestId? } }
{ type: 'user_answer', data: { requestId, answer } }
```

### Chunk Types (Server -> Client)

| Type | Description |
|------|-------------|
| `request_id` | Unique ID for abort tracking |
| `init` | Stream started, includes session_id |
| `text` | Incremental text delta |
| `thinking` | Thinking/reasoning block |
| `tool_use` | Tool invocation (includes toolInput, toolUseId) |
| `tool_result` | Tool completion (includes toolOutput) |
| `context` | Activated skill/rule/memory |
| `agent_event` | Agent lifecycle (created/started/completed/failed) |
| `result` | Final response + cost/usage |
| `error` | Error message |
| `done` | Stream complete |

---

## Architecture Patterns

| Pattern | Usage |
|---------|-------|
| **Factory** | `createSessionRoutes(store)`, `createWebSocketRoutes(...)` |
| **Singleton** | `agentRegistry`, `memoryStore`, `memoryGraph`, `orchestrator` |
| **EventEmitter** | `AgentRegistry` for lifecycle events |
| **Strategy** | Provider selection (Claude/Codex/Gemini) |
| **Repository** | `SessionStore`, `MemoryStore` for data access |
| **Async Generator** | `streamCLI()` for backpressure-friendly streaming |

---

## Security Measures

| Function | Location | Protection |
|----------|----------|------------|
| `validateWorkDir()` | `claude.ts`, `codex.ts` | Path traversal - only allows `$HOME` subtree |
| `getSafeEnv()` | `claude.ts`, `codex.ts` | Env injection - whitelist only |
| `t.Object()` | Routes | Body validation via Elysia/TypeBox |
| Session locking | `sessions.ts` | Race condition prevention |

### Environment Whitelist

```typescript
const safeKeys = ['PATH', 'HOME', 'USER', 'SHELL', 'TERM', 'LANG', 'TZ', 'TMPDIR']
// Plus prefixes: LC_*, ANTHROPIC_*, CLAUDE_*, NODE_*
```

---

## Configuration

Environment variables validated by Zod in `config.ts`:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8080 | Server port |
| `HOST` | 0.0.0.0 | Bind address |
| `SESSIONS_DIR` | ./data/sessions | Session storage path |
| `NODE_ENV` | development | Environment mode |
| `LOG_LEVEL` | info | Logging verbosity |
