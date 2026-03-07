# Pub/Sub Pattern

## Room Management

```typescript
const app = new Elysia()
  .ws('/ws', {
    open(ws) {
      ws.subscribe('global')
      ws.subscribe(`user:${ws.data.userId}`)
    },

    message(ws, message) {
      switch (message.type) {
        case 'join_room': {
          const room = message.room
          if (isValidRoom(room) && canJoinRoom(ws.data.userId, room)) {
            ws.subscribe(room)
            ws.data.rooms.add(room)

            ws.publish(room, {
              type: 'user_joined',
              userId: ws.data.userId,
              username: ws.data.username,
              timestamp: Date.now(),
            })

            ws.send({ type: 'joined', room })
          }
          break
        }

        case 'leave_room': {
          const room = message.room
          if (ws.data.rooms.has(room)) {
            ws.publish(room, {
              type: 'user_left',
              userId: ws.data.userId,
              timestamp: Date.now(),
            })

            ws.unsubscribe(room)
            ws.data.rooms.delete(room)
            ws.send({ type: 'left', room })
          }
          break
        }

        case 'room_message': {
          const { room, content } = message
          if (ws.data.rooms.has(room)) {
            ws.publish(room, {
              type: 'message',
              room,
              userId: ws.data.userId,
              username: ws.data.username,
              content,
              timestamp: Date.now(),
            })
          }
          break
        }
      }
    },

    close(ws) {
      ws.data.rooms.forEach(room => {
        ws.publish(room, {
          type: 'user_left',
          userId: ws.data.userId,
          timestamp: Date.now(),
        })
        ws.unsubscribe(room)
      })
    },
  })

function isValidRoom(room: string): boolean {
  return /^[a-z0-9-]+$/.test(room) && room.length <= 50
}

async function canJoinRoom(userId: string, room: string): Promise<boolean> {
  return true
}
```

## Broadcast Functions

```typescript
function broadcastAll(app: Elysia, message: unknown): void {
  app.server?.publish('global', JSON.stringify(message))
}

function broadcastRoom(app: Elysia, room: string, message: unknown): void {
  app.server?.publish(room, JSON.stringify(message))
}

function sendToUser(userId: string, message: unknown): void {
  const connections = connectionManager.getByUserId(userId)
  const payload = JSON.stringify(message)
  connections.forEach(conn => {
    if (conn.ws.readyState === 1) {
      conn.ws.send(payload)
    }
  })
}

function broadcastRoomExcept(
  ws: WebSocket,
  room: string,
  message: unknown
): void {
  ws.publish(room, JSON.stringify(message))
}
```
