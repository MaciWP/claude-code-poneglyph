import { useCallback } from 'react'
import type { LogEntry } from './types'

interface UseLogManagementOptions {
  setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>
}

export function useLogManagement({ setLogs }: UseLogManagementOptions) {
  const addLog = useCallback((
    type: LogEntry['type'],
    content: string,
    tool?: string,
    toolInput?: unknown,
    images?: string[]
  ) => {
    setLogs(prev => [...prev, {
      id: crypto.randomUUID(),
      type,
      content,
      timestamp: new Date(),
      tool,
      toolInput,
      images,
    }])
  }, [setLogs])

  const updateLastLogOfType = useCallback((type: LogEntry['type'], content: string) => {
    setLogs(prev => {
      let lastIndex = -1
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].type === type) {
          lastIndex = i
          break
        }
      }
      if (lastIndex === -1) return prev

      const updated = [...prev]
      updated[lastIndex] = { ...updated[lastIndex], content }
      return updated
    })
  }, [setLogs])

  const updateLastToolLog = useCallback((output: string) => {
    setLogs(prev => {
      let lastToolIndex = -1
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].type === 'tool') {
          lastToolIndex = i
          break
        }
      }
      if (lastToolIndex === -1) return prev

      const updated = [...prev]
      updated[lastToolIndex] = { ...updated[lastToolIndex], toolOutput: output }
      return updated
    })
  }, [setLogs])

  const updateLogByToolUseId = useCallback((toolUseId: string, updates: Partial<LogEntry>) => {
    setLogs(prev => {
      const idx = prev.findIndex(log => log.toolUseId === toolUseId)
      if (idx === -1) return prev
      const updated = [...prev]
      updated[idx] = { ...updated[idx], ...updates }
      return updated
    })
  }, [setLogs])

  const updateLogById = useCallback((id: string, updates: Partial<LogEntry>) => {
    setLogs(prev => {
      const idx = prev.findIndex(log => log.id === id)
      if (idx === -1) return prev
      const updated = [...prev]
      updated[idx] = { ...updated[idx], ...updates }
      return updated
    })
  }, [setLogs])

  return {
    addLog,
    updateLastLogOfType,
    updateLastToolLog,
    updateLogByToolUseId,
    updateLogById,
  }
}
