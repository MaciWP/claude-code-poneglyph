import { useRef, useCallback } from 'react'
import type { ActiveAgent, AgentStep, LogEntry } from '../types'
import { updateTaskLogByPredicate, markStepsCompleted, markStepCompleted } from './logUpdaters'

interface UseAgentRegistryOptions {
  setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>
}

export function useAgentRegistry({ setLogs }: UseAgentRegistryOptions) {
  const activeAgentsMapRef = useRef<Map<string, ActiveAgent>>(new Map())
  const currentAgentIdRef = useRef<string | null>(null)
  const toolToParentMapRef = useRef<Map<string, string>>(new Map())
  const agentTypeCounterRef = useRef<Map<string, number>>(new Map())

  const registerAgent = useCallback((
    toolUseId: string,
    subagentType: string,
    description: string
  ): ActiveAgent => {
    const agentUuid = crypto.randomUUID().slice(0, 8)
    const currentCount = agentTypeCounterRef.current.get(subagentType) || 0
    const agentIndex = currentCount + 1
    agentTypeCounterRef.current.set(subagentType, agentIndex)

    const displayName = agentIndex > 1
      ? `Agent: ${subagentType} #${agentIndex}`
      : `Agent: ${subagentType}`

    const agent: ActiveAgent = {
      id: toolUseId,
      name: displayName,
      subagentType,
      description,
      startTime: new Date(),
      steps: [],
      agentUuid,
    }

    activeAgentsMapRef.current.set(toolUseId, agent)
    return agent
  }, [])

  const getAgent = useCallback((toolUseId: string): ActiveAgent | undefined => {
    return activeAgentsMapRef.current.get(toolUseId)
  }, [])

  const deleteAgent = useCallback((toolUseId: string): void => {
    activeAgentsMapRef.current.delete(toolUseId)
    if (currentAgentIdRef.current === toolUseId) {
      currentAgentIdRef.current = null
    }
  }, [])

  const addStepToAgent = useCallback((parentId: string, step: AgentStep): boolean => {
    const agent = activeAgentsMapRef.current.get(parentId)
    if (!agent) return false

    if (step.toolUseId) {
      toolToParentMapRef.current.set(step.toolUseId, parentId)
    }

    agent.steps.push(step)
    agent.lastStepTime = Date.now()

    updateTaskLogByPredicate(
      setLogs,
      log => log.type === 'tool' && log.tool === 'Task' && log.toolUseId === parentId && !log.toolOutput,
      { agentSteps: [...agent.steps] }
    )

    return true
  }, [setLogs])

  const completeStepInAgent = useCallback((parentId: string, toolName: string): void => {
    const agent = activeAgentsMapRef.current.get(parentId)
    if (!agent) return

    agent.steps = markStepCompleted(agent.steps, step => step.tool === toolName)

    updateTaskLogByPredicate(
      setLogs,
      log => log.type === 'tool' && log.tool === 'Task' && log.toolUseId === parentId && !log.toolOutput,
      { agentSteps: [...agent.steps] }
    )
  }, [setLogs])

  const finalizeAgentSteps = useCallback((toolUseId: string): AgentStep[] => {
    const agent = activeAgentsMapRef.current.get(toolUseId)
    if (!agent) return []
    return markStepsCompleted(agent.steps)
  }, [])

  const reset = useCallback((): void => {
    activeAgentsMapRef.current.clear()
    currentAgentIdRef.current = null
    toolToParentMapRef.current.clear()
    agentTypeCounterRef.current.clear()
  }, [])

  return {
    activeAgentsMapRef,
    currentAgentIdRef,
    toolToParentMapRef,
    registerAgent,
    getAgent,
    deleteAgent,
    addStepToAgent,
    completeStepInAgent,
    finalizeAgentSteps,
    reset,
  }
}
