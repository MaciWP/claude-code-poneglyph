import type { ContextWindowState } from '@shared/types'
import type { ContextListeners, WebSocketWithSend } from './types'
import { contextWindowMonitor } from '../../services/context-window-monitor'

// Context window listeners per WebSocket
const wsContextListeners = new Map<unknown, ContextListeners>()

/**
 * Setup context window monitoring for a WebSocket connection
 */
export function setupContextWindowMonitoring(ws: WebSocketWithSend): void {
  const contextMonitor = contextWindowMonitor

  const statusChanged = (state: ContextWindowState) => {
    ws.send(JSON.stringify({
      type: 'context_window',
      event: 'status_changed',
      state,
    }))
  }

  const thresholdWarning = (state: ContextWindowState) => {
    ws.send(JSON.stringify({
      type: 'context_window',
      event: 'threshold_warning',
      state,
    }))
  }

  const thresholdCritical = (state: ContextWindowState) => {
    ws.send(JSON.stringify({
      type: 'context_window',
      event: 'threshold_critical',
      state,
    }))
  }

  const compactionStarted = () => {
    ws.send(JSON.stringify({
      type: 'context_window',
      event: 'compaction_started',
    }))
  }

  const compactionCompleted = (tokensSaved: number) => {
    ws.send(JSON.stringify({
      type: 'context_window',
      event: 'compaction_completed',
      tokensSaved,
    }))
  }

  contextMonitor.on('status:changed', statusChanged)
  contextMonitor.on('threshold:warning', thresholdWarning)
  contextMonitor.on('threshold:critical', thresholdCritical)
  contextMonitor.on('compaction:started', compactionStarted)
  contextMonitor.on('compaction:completed', compactionCompleted)

  wsContextListeners.set(ws, {
    statusChanged,
    thresholdWarning,
    thresholdCritical,
    compactionStarted,
    compactionCompleted,
  })

  ws.send(JSON.stringify({
    type: 'context_window',
    event: 'init',
    state: contextMonitor.getState(),
  }))
}

/**
 * Cleanup context window monitoring for a WebSocket connection
 */
export function cleanupContextWindowMonitoring(ws: unknown): void {
  const contextListeners = wsContextListeners.get(ws)
  if (contextListeners) {
    const contextMonitor = contextWindowMonitor
    contextMonitor.off('status:changed', contextListeners.statusChanged)
    contextMonitor.off('threshold:warning', contextListeners.thresholdWarning)
    contextMonitor.off('threshold:critical', contextListeners.thresholdCritical)
    contextMonitor.off('compaction:started', contextListeners.compactionStarted)
    contextMonitor.off('compaction:completed', contextListeners.compactionCompleted)
    wsContextListeners.delete(ws)
  }
}
