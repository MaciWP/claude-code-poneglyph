# Message Protocol

## Standard Message Format

```typescript
// Outgoing messages (client -> server)
interface ClientMessage<T = unknown> {
  type: string
  id: string          // For request-response correlation
  timestamp: number
  payload: T
}

// Incoming messages (server -> client)
interface ServerMessage<T = unknown> {
  type: string
  requestId?: string  // Correlates to client message id
  timestamp: number
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

// Factory functions
function createClientMessage<T>(type: string, payload: T): ClientMessage<T> {
  return {
    type,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    payload,
  }
}

function createServerMessage<T>(
  type: string,
  data: T,
  requestId?: string
): ServerMessage<T> {
  return {
    type,
    requestId,
    timestamp: Date.now(),
    success: true,
    data,
  }
}

function createErrorMessage(
  code: string,
  message: string,
  requestId?: string
): ServerMessage<never> {
  return {
    type: 'error',
    requestId,
    timestamp: Date.now(),
    success: false,
    error: { code, message },
  }
}
```

## Request-Response Pattern

### Client-Side Request with Timeout

```typescript
class WSClient {
  private ws: ReconnectingWebSocket
  private pendingRequests = new Map<string, {
    resolve: (data: unknown) => void
    reject: (error: Error) => void
    timeout: Timer
  }>()

  constructor(url: string) {
    this.ws = new ReconnectingWebSocket(url)

    this.ws.on('message', (msg: ServerMessage) => {
      if (msg.requestId && this.pendingRequests.has(msg.requestId)) {
        const pending = this.pendingRequests.get(msg.requestId)!
        this.pendingRequests.delete(msg.requestId)
        clearTimeout(pending.timeout)

        if (msg.success) {
          pending.resolve(msg.data)
        } else {
          pending.reject(new Error(msg.error?.message ?? 'Request failed'))
        }
      }
    })
  }

  async request<T>(type: string, payload: unknown, timeoutMs = 30000): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID()

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error('Request timeout'))
      }, timeoutMs)

      this.pendingRequests.set(id, { resolve, reject, timeout })

      this.ws.send({
        type,
        id,
        timestamp: Date.now(),
        payload,
      })
    })
  }

  send(type: string, payload: unknown): void {
    this.ws.send(createClientMessage(type, payload))
  }
}

// Usage
const client = new WSClient('ws://localhost:8080/ws')

const user = await client.request<User>('get_user', { userId: '123' })

client.send('chat', { room: 'general', content: 'Hello!' })
```

### Server-Side Handler

```typescript
const app = new Elysia()
  .ws('/ws', {
    async message(ws, message: ClientMessage) {
      try {
        const result = await handleRequest(ws, message)
        ws.send(createServerMessage(message.type, result, message.id))
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error')
        ws.send(createErrorMessage(
          'REQUEST_FAILED',
          err.message,
          message.id
        ))
      }
    },
  })

async function handleRequest(ws: WebSocket, message: ClientMessage): Promise<unknown> {
  switch (message.type) {
    case 'get_user':
      return db.users.find(message.payload.userId)

    case 'get_messages':
      return db.messages.findByRoom(message.payload.room, {
        limit: message.payload.limit ?? 50,
      })

    case 'create_message':
      const msg = await db.messages.create({
        room: message.payload.room,
        userId: ws.data.userId,
        content: message.payload.content,
      })
      ws.publish(message.payload.room, createServerMessage('new_message', msg))
      return msg

    default:
      throw new Error(`Unknown message type: ${message.type}`)
  }
}
```
