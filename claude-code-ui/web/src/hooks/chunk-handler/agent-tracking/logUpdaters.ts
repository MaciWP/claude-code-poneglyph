import type { LogEntry, AgentStep } from '../types'

type LogsSetter = React.Dispatch<React.SetStateAction<LogEntry[]>>

export function updateTaskLog(
  setLogs: LogsSetter,
  toolUseId: string,
  updates: Partial<LogEntry>
): void {
  setLogs(prev => {
    const idx = prev.findIndex(
      log => log.type === 'tool' && log.tool === 'Task' && log.toolUseId === toolUseId
    )
    if (idx === -1) return prev

    const updated = [...prev]
    updated[idx] = { ...updated[idx], ...updates }
    return updated
  })
}

export function updateTaskLogByPredicate(
  setLogs: LogsSetter,
  predicate: (log: LogEntry) => boolean,
  updates: Partial<LogEntry> | ((log: LogEntry) => Partial<LogEntry>)
): void {
  setLogs(prev => {
    const updated = [...prev]
    for (let i = updated.length - 1; i >= 0; i--) {
      if (predicate(updated[i])) {
        const updateObj = typeof updates === 'function' ? updates(updated[i]) : updates
        updated[i] = { ...updated[i], ...updateObj }
        break
      }
    }
    return updated
  })
}

export function updateLogById(
  setLogs: LogsSetter,
  logId: string,
  updates: Partial<LogEntry>
): void {
  setLogs(prev => {
    const updated = [...prev]
    for (let i = updated.length - 1; i >= 0; i--) {
      if (updated[i].id === logId) {
        updated[i] = { ...updated[i], ...updates }
        break
      }
    }
    return updated
  })
}

export function markStepsCompleted(steps: AgentStep[]): AgentStep[] {
  return steps.map(step =>
    step.status === 'running' ? { ...step, status: 'completed' as const } : step
  )
}

export function markStepCompleted(
  steps: AgentStep[],
  predicate: (step: AgentStep) => boolean
): AgentStep[] {
  let markedOne = false
  return steps.map(step => {
    if (!markedOne && predicate(step) && step.status === 'running') {
      markedOne = true
      return { ...step, status: 'completed' as const }
    }
    return step
  })
}
