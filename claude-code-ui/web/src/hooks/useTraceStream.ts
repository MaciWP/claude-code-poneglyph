import { useState, useCallback, useMemo } from 'react'
import type { ExecutionTrace, AgentTrace, TraceEvent } from '@shared/types'

export type { ExecutionTrace, AgentTrace }

interface UseTraceStreamReturn {
  activeTraces: ExecutionTrace[]
  completedTraces: ExecutionTrace[]
  latestTrace: ExecutionTrace | null
  handleTraceEvent: (event: TraceEvent) => void
}

type TraceUpdater = React.Dispatch<React.SetStateAction<ExecutionTrace[]>>

function updateTraceById(
  prev: ExecutionTrace[],
  traceId: string,
  updater: (t: ExecutionTrace) => ExecutionTrace
): ExecutionTrace[] {
  return prev.map((t) => (t.id === traceId ? updater(t) : t))
}

function handleStart(set: TraceUpdater, trace: ExecutionTrace): void {
  set((prev) => [trace, ...prev])
}

function handleUpdate(set: TraceUpdater, trace: ExecutionTrace): void {
  set((prev) => {
    const exists = prev.some((t) => t.id === trace.id)
    if (!exists) return [trace, ...prev]
    return updateTraceById(prev, trace.id, () => trace)
  })
}

function handleAgentStart(set: TraceUpdater, trace: ExecutionTrace): void {
  set((prev) => {
    const exists = prev.some((t) => t.id === trace.id)
    if (!exists) return [trace, ...prev]
    return updateTraceById(prev, trace.id, () => trace)
  })
}

function handleAgentComplete(set: TraceUpdater, trace: ExecutionTrace): void {
  set((prev) => {
    const exists = prev.some((t) => t.id === trace.id)
    if (!exists) return [trace, ...prev]
    return updateTraceById(prev, trace.id, () => trace)
  })
}

function handleComplete(set: TraceUpdater, trace: ExecutionTrace): void {
  set((prev) => {
    const exists = prev.some((t) => t.id === trace.id)
    if (!exists) return [trace, ...prev]
    return updateTraceById(prev, trace.id, () => trace)
  })
}

const EVENT_HANDLERS: Record<string, (set: TraceUpdater, trace: ExecutionTrace) => void> = {
  'trace:start': handleStart,
  'trace:update': handleUpdate,
  'trace:agent_start': handleAgentStart,
  'trace:agent_complete': handleAgentComplete,
  'trace:complete': handleComplete,
}

export function useTraceStream(): UseTraceStreamReturn {
  const [traces, setTraces] = useState<ExecutionTrace[]>([])

  const handleTraceEvent = useCallback((event: TraceEvent) => {
    const handler = EVENT_HANDLERS[event.type]
    if (handler) {
      handler(setTraces, event.trace)
    }
  }, [])

  const activeTraces = useMemo(() => traces.filter((t) => t.status === 'running'), [traces])
  const completedTraces = useMemo(() => traces.filter((t) => t.status !== 'running'), [traces])
  const latestTrace = traces[0] || null

  return { activeTraces, completedTraces, latestTrace, handleTraceEvent }
}
