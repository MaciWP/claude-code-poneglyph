# Frontend Architecture - Claude Code UI

> Technical documentation for AI comprehension

## Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| Vite 5 | Build tool & dev server |
| TailwindCSS 3 | Styling |
| Bun | Runtime & package manager |
| WebSocket | Real-time streaming |

**Key Libraries**: `react-markdown`, `react-syntax-highlighter`, `mermaid`, `lucide-react`

## Folder Structure

```
web/src/
├── components/
│   ├── StreamingChat.tsx       # Main chat orchestrator
│   ├── streaming-chat/         # Chat sub-components
│   │   ├── log-entries/        # Specialized log renderers
│   │   └── index.ts            # Barrel export
│   ├── ui/                     # Reusable primitives
│   ├── App.tsx                 # Root component
│   └── *.tsx                   # Feature components
├── hooks/                      # Custom React hooks
├── lib/                        # Utilities & API client
├── types/                      # TypeScript definitions
├── contexts/                   # React contexts
└── test/                       # Test utilities
```

## Core Components

### App.tsx

Root component that manages:
- **Session state**: List of sessions, active session
- **Mode toggles**: Orchestrate, Think, Plan, Bypass
- **Provider selection**: Claude, Codex, Gemini
- **Session modal**: All sessions view

Persists modes/provider to localStorage via `useLocalStorage`.

### StreamingChat.tsx

Central chat orchestrator. Receives `session`, `modes`, `provider` from App.

**State managed:**
- `logs: LogEntry[]` - All chat entries
- `isProcessing: boolean` - Request in progress
- `activeContext: ActiveContext` - Tools, agents, rules in use
- `claudeSessionId: string` - Claude Code session for resume
- `todos: Todo[]` - Current task list
- `usage: TokenUsage` - Token consumption stats

**Key integrations:**
- `useWebSocket` - Sends requests, receives chunks
- `useChunkHandler` - Processes stream chunks into logs
- `useEnhancedActivity` - Computes sidebar summary
- `useLogFilter` - Filters logs by type

### streaming-chat/ Components

| Component | Purpose |
|-----------|---------|
| `LogEntryView` | Router - dispatches to specialized renderers |
| `ChatInput` | Input field + image paste + abort button |
| `ContextPanel` | Left sidebar - context usage, active ops, timeline |
| `FilterBar` | Log type filter buttons |
| `MarkdownContent` | Renders markdown with syntax highlighting |
| `ToolCard` | Tool usage display with input/output |
| `ExpandableContent` | Collapsible content wrapper |
| `ImageModal` | Fullscreen image viewer |
| `AgentCard` | Agent status card with steps |

### streaming-chat/log-entries/

Specialized renderers by log type:

| Renderer | For |
|----------|-----|
| `StandardLogEntry` | Response, tool, thinking, error |
| `TaskToolView` | Task tool (agent spawn) with live steps |
| `TaskOutputView` | TaskOutput tool results |
| `AgentResultView` | Completed agent summary |
| `AskUserQuestionView` | Interactive question UI |
| `EditToolView` | File edit with diff view |
| `ContextEntryView` | Loaded skills/rules/MCPs |

### UI Primitives

| Component | Purpose |
|-----------|---------|
| `Toast` | Notification message |
| `ToastContainer` | Toast stack manager |
| `ConfirmModal` | Confirmation dialog |
| `Skeleton` | Loading placeholder |

## Hooks

| Hook | Responsibility |
|------|----------------|
| `useChunkHandler` | State machine (~760 lines) - processes WebSocket chunks into LogEntry[], tracks agent steps, correlates tool_use/tool_result |
| `useWebSocket` | WebSocket connection with exponential backoff reconnect, sends requests, handles abort |
| `useEnhancedActivity` | Computes `EnhancedActivityContext` from activeContext/agents - used by ContextPanel |
| `useLogFilter` | Filters logs by type, computes filter stats |
| `useLocalStorage` | Generic localStorage persistence hook |
| `useImagePaste` | Handles clipboard image paste events |
| `useScrollToBottom` | Smart auto-scroll with pause detection |

## State & Persistence

