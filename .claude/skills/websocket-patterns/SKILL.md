---
name: websocket-patterns
description: |
  WebSocket and real-time communication patterns.
  Use when implementing WebSocket, streaming, real-time features, or socket connections.
  Keywords: websocket, ws, realtime, streaming, socket, connection, pub/sub
for_agents: [builder]
---

# WebSocket Patterns

Real-time communication patterns for Elysia/Bun applications.

## When to Use

- Implementing real-time features
- Bi-directional communication
- Live updates, notifications
- Chat, collaborative features
- Streaming data

## Elysia WebSocket

### Basic Setup

```typescript
import { Elysia } from 'elysia'

const app = new Elysia()
  .ws('/ws', {
    open(ws) {
      console.log('Client connected:', ws.id)
    },
    message(ws, message) {
      console.log('Received:', message)
      ws.send({ type: 'echo', data: message })
    },
    close(ws) {
      console.log('Client disconnected:', ws.id)
    },
    error(ws, error) {
      console.error('WebSocket error:', error)
    }
  })
  .listen(8080)
```

### Typed Messages

```typescript
import { Elysia, t } from 'elysia'

interface WSMessage {
  type: 'chat' | 'join' | 'leave' | 'ping'
  payload?: unknown
}

app.ws('/ws', {
  body: t.Object({
    type: t.Union([
      t.Literal('chat'),
      t.Literal('join'),
      t.Literal('leave'),
      t.Literal('ping')
    ]),
    payload: t.Optional(t.Unknown())
  }),
  message(ws, message: WSMessage) {
    switch (message.type) {
      case 'chat':
        handleChat(ws, message.payload)
        break
      case 'ping':
        ws.send({ type: 'pong' })
        break
    }
  }
})
```

## Connection Lifecycle

### State Management

```typescript
interface Connection {
  ws: WebSocket
  userId?: string
  joinedAt: Date
  rooms: Set<string>
}

const connections = new Map<string, Connection>()

app.ws('/ws', {
  open(ws) {
    connections.set(ws.id, {
      ws,
      joinedAt: new Date(),
      rooms: new Set()
    })
  },
  close(ws) {
    const conn = connections.get(ws.id)
    if (conn) {
      conn.rooms.forEach(room => leaveRoom(ws, room))
      connections.delete(ws.id)
    }
  }
})
```

## Pub/Sub Pattern

### Room/Channel Subscriptions

```typescript
app.ws('/ws', {
  open(ws) {
    ws.subscribe('global')
  },
  message(ws, message) {
    if (message.type === 'join') {
      ws.subscribe(message.room)
      ws.publish(message.room, {
        type: 'user_joined',
        userId: ws.data.userId
      })
    }
    if (message.type === 'leave') {
      ws.unsubscribe(message.room)
    }
    if (message.type === 'broadcast') {
      ws.publish(message.room, message.data)
    }
  },
  close(ws) {
    ws.unsubscribe('global')
  }
})
```

### Broadcast to All

```typescript
function broadcastToAll(message: unknown) {
  app.server?.publish('global', JSON.stringify(message))
}

function broadcastToRoom(room: string, message: unknown) {
  app.server?.publish(room, JSON.stringify(message))
}
```

## Heartbeat/Keep-Alive

### Server-Side Ping

```typescript
const PING_INTERVAL = 30000
const PONG_TIMEOUT = 5000

app.ws('/ws', {
  open(ws) {
    const pingInterval = setInterval(() => {
      if (ws.readyState === 1) {
        ws.send({ type: 'ping', timestamp: Date.now() })
      }
    }, PING_INTERVAL)

    ws.data = { pingInterval, lastPong: Date.now() }
  },
  message(ws, message) {
    if (message.type === 'pong') {
      ws.data.lastPong = Date.now()
    }
  },
  close(ws) {
    clearInterval(ws.data.pingInterval)
  }
})
```

### Client-Side Reconnection

```typescript
class ReconnectingWebSocket {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  constructor(private url: string) {
    this.connect()
  }

  private connect() {
    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
    }

    this.ws.onclose = () => {
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return

    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000)
    this.reconnectAttempts++

    setTimeout(() => this.connect(), delay)
  }
}
```

## Message Protocol

### Standard Message Format

```typescript
interface WSMessage<T = unknown> {
  type: string
  id?: string
  timestamp: number
  payload: T
}

interface WSResponse<T = unknown> {
  type: string
  requestId?: string
  success: boolean
  data?: T
  error?: string
}

function createMessage<T>(type: string, payload: T): WSMessage<T> {
  return {
    type,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    payload
  }
}
```

### Request-Response Pattern

```typescript
const pendingRequests = new Map<string, {
  resolve: (data: unknown) => void
  reject: (error: Error) => void
}>()

function sendRequest<T>(ws: WebSocket, type: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID()
    pendingRequests.set(id, { resolve, reject })

    ws.send(JSON.stringify({ type, id, payload }))

    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id)
        reject(new Error('Request timeout'))
      }
    }, 30000)
  })
}

ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  if (message.requestId && pendingRequests.has(message.requestId)) {
    const { resolve, reject } = pendingRequests.get(message.requestId)!
    pendingRequests.delete(message.requestId)
    message.success ? resolve(message.data) : reject(new Error(message.error))
  }
}
```

## Error Handling

### Graceful Degradation

```typescript
app.ws('/ws', {
  error(ws, error) {
    console.error('WS Error:', error)
    ws.send({
      type: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    })
  }
})
```

### Client Error Handling

```typescript
ws.onerror = (error) => {
  console.error('WebSocket error:', error)
  showNotification('Connection error. Reconnecting...')
}

ws.onclose = (event) => {
  if (event.code === 1000) {
    console.log('Clean close')
  } else {
    console.error('Abnormal close:', event.code, event.reason)
    scheduleReconnect()
  }
}
```

## Streaming Response

### Server-Sent Events Alternative

```typescript
app.get('/stream', () => {
  return new ReadableStream({
    async start(controller) {
      for await (const event of eventSource) {
        controller.enqueue(`data: ${JSON.stringify(event)}\n\n`)
      }
      controller.close()
    }
  })
})
```

## WebSocket Checklist

Before completing WebSocket implementation:

- [ ] Message types are defined and validated
- [ ] Connection state is tracked
- [ ] Heartbeat/ping-pong implemented
- [ ] Reconnection logic on client
- [ ] Error handling for both sides
- [ ] Rooms/subscriptions cleanup on disconnect
- [ ] Rate limiting for messages
- [ ] Authentication on connect
- [ ] Graceful shutdown handling

## Anti-Patterns

| Avoid | Instead |
|-------|---------|
| Storing ws in closure | Use connection Map with ws.id |
| No message validation | Validate with schema (t.Object) |
| Synchronous heavy work in message handler | Offload to worker/queue |
| No reconnection logic | Exponential backoff reconnect |
| Ignoring close codes | Handle different close scenarios |

---

**Version**: 1.0.0
**Spec**: SPEC-018
**For**: builder agent
