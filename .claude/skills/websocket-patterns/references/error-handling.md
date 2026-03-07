# Error Handling

## Server Error Handler

```typescript
const app = new Elysia()
  .ws('/ws', {
    error(ws, error) {
      console.error(`[WS] Error for ${ws.id}:`, error)

      try {
        ws.send({
          type: 'error',
          timestamp: Date.now(),
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An internal error occurred',
          },
        })
      } catch {
        // Connection may be dead
      }
    },

    message(ws, message) {
      try {
        handleMessage(ws, message)
      } catch (error) {
        if (error instanceof ValidationError) {
          ws.send(createErrorMessage('VALIDATION_ERROR', error.message))
        } else if (error instanceof UnauthorizedError) {
          ws.send(createErrorMessage('UNAUTHORIZED', 'Access denied'))
        } else {
          console.error('[WS] Message handling error:', error)
          ws.send(createErrorMessage('INTERNAL_ERROR', 'Failed to process message'))
        }
      }
    },
  })
```

## Client Error Handling

```typescript
// React hook for WebSocket with error handling
function useWebSocket(url: string) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [error, setError] = useState<Error | null>(null)
  const wsRef = useRef<ReconnectingWebSocket | null>(null)

  useEffect(() => {
    const ws = new ReconnectingWebSocket(url)
    wsRef.current = ws

    ws.on('open', () => {
      setStatus('connected')
      setError(null)
    })

    ws.on('close', () => {
      setStatus('disconnected')
    })

    ws.on('error', (err) => {
      setError(err instanceof Error ? err : new Error('WebSocket error'))
    })

    ws.on('maxReconnectAttempts', () => {
      setError(new Error('Could not connect to server'))
    })

    return () => ws.close()
  }, [url])

  const send = useCallback((type: string, payload: unknown) => {
    wsRef.current?.send({ type, payload, timestamp: Date.now() })
  }, [])

  return { status, error, send, ws: wsRef.current }
}
```
