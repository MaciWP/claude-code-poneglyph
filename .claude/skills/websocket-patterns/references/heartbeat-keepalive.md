# Heartbeat / Keep-Alive

## Server-Side Ping

```typescript
const PING_INTERVAL_MS = 30000
const PONG_TIMEOUT_MS = 10000

interface HeartbeatData {
  pingInterval?: Timer
  pongTimeout?: Timer
  lastPong: number
}

const app = new Elysia()
  .ws('/ws', {
    open(ws) {
      const heartbeat: HeartbeatData = {
        lastPong: Date.now(),
      }
      ws.data.heartbeat = heartbeat

      heartbeat.pingInterval = setInterval(() => {
        if (ws.readyState !== 1) {
          clearInterval(heartbeat.pingInterval)
          return
        }

        ws.send({ type: 'ping', timestamp: Date.now() })

        heartbeat.pongTimeout = setTimeout(() => {
          console.log(`[WS] Client ${ws.id} pong timeout, closing`)
          ws.close(4000, 'Pong timeout')
        }, PONG_TIMEOUT_MS)
      }, PING_INTERVAL_MS)
    },

    message(ws, message) {
      if (message.type === 'pong') {
        const heartbeat = ws.data.heartbeat as HeartbeatData
        heartbeat.lastPong = Date.now()
        if (heartbeat.pongTimeout) {
          clearTimeout(heartbeat.pongTimeout)
          heartbeat.pongTimeout = undefined
        }
        return
      }

      // Handle other messages...
    },

    close(ws) {
      const heartbeat = ws.data.heartbeat as HeartbeatData
      if (heartbeat.pingInterval) clearInterval(heartbeat.pingInterval)
      if (heartbeat.pongTimeout) clearTimeout(heartbeat.pongTimeout)
    },
  })
```

## Client-Side Reconnection

```typescript
class ReconnectingWebSocket {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 10
  private readonly baseDelay = 1000
  private readonly maxDelay = 30000
  private isIntentionallyClosed = false

  private messageQueue: unknown[] = []
  private eventHandlers: Map<string, Set<(data: unknown) => void>> = new Map()

  constructor(private readonly url: string) {
    this.connect()
  }

  private connect(): void {
    console.log(`[WS] Connecting to ${this.url}`)
    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      console.log('[WS] Connected')
      this.reconnectAttempts = 0
      this.flushMessageQueue()
      this.emit('open', null)
    }

    this.ws.onclose = (event) => {
      console.log(`[WS] Closed: ${event.code} ${event.reason}`)
      this.emit('close', { code: event.code, reason: event.reason })

      if (!this.isIntentionallyClosed) {
        this.scheduleReconnect()
      }
    }

    this.ws.onerror = (error) => {
      console.error('[WS] Error:', error)
      this.emit('error', error)
    }

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)

        if (message.type === 'ping') {
          this.send({ type: 'pong', timestamp: Date.now() })
          return
        }

        this.emit('message', message)
        this.emit(message.type, message.payload)
      } catch (e) {
        console.error('[WS] Failed to parse message:', e)
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WS] Max reconnect attempts reached')
      this.emit('maxReconnectAttempts', null)
      return
    }

    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
      this.maxDelay
    )

    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`)
    this.reconnectAttempts++

    setTimeout(() => this.connect(), delay)
  }

  send(message: unknown): void {
    const payload = JSON.stringify(message)

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(payload)
    } else {
      this.messageQueue.push(message)
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift()
      this.ws.send(JSON.stringify(message))
    }
  }

  on(event: string, handler: (data: unknown) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)
  }

  off(event: string, handler: (data: unknown) => void): void {
    this.eventHandlers.get(event)?.delete(handler)
  }

  private emit(event: string, data: unknown): void {
    this.eventHandlers.get(event)?.forEach(handler => handler(data))
  }

  close(): void {
    this.isIntentionallyClosed = true
    this.ws?.close(1000, 'Client closed')
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED
  }
}

// Usage
const ws = new ReconnectingWebSocket('ws://localhost:8080/ws?token=xxx')

ws.on('open', () => console.log('Connected!'))
ws.on('message', (msg) => console.log('Received:', msg))
ws.on('chat', (payload) => console.log('Chat message:', payload))
ws.on('close', ({ code, reason }) => console.log(`Closed: ${code}`))

ws.send({ type: 'join_room', room: 'general' })
```
