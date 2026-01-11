/**
 * useContextWindow Hook - UI Integration for Context Monitor
 *
 * Listens to WebSocket events for context window state updates.
 */

import { useState, useEffect, useCallback } from 'react'

export type ContextWindowStatus = 'safe' | 'warning' | 'critical' | 'compacting'

export interface ContextWindowState {
  usedTokens: number
  maxTokens: number
  percentage: number
  status: ContextWindowStatus
  breakdown: {
    system: number
    history: number
    tools: number
    current: number
  }
}

export interface ContextWindowEvent {
  type: 'context_window'
  event: 'init' | 'status_changed' | 'threshold_warning' | 'threshold_critical' | 'compaction_started' | 'compaction_completed'
  state?: ContextWindowState
  tokensSaved?: number
}

const DEFAULT_STATE: ContextWindowState = {
  usedTokens: 0,
  maxTokens: 200_000,
  percentage: 0,
  status: 'safe',
  breakdown: {
    system: 0,
    history: 0,
    tools: 0,
    current: 0,
  },
}

export function useContextWindow(ws: WebSocket | null) {
  const [state, setState] = useState<ContextWindowState>(DEFAULT_STATE)
  const [lastThreshold, setLastThreshold] = useState<'warning' | 'critical' | null>(null)
  const [isCompacting, setIsCompacting] = useState(false)
  const [compactionSaved, setCompactionSaved] = useState<number | null>(null)

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type !== 'context_window') return

      const contextEvent = data as ContextWindowEvent

      switch (contextEvent.event) {
        case 'init':
        case 'status_changed':
          if (contextEvent.state) {
            setState(contextEvent.state)
            if (contextEvent.state.status !== 'compacting') {
              setIsCompacting(false)
            }
          }
          break

        case 'threshold_warning':
          setLastThreshold('warning')
          if (contextEvent.state) {
            setState(contextEvent.state)
          }
          break

        case 'threshold_critical':
          setLastThreshold('critical')
          if (contextEvent.state) {
            setState(contextEvent.state)
          }
          break

        case 'compaction_started':
          setIsCompacting(true)
          break

        case 'compaction_completed':
          setIsCompacting(false)
          setCompactionSaved(contextEvent.tokensSaved ?? null)
          setTimeout(() => setCompactionSaved(null), 5000)
          break
      }
    } catch {
      // Ignore non-JSON messages
    }
  }, [])

  useEffect(() => {
    if (!ws) return

    ws.addEventListener('message', handleMessage)
    return () => ws.removeEventListener('message', handleMessage)
  }, [ws, handleMessage])

  const clearThresholdAlert = useCallback(() => {
    setLastThreshold(null)
  }, [])

  return {
    state,
    lastThreshold,
    isCompacting,
    compactionSaved,
    clearThresholdAlert,
    isAtRisk: state.status === 'warning' || state.status === 'critical',
    remainingTokens: state.maxTokens - state.usedTokens,
    remainingPercentage: 1 - state.percentage,
  }
}
