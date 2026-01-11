import { useState, useRef, useEffect, useCallback } from 'react'
import type { StreamChunk } from '../types/chat'
import { WS_MAX_RECONNECT_DELAY, WS_BASE_RECONNECT_DELAY } from '../lib/constants'

interface UseWebSocketOptions {
  onMessage: (chunk: StreamChunk) => void
}

interface UseWebSocketReturn {
  isConnected: boolean
  send: (data: unknown) => void
  abort: () => void
  sendUserAnswer: (answer: string) => void
}

export function useWebSocket({ onMessage }: UseWebSocketOptions): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const mountedRef = useRef(true)
  const onMessageRef = useRef(onMessage)
  const currentRequestIdRef = useRef<string | null>(null)
  const retryCountRef = useRef(0)

  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return
    }

    if (!mountedRef.current) {
      return
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    // En desarrollo, conectar directamente al backend para evitar problemas con el proxy de Vite
    const host = import.meta.env.DEV ? 'localhost:8080' : window.location.host
    const wsUrl = `${protocol}//${host}/ws`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      if (mountedRef.current) {
        setIsConnected(true)
        retryCountRef.current = 0
      }
    }

    ws.onclose = () => {
      if (mountedRef.current) {
        setIsConnected(false)
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }
        const backoff = Math.min(
          WS_BASE_RECONNECT_DELAY * Math.pow(2, retryCountRef.current),
          WS_MAX_RECONNECT_DELAY
        )
        retryCountRef.current++
        reconnectTimeoutRef.current = window.setTimeout(() => {
          if (mountedRef.current) {
            connect()
          }
        }, backoff)
      }
    }

    ws.onerror = () => {
      // Error details not useful in browser, connection will close
    }

    ws.onmessage = (event) => {
      try {
        const chunk = JSON.parse(event.data)
        if (chunk.type === 'request_id') {
          currentRequestIdRef.current = chunk.data
          return
        }
        if (chunk.type === 'done') {
          currentRequestIdRef.current = null
        }
        onMessageRef.current(chunk)
      } catch {
        // Parse error - ignore malformed messages
      }
    }

    wsRef.current = ws
  }, [])

  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close()
      }
      wsRef.current = null
    }
  }, [connect])

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  const abort = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'abort',
        data: { requestId: currentRequestIdRef.current }
      }))
    }
  }, [])

  const sendUserAnswer = useCallback((answer: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && currentRequestIdRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'user_answer',
        data: { requestId: currentRequestIdRef.current, answer }
      }))
    }
  }, [])

  return { isConnected, send, abort, sendUserAnswer }
}
