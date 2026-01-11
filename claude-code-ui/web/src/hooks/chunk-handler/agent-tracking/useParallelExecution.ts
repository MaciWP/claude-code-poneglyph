import { useRef, useCallback } from 'react'
import type { AgentStep, LogEntry } from '../types'
import { updateLogById, markStepsCompleted, markStepCompleted } from './logUpdaters'

interface UseParallelExecutionOptions {
  setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>
  toolToParentMapRef: React.MutableRefObject<Map<string, string>>
  getActiveAgentCount: () => number
}

export function useParallelExecution({
  setLogs,
  toolToParentMapRef,
  getActiveAgentCount,
}: UseParallelExecutionOptions) {
  const parallelExecutionIdRef = useRef<string | null>(null)
  const parallelExecutionStepsRef = useRef<AgentStep[]>([])

  const addStepToParallelExecution = useCallback((step: AgentStep): void => {
    if (step.toolUseId) {
      toolToParentMapRef.current.set(step.toolUseId, '__parallel__')
    }

    parallelExecutionStepsRef.current.push(step)
    const activeAgentCount = getActiveAgentCount()

    if (!parallelExecutionIdRef.current) {
      const parallelId = crypto.randomUUID()
      parallelExecutionIdRef.current = parallelId

      setLogs(prev => [...prev, {
        id: parallelId,
        type: 'tool' as const,
        content: 'Parallel Execution',
        timestamp: new Date(),
        tool: 'ParallelExecution',
        toolInput: { activeAgentCount },
        agentSteps: [...parallelExecutionStepsRef.current],
      }])
    } else {
      updateLogById(setLogs, parallelExecutionIdRef.current, {
        toolInput: { activeAgentCount },
        agentSteps: [...parallelExecutionStepsRef.current],
      })
    }
  }, [setLogs, toolToParentMapRef, getActiveAgentCount])

  const completeParallelStep = useCallback((toolUseId: string): void => {
    parallelExecutionStepsRef.current = markStepCompleted(
      parallelExecutionStepsRef.current,
      step => step.toolUseId === toolUseId
    )

    toolToParentMapRef.current.delete(toolUseId)

    if (parallelExecutionIdRef.current) {
      updateLogById(setLogs, parallelExecutionIdRef.current, {
        agentSteps: [...parallelExecutionStepsRef.current],
      })
    }
  }, [setLogs, toolToParentMapRef])

  const finalizeParallelExecution = useCallback((): void => {
    if (!parallelExecutionIdRef.current) return

    const finalSteps = markStepsCompleted(parallelExecutionStepsRef.current)

    updateLogById(setLogs, parallelExecutionIdRef.current, {
      toolOutput: 'completed',
      agentSteps: finalSteps,
    })

    parallelExecutionIdRef.current = null
    parallelExecutionStepsRef.current = []
  }, [setLogs])

  const reset = useCallback((): void => {
    parallelExecutionIdRef.current = null
    parallelExecutionStepsRef.current = []
  }, [])

  const isActive = useCallback((): boolean => {
    return parallelExecutionIdRef.current !== null
  }, [])

  return {
    parallelExecutionIdRef,
    parallelExecutionStepsRef,
    addStepToParallelExecution,
    completeParallelStep,
    finalizeParallelExecution,
    reset,
    isActive,
  }
}
