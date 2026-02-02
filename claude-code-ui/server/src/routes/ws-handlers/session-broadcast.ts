import type { WebSocketWithSend } from './types'

/**
 * Track WebSocket connections per session for broadcasting events to Visual Mode
 */
const sessionSockets = new Map<string, Set<unknown>>()
const wsToSessionId = new Map<unknown, string>()

/**
 * Broadcast a message to all WebSocket connections for a session.
 * Used to sync Visual Mode (Kanban/Terminals) with agent events.
 */
export function broadcastToSession(sessionId: string, message: object): void {
  const sockets = sessionSockets.get(sessionId)
  if (!sockets) return

  const payload = JSON.stringify(message)
  for (const ws of sockets) {
    try {
      (ws as WebSocketWithSend).send(payload)
    } catch (error) {
      // Socket may be closed, will be cleaned up on close event
      // This is expected behavior when client disconnects
    }
  }
}

/**
 * Register a WebSocket connection for a session
 */
export function registerSessionSocket(sessionId: string, ws: unknown): void {
  let sockets = sessionSockets.get(sessionId)
  if (!sockets) {
    sockets = new Set()
    sessionSockets.set(sessionId, sockets)
  }
  sockets.add(ws)
  wsToSessionId.set(ws, sessionId)
}

/**
 * Unregister a WebSocket connection from its session
 */
export function unregisterSessionSocket(ws: unknown): void {
  const sessionId = wsToSessionId.get(ws)
  if (sessionId) {
    const sockets = sessionSockets.get(sessionId)
    if (sockets) {
      sockets.delete(ws)
      if (sockets.size === 0) {
        sessionSockets.delete(sessionId)
      }
    }
    wsToSessionId.delete(ws)
  }
}

/**
 * Get session ID for a WebSocket connection
 */
export function getSessionIdForSocket(ws: unknown): string | undefined {
  return wsToSessionId.get(ws)
}

/**
 * Get all sockets for a session (for testing/debugging)
 */
export function getSessionSockets(sessionId: string): Set<unknown> | undefined {
  return sessionSockets.get(sessionId)
}