| Data | Location | Notes |
|------|----------|-------|
| Sessions | Backend API | `/api/sessions` |
| Logs | Memory | Restored from `session.messages` on mount |
| Modes/Filters | localStorage | Via `useLocalStorage` |
| WebSocket | Memory | Auto-reconnect on disconnect |
| Active context | Memory | Cleared on session change |

## Backend Communication

### REST API (`lib/api.ts`)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/sessions` | List all sessions |
| `POST /api/sessions` | Create session |
| `GET /api/sessions/:id` | Get session with messages |
| `DELETE /api/sessions/:id` | Delete session |
| `GET /api/claude-config` | Get agents/skills/commands |
| `GET /api/agents/session/:id` | Get agents for session |
| `POST /api/memory/search` | Search memory system |

### WebSocket (`useWebSocket.ts`)

**Connection**: `ws://host/ws` (auto wss for https)

**Outgoing messages:**
```typescript
{ type: 'execute-cli', data: { prompt, provider, sessionId, resume, modes... } }
{ type: 'abort', data: { requestId } }
{ type: 'user_answer', data: { requestId, answer } }
```

**Incoming chunk types:**

| Type | Data |
|------|------|
| `init` | Session initialized |
| `text` | Response text delta |
| `thinking` | Reasoning block delta |
| `tool_use` | Tool invocation (toolUseId, tool, toolInput) |
| `tool_result` | Tool output (toolUseId, toolOutput) |
| `agent_event` | Agent lifecycle (created/started/completed/failed) |
| `context` | Loaded skill/rule/MCP |
| `result` | Final result with usage stats |
| `done` | Stream complete |
| `error` | Error message |

**Reconnection**: Exponential backoff (1s base, 30s max)

## Key Types (`types/chat.ts`)

```typescript
interface LogEntry {
  id: string
  type: 'response' | 'tool' | 'thinking' | 'init' | 'error' | 'result' | 'agent_result'
  content: string
  timestamp: Date
  tool?: string
  toolInput?: unknown
  toolOutput?: string
  toolUseId?: string           // For correlation
  agentSteps?: AgentStep[]     // Live agent progress
}

interface ActiveContext {
  tools: string[]
  toolHistory: ToolUse[]       // Last 20 tool invocations
  activeAgents: string[]
  mcpServers: string[]
  rules: string[]
}

interface StreamChunk {
  type: string
  data: string
  sessionId?: string
  tool?: string
  toolInput?: unknown
  toolOutput?: string
  toolUseId?: string
  parentToolUseId?: string     // For subagent tool correlation
  usage?: TokenUsage
}

type FilterType = 'all' | 'response' | 'tool' | 'thinking' | 'agent' | 'context' | 'file' | 'exec' | 'mcp' | 'plan'
```

## Architecture Patterns

### Chunk Processing State Machine

`useChunkHandler` implements a state machine for stream processing:
1. Tracks current response/thinking refs for delta accumulation
2. Maps `toolUseId` to active agents for correlation
3. Handles parallel agents via `parentToolUseId`
4. Deduplicates tool_use events via `seenToolUseIds`

### Component Composition

`LogEntryView` acts as router, dispatching to specialized renderers:
```
LogEntryView
  ├── AskUserQuestionView (tool=AskUserQuestion)
  ├── TaskToolView (tool=Task)
  ├── TaskOutputView (tool=TaskOutput)
  ├── EditToolView (tool=Edit)
  ├── ContextEntryView (init + context:*)
  └── StandardLogEntry (default)
```

### Memoization Strategy

Heavy components use `memo()`:
- `LogEntryView` - Prevents re-render on sibling changes
- `ChatInput` - Isolated from log updates
- `MarkdownContent` - Expensive rendering

### Context Estimation

`useEnhancedActivity` estimates context window usage:
- Rules: ~2000 tokens each
- Skills: ~1500 tokens each
- MCPs: ~500 tokens each
- Max context: 200k tokens

## Development

```bash
cd claude-code-ui/web
bun install
bun run dev      # http://localhost:5173
bun test         # Run tests
```

Vite proxies `/api` and `/ws` to backend on port 8080.
