import { useCallback } from 'react'
import type { LogEntry, ActiveContext, Agent, AgentType, AgentStatus } from './types'
import { AGENT_TIMEOUT_MS } from '../../lib/constants'
import { useAgentRegistry, useParallelExecution, updateTaskLog } from './agent-tracking'

interface UseAgentTrackingOptions {
  setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>
  setActiveContext: React.Dispatch<React.SetStateAction<ActiveContext>>
  setSessionAgents?: React.Dispatch<React.SetStateAction<Agent[]>>
  claudeSessionId: string | null
}

export function useAgentTracking({
  setLogs,
  setActiveContext,
  setSessionAgents,
  claudeSessionId,
}: UseAgentTrackingOptions) {
  const registry = useAgentRegistry({ setLogs })

  const parallel = useParallelExecution({
    setLogs,
    toolToParentMapRef: registry.toolToParentMapRef,
    getActiveAgentCount: () => registry.activeAgentsMapRef.current.size,
  })

  const completeAgent = useCallback((toolUseId: string, output?: string) => {
    const finalSteps = registry.finalizeAgentSteps(toolUseId)
    registry.deleteAgent(toolUseId)

    updateTaskLog(setLogs, toolUseId, {
      toolOutput: output || '',
      agentTools: finalSteps.map(s => s.tool),
      agentSteps: finalSteps,
    })

    setActiveContext(prev => ({
      ...prev,
      toolHistory: prev.toolHistory.map(tool =>
        tool.type === 'agent' && tool.status === 'running' && tool.toolUseId === toolUseId
          ? { ...tool, status: 'completed' as const }
          : tool
      )
    }))

    if (registry.activeAgentsMapRef.current.size === 0) {
      parallel.finalizeParallelExecution()
    }
  }, [setLogs, setActiveContext, registry, parallel])

  const handleAgentEvent = useCallback((
    event: 'created' | 'started' | 'completed' | 'failed',
    agentId: string,
    agentType?: string,
    task?: string,
    result?: string,
    error?: string,
    toolUseId?: string
  ) => {
    if (event === 'completed' || event === 'failed') {
      const effectiveId = toolUseId || agentId

      if (effectiveId) {
        setActiveContext(prev => {
          const hasMatch = prev.toolHistory.some(t =>
            t.type === 'agent' && t.toolUseId === effectiveId && t.status === 'running'
          )
          if (!hasMatch) return prev

          return {
            ...prev,
            toolHistory: prev.toolHistory.map(tool =>
              tool.type === 'agent' && tool.toolUseId === effectiveId && tool.status === 'running'
                ? { ...tool, status: event === 'completed' ? 'completed' as const : 'failed' as const }
                : tool
            )
          }
        })

        setLogs(prev => {
          const idx = prev.findIndex(
            log => log.type === 'tool' && log.tool === 'Task' && log.toolUseId === effectiveId
          )
          if (idx === -1) return prev

          const updated = [...prev]
          updated[idx] = {
            ...updated[idx],
            agentStatus: event,
            agentError: event === 'failed' ? error : undefined,
            toolOutput: event === 'completed'
              ? result || '✅ Agent finished'
              : `❌ ${error || 'Agent failed'}`
          }
          return updated
        })

        registry.activeAgentsMapRef.current.delete(effectiveId)
      }
    }

    if (setSessionAgents) {
      updateSessionAgents(setSessionAgents, event, agentId, agentType, task, result, error, claudeSessionId)
    }
  }, [setActiveContext, setLogs, setSessionAgents, claudeSessionId, registry])

  const checkStuckAgents = useCallback(() => {
    const now = Date.now()
    const timedOutIds: string[] = []

    for (const [id, agent] of registry.activeAgentsMapRef.current) {
      const timeSinceLastStep = now - (agent.lastStepTime || agent.startTime.getTime())
      if (timeSinceLastStep > AGENT_TIMEOUT_MS) {
        timedOutIds.push(id)
        registry.activeAgentsMapRef.current.delete(id)
      }
    }

    if (timedOutIds.length > 0) {
      setLogs(prev => prev.map(log =>
        log.toolUseId && timedOutIds.includes(log.toolUseId) && !log.toolOutput
          ? { ...log, agentStatus: 'failed' as const, agentError: 'Timeout: Agent did not respond', toolOutput: '⏱️ Agent timed out' }
          : log
      ))

      setActiveContext(prev => ({
        ...prev,
        toolHistory: prev.toolHistory.map(tool =>
          tool.toolUseId && timedOutIds.includes(tool.toolUseId) && tool.status === 'running'
            ? { ...tool, status: 'failed' as const }
            : tool
        )
      }))
    }
  }, [setLogs, setActiveContext, registry])

  const reset = useCallback(() => {
    registry.reset()
    parallel.reset()
  }, [registry, parallel])

  const cleanupOnDone = useCallback(() => {
    setLogs(prev => {
      const updated = [...prev]
      let markedCount = 0

      for (let i = 0; i < updated.length; i++) {
        if (updated[i].type === 'tool' && updated[i].tool === 'Task' && !updated[i].toolOutput) {
          const toolUseId = updated[i].toolUseId
          const wasStillRunning = toolUseId && registry.activeAgentsMapRef.current.has(toolUseId)

          updated[i] = {
            ...updated[i],
            agentStatus: wasStillRunning ? 'failed' as const : 'completed' as const,
            agentError: wasStillRunning ? 'Stream ended unexpectedly' : undefined,
            toolOutput: wasStillRunning ? '⚠️ Agent interrupted' : '✅ Agent finished',
          }
          markedCount++
        }
      }
      return markedCount > 0 ? updated : prev
    })

    registry.activeAgentsMapRef.current.clear()
    registry.currentAgentIdRef.current = null

    setActiveContext(prev => ({
      ...prev,
      agent: prev.agent ? { ...prev.agent, status: 'idle' } : undefined,
      toolHistory: prev.toolHistory.map(tool =>
        tool.status === 'running' ? { ...tool, status: 'completed' as const } : tool
      )
    }))
  }, [setLogs, setActiveContext, registry])

  return {
    activeAgentsMapRef: registry.activeAgentsMapRef,
    currentAgentIdRef: registry.currentAgentIdRef,
    toolToParentMapRef: registry.toolToParentMapRef,
    parallelExecutionIdRef: parallel.parallelExecutionIdRef,
    parallelExecutionStepsRef: parallel.parallelExecutionStepsRef,
    registerAgent: registry.registerAgent,
    addStepToAgent: registry.addStepToAgent,
    addStepToParallelExecution: parallel.addStepToParallelExecution,
    completeAgent,
    completeParallelStep: parallel.completeParallelStep,
    completeStepInAgent: registry.completeStepInAgent,
    handleAgentEvent,
    checkStuckAgents,
    reset,
    cleanupOnDone,
  }
}

function updateSessionAgents(
  setSessionAgents: React.Dispatch<React.SetStateAction<Agent[]>>,
  event: 'created' | 'started' | 'completed' | 'failed',
  agentId: string,
  agentType?: string,
  task?: string,
  result?: string,
  error?: string,
  claudeSessionId?: string | null
): void {
  setSessionAgents(prev => {
    const existing = prev.find(a => a.id === agentId)

    if (!existing && event === 'created') {
      return [...prev, {
        id: agentId,
        type: (agentType || 'general-purpose') as AgentType,
        sessionId: claudeSessionId || '',
        status: 'pending' as AgentStatus,
        task: task || '',
        createdAt: new Date().toISOString(),
        parentAgentId: undefined
      }]
    }

    if (existing) {
      return prev.map(a => {
        if (a.id !== agentId) return a

        switch (event) {
          case 'started':
            return { ...a, status: 'active' as AgentStatus, startedAt: new Date().toISOString() }
          case 'completed':
            return { ...a, status: 'completed' as AgentStatus, completedAt: new Date().toISOString(), result }
          case 'failed':
            return { ...a, status: 'failed' as AgentStatus, error }
          default:
            return a
        }
      })
    }
    return prev
  })
}
