# Elysia WebSocket Setup

## Basic Configuration

```typescript
import { Elysia, t } from 'elysia'

const app = new Elysia()
  .ws('/ws', {
    open(ws) {
      console.log(`[WS] Client connected: ${ws.id}`)
      ws.subscribe('global')
    },

    message(ws, message) {
      console.log(`[WS] Message from ${ws.id}:`, message)
      handleMessage(ws, message)
    },

    close(ws) {
      console.log(`[WS] Client disconnected: ${ws.id}`)
      ws.unsubscribe('global')
    },

    error(ws, error) {
      console.error(`[WS] Error for ${ws.id}:`, error)
    },
  })
  .listen(8080)

console.log('WebSocket server running on ws://localhost:8080/ws')
```

## Typed Message Schema

```typescript
import { Elysia, t } from 'elysia'

const MessageSchema = t.Object({
  type: t.Union([
    t.Literal('chat'),
    t.Literal('join'),
    t.Literal('leave'),
    t.Literal('ping'),
    t.Literal('subscribe'),
    t.Literal('unsubscribe'),
  ]),
  payload: t.Optional(t.Unknown()),
  room: t.Optional(t.String()),
  timestamp: t.Optional(t.Number()),
})

type WSMessage = typeof MessageSchema.static

const app = new Elysia()
  .ws('/ws', {
    body: MessageSchema,

    message(ws, message: WSMessage) {
      switch (message.type) {
        case 'chat':
          handleChat(ws, message)
          break
        case 'join':
          handleJoin(ws, message)
          break
        case 'leave':
          handleLeave(ws, message)
          break
        case 'ping':
          ws.send({ type: 'pong', timestamp: Date.now() })
          break
        case 'subscribe':
          if (message.room) ws.subscribe(message.room)
          break
        case 'unsubscribe':
          if (message.room) ws.unsubscribe(message.room)
          break
      }
    },
  })
```

## Authentication on Connect

```typescript
import { Elysia } from 'elysia'
import { verifyToken } from './auth'

interface WSData {
  userId: string
  username: string
  rooms: Set<string>
}

const app = new Elysia()
  .ws('/ws', {
    async beforeHandle({ request, set }) {
      const url = new URL(request.url)
      const token = url.searchParams.get('token')

      if (!token) {
        set.status = 401
        return 'Missing token'
      }

      try {
        const payload = await verifyToken(token)
        return { userId: payload.sub, username: payload.username }
      } catch {
        set.status = 401
        return 'Invalid token'
      }
    },

    upgrade(request) {
      return {
        data: {
          userId: request.userId,
          username: request.username,
          rooms: new Set<string>(),
        } as WSData,
      }
    },

    open(ws) {
      console.log(`User ${ws.data.username} connected`)
      ws.subscribe(`user:${ws.data.userId}`)
    },

    message(ws, message) {
      console.log(`Message from ${ws.data.username}:`, message)
    },
  })
```
