# API Reference

## Base URL

- Development: `http://localhost:8080`
- WebSocket: `ws://localhost:8080/ws`

## Endpoints

### Health

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/health` | Health check | No |

### Execution

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/execute` | Execute via SDK mode | No |
| POST | `/api/execute-cli` | Execute via CLI spawn | No |

#### POST /api/execute

```typescript
// Request
{
  prompt: string
  systemPrompt?: string
  model?: string
  maxTokens?: number
  sessionId?: string
}

// Response (streaming)
{
  type: 'text' | 'tool_use' | 'done' | 'error'
  content?: string
  toolName?: string
  toolInput?: object
}
```

#### POST /api/execute-cli

```typescript
// Request
{
  prompt: string
  agent?: string
  workDir?: string
  sessionId?: string
}

// Response (streaming)
{
  type: 'stdout' | 'stderr' | 'done' | 'error'
  content?: string
  exitCode?: number
}
```

### Sessions

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/sessions` | List all sessions | No |
| GET | `/api/sessions/:id` | Get session by ID | No |
| DELETE | `/api/sessions/:id` | Delete session | No |

### Agents

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/agents` | List available agents | No |

### Memory

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/memory/search` | Semantic search | No |
| POST | `/api/memory/store` | Store memory | No |

#### POST /api/memory/search

```typescript
// Request
{
  query: string
  limit?: number
  threshold?: number
}

// Response
{
  results: Array<{
    content: string
    score: number
    metadata: object
  }>
}
```

## WebSocket

### Connection

```typescript
const ws = new WebSocket('ws://localhost:8080/ws')

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'execute',
    prompt: 'Hello',
    sessionId: 'abc-123'
  }))
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  // Handle streaming response
}
```

### Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| execute | client→server | Start execution |
| text | server→client | Text chunk |
| tool_use | server→client | Tool invocation |
| done | server→client | Execution complete |
| error | server→client | Error occurred |

## Error Responses

```typescript
{
  error: string
  code?: string
  details?: object
}
```

| Code | Description |
|------|-------------|
| 400 | Bad request |
| 404 | Not found |
| 500 | Internal error |
