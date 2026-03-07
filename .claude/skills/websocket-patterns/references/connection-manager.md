# Connection Manager

## Connection Registry

```typescript
interface Connection {
  id: string
  ws: WebSocket
  userId?: string
  username?: string
  connectedAt: Date
  lastActivity: Date
  rooms: Set<string>
  metadata: Record<string, unknown>
}

class ConnectionManager {
  private connections = new Map<string, Connection>()
  private userConnections = new Map<string, Set<string>>()

  add(ws: WebSocket, data?: Partial<Connection>): Connection {
    const conn: Connection = {
      id: ws.id,
      ws,
      connectedAt: new Date(),
      lastActivity: new Date(),
      rooms: new Set(),
      metadata: {},
      ...data,
    }

    this.connections.set(ws.id, conn)

    if (conn.userId) {
      if (!this.userConnections.has(conn.userId)) {
        this.userConnections.set(conn.userId, new Set())
      }
      this.userConnections.get(conn.userId)!.add(ws.id)
    }

    return conn
  }

  remove(wsId: string): void {
    const conn = this.connections.get(wsId)
    if (!conn) return

    if (conn.userId) {
      const userConns = this.userConnections.get(conn.userId)
      userConns?.delete(wsId)
      if (userConns?.size === 0) {
        this.userConnections.delete(conn.userId)
      }
    }

    conn.rooms.forEach(room => conn.ws.unsubscribe(room))

    this.connections.delete(wsId)
  }

  get(wsId: string): Connection | undefined {
    return this.connections.get(wsId)
  }

  getByUserId(userId: string): Connection[] {
    const connIds = this.userConnections.get(userId)
    if (!connIds) return []
    return Array.from(connIds)
      .map(id => this.connections.get(id))
      .filter((c): c is Connection => c !== undefined)
  }

  updateActivity(wsId: string): void {
    const conn = this.connections.get(wsId)
    if (conn) conn.lastActivity = new Date()
  }

  getAll(): Connection[] {
    return Array.from(this.connections.values())
  }

  getCount(): number {
    return this.connections.size
  }
}

export const connectionManager = new ConnectionManager()
```

## Usage in Elysia

```typescript
import { connectionManager } from './connection-manager'

const app = new Elysia()
  .ws('/ws', {
    open(ws) {
      const conn = connectionManager.add(ws, {
        userId: ws.data?.userId,
        username: ws.data?.username,
      })
      console.log(`Connections: ${connectionManager.getCount()}`)
    },

    message(ws, message) {
      connectionManager.updateActivity(ws.id)
      handleMessage(ws, message)
    },

    close(ws) {
      connectionManager.remove(ws.id)
      console.log(`Connections: ${connectionManager.getCount()}`)
    },
  })
```
