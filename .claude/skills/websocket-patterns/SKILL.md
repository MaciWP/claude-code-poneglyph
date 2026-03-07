---
name: websocket-patterns
description: "WebSocket and real-time communication patterns for Elysia/Bun.\nUse when implementing: websocket, streaming, real-time features, socket connections, pub/sub.\nKeywords - websocket, ws, realtime, streaming, socket, connection, pub/sub, broadcast, chat\n"
type: knowledge-base
disable-model-invocation: false
activation:
  keywords:
    - websocket
    - ws
    - realtime
    - streaming
    - socket
    - connection
    - pub/sub
    - broadcast
    - chat
    - live
for_agents: [builder]
version: "2.0"
---

# WebSocket Patterns

Real-time communication patterns for Elysia/Bun applications.

## How to Use

| Need | Reference |
|------|-----------|
| Architecture overview | [${CLAUDE_SKILL_DIR}/references/architecture.md] |
| Setting up Elysia WS | [${CLAUDE_SKILL_DIR}/references/elysia-setup.md] |
| Connection tracking | [${CLAUDE_SKILL_DIR}/references/connection-manager.md] |
| Rooms / broadcast / presence | [${CLAUDE_SKILL_DIR}/references/pubsub-pattern.md] |
| Heartbeat / reconnection | [${CLAUDE_SKILL_DIR}/references/heartbeat-keepalive.md] |
| Message format & request-response | [${CLAUDE_SKILL_DIR}/references/message-protocol.md] |
| Error handling (server + client) | [${CLAUDE_SKILL_DIR}/references/error-handling.md] |
| Streaming responses | [${CLAUDE_SKILL_DIR}/patterns/streaming.md] |
| Claude integration examples | [${CLAUDE_SKILL_DIR}/patterns/integration-claude.md] |
| Pre-ship checklist | [${CLAUDE_SKILL_DIR}/checklists/implementation.md] |
| What NOT to do | [${CLAUDE_SKILL_DIR}/checklists/anti-patterns.md] |

## Quick Start

### Minimal Elysia WebSocket

```typescript
import { Elysia, t } from 'elysia'

const app = new Elysia()
  .ws('/ws', {
    body: t.Object({
      type: t.String(),
      payload: t.Optional(t.Unknown()),
    }),

    open(ws) {
      ws.subscribe('global')
    },

    message(ws, message) {
      switch (message.type) {
        case 'ping':
          ws.send({ type: 'pong', timestamp: Date.now() })
          break
        default:
          handleMessage(ws, message)
      }
    },

    close(ws) {
      ws.unsubscribe('global')
    },
  })
  .listen(8080)
```

### Standard Message Types

```typescript
interface ClientMessage<T = unknown> {
  type: string
  id: string
  timestamp: number
  payload: T
}

interface ServerMessage<T = unknown> {
  type: string
  requestId?: string
  timestamp: number
  success: boolean
  data?: T
  error?: { code: string; message: string }
}
```

### Connection Tracking (Minimal)

```typescript
class ConnectionManager {
  private connections = new Map<string, { ws: WebSocket; userId?: string }>()

  add(ws: WebSocket, userId?: string): void {
    this.connections.set(ws.id, { ws, userId })
  }

  remove(wsId: string): void {
    this.connections.delete(wsId)
  }

  getCount(): number {
    return this.connections.size
  }
}
```

## Key Principles

| Principle | Rule |
|-----------|------|
| Auth | Verify token in `beforeHandle`, never in `message` |
| Heartbeat | Server pings every 30s, close on pong timeout |
| Reconnect | Client uses exponential backoff with jitter |
| Cleanup | Always unsubscribe rooms on `close` |
| Errors | Catch in `message` handler, send typed error back |
| Validation | Use Elysia `body` schema for all messages |
| Broadcast | Check `readyState === 1` before sending |

## Project Files

| File | Purpose |
|------|---------|
| `server/src/routes/ws.ts` | Main WebSocket handler |
| `server/src/services/connection-manager.ts` | Connection registry |
| `server/src/services/message-handler.ts` | Message routing |
| `web/src/hooks/useWebSocket.ts` | React WebSocket hook |
| `web/src/services/ws-client.ts` | ReconnectingWebSocket |

---

**Version**: 2.0
**Spec**: SPEC-018
**For**: builder agent
