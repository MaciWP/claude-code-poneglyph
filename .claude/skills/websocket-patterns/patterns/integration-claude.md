# Claude Integration Patterns

## Project-Specific Configuration

For **claude-code-poneglyph**, integrate WebSocket patterns in:

| File | Pattern |
|------|---------|
| `server/src/routes/ws.ts` | Main WebSocket handler |
| `server/src/services/connection-manager.ts` | Connection registry |
| `server/src/services/message-handler.ts` | Message routing |
| `web/src/hooks/useWebSocket.ts` | React WebSocket hook |
| `web/src/services/ws-client.ts` | ReconnectingWebSocket |

## Integration with Claude Service

```typescript
// server/src/routes/ws.ts
import { Elysia } from 'elysia'
import { connectionManager } from '../services/connection-manager'
import { claudeService } from '../services/claude'

export const wsRouter = new Elysia()
  .ws('/ws', {
    async beforeHandle({ request, set }) {
      const url = new URL(request.url)
      const token = url.searchParams.get('token')
      if (!token) {
        set.status = 401
        return 'Unauthorized'
      }
    },

    open(ws) {
      connectionManager.add(ws, { userId: ws.data.userId })
      ws.subscribe(`session:${ws.data.sessionId}`)
    },

    async message(ws, message) {
      if (message.type === 'execute') {
        await claudeService.streamResponse(
          message.payload.prompt,
          (delta) => ws.send({ type: 'delta', data: delta }),
          (result) => ws.send({ type: 'complete', data: result })
        )
      }
    },

    close(ws) {
      connectionManager.remove(ws.id)
    },
  })
```

## Session-Based Rooms

```typescript
// Each Claude session gets its own room for multi-tab support
app.ws('/ws', {
  open(ws) {
    const sessionId = ws.data.sessionId
    ws.subscribe(`session:${sessionId}`)

    ws.publish(`session:${sessionId}`, {
      type: 'tab_connected',
      tabId: ws.id,
    })
  },
})
```
