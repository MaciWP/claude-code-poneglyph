import { useRef, useCallback, startTransition } from 'react'
import type { UseChunkHandlerOptions, StreamChunk, ToolUse, AgentStep, ContextChunk, TodoItem } from './types'
import { classifyTool, normalizeContent, extractShortInput } from './utils'
import { useLogManagement } from './useLogManagement'
import { useAgentTracking } from './useAgentTracking'

export function useChunkHandler({
  setLogs,
  setClaudeSessionId,
  setIsProcessing,
  setActiveContext,
  setSessionStats,
  setUsage,
  onSessionUpdate,
  claudeSessionId,
  activeContext,
  onDone,
  onExitPlanMode,
  setSessionAgents,
  setScopedTodos,
  setWaitingForAnswer,
  onLearningEvent,
}: UseChunkHandlerOptions) {
  const currentResponseRef = useRef<string | null>(null)
  const currentThinkingRef = useRef<string | null>(null)
  const seenToolUseIdsRef = useRef<Set<string>>(new Set())
  const seenAskUserQuestionsRef = useRef<Set<string>>(new Set())

  const { addLog, updateLastLogOfType, updateLastToolLog } = useLogManagement({ setLogs })

  const agentTracking = useAgentTracking({
    setLogs,
    setActiveContext,
    setSessionAgents,
    claudeSessionId,
  })

  const handleChunk = useCallback((chunk: StreamChunk) => {
    if (chunk.sessionId && !claudeSessionId) {
      setClaudeSessionId(chunk.sessionId)
    }

    switch (chunk.type) {
      case 'init':
        addLog('init', `Session initialized: ${chunk.sessionId}`)
        currentResponseRef.current = null
        currentThinkingRef.current = null
        break

      case 'text':
        if (currentResponseRef.current === null) {
          currentResponseRef.current = normalizeContent(chunk.data)
          addLog('response', currentResponseRef.current)
        } else {
          currentResponseRef.current += normalizeContent(chunk.data)
          updateLastLogOfType('response', currentResponseRef.current)
        }
        break

      case 'thinking':
        if (currentThinkingRef.current === null) {
          currentThinkingRef.current = normalizeContent(chunk.data)
          addLog('thinking', currentThinkingRef.current)
        } else {
          currentThinkingRef.current += normalizeContent(chunk.data)
          updateLastLogOfType('thinking', currentThinkingRef.current)
        }
        break

      case 'tool_use': {
        currentResponseRef.current = null
        currentThinkingRef.current = null
        const toolName = chunk.tool || ''
        const toolType = classifyTool(toolName, chunk.toolInput)

        if (chunk.toolUseId && seenToolUseIdsRef.current.has(chunk.toolUseId)) {
          break
        }
        if (chunk.toolUseId) {
          seenToolUseIdsRef.current.add(chunk.toolUseId)
        }

        // Handle TodoWrite
        if (toolName === 'TodoWrite' && chunk.toolInput) {
          const input = chunk.toolInput as { todos?: TodoItem[] }
          if (input.todos && Array.isArray(input.todos) && setScopedTodos) {
            const parentId = chunk.parentToolUseId
            if (!parentId) {
              setScopedTodos(prev => ({ ...prev, global: input.todos! }))
            } else {
              setScopedTodos(prev => {
                const newByAgent = new Map(prev.byAgent)
                newByAgent.set(parentId, input.todos!)
                return { ...prev, byAgent: newByAgent }
              })
              setLogs(prev => {
                const updated = [...prev]
                for (let i = updated.length - 1; i >= 0; i--) {
                  if (updated[i].type === 'tool' && updated[i].tool === 'Task' && updated[i].toolUseId === parentId) {
                    updated[i] = { ...updated[i], agentTodos: input.todos! }
                    break
                  }
                }
                return updated
              })
            }
          }
        }

        if (toolName === 'ExitPlanMode' && onExitPlanMode) {
          onExitPlanMode()
        }

        if (toolName === 'AskUserQuestion') {
          const contentHash = JSON.stringify(chunk.toolInput || '')
          if (seenAskUserQuestionsRef.current.has(contentHash)) {
            break
          }
          seenAskUserQuestionsRef.current.add(contentHash)
          if (setWaitingForAnswer) {
            setWaitingForAnswer(true)
          }
        }

        // Register agent if Task tool
        if (toolType === 'agent' && chunk.toolInput && chunk.toolUseId) {
          const input = chunk.toolInput as Record<string, unknown>
          const subagentType = (input.subagent_type as string) || 'unknown'
          const description = (input.description as string) || (input.prompt as string)?.slice(0, 80) || 'Processing...'
          agentTracking.registerAgent(chunk.toolUseId, subagentType, description)
        }

        // Handle agent tools
        const activeAgentCount = agentTracking.activeAgentsMapRef.current.size
        if (activeAgentCount > 0 && toolType !== 'agent') {
          const newStep: AgentStep = {
            tool: toolName,
            timestamp: new Date(),
            status: 'running',
            input: extractShortInput(chunk.toolInput),
            toolUseId: chunk.toolUseId,
          }

          if (activeAgentCount === 1) {
            const [onlyAgentId] = [...agentTracking.activeAgentsMapRef.current.keys()]
            agentTracking.addStepToAgent(onlyAgentId, newStep)
          } else {
            agentTracking.addStepToParallelExecution(newStep)
          }

          setSessionStats(prev => ({ ...prev, toolUseCount: prev.toolUseCount + 1 }))
          break
        }

        // Create main log entry
        const now = new Date()
        const activeAgent = toolType === 'agent' && chunk.toolUseId
          ? agentTracking.activeAgentsMapRef.current.get(chunk.toolUseId)
          : undefined

        setLogs(prev => [...prev, {
          id: crypto.randomUUID(),
          type: 'tool',
          content: `Using ${toolName}`,
          timestamp: now,
          tool: toolName,
          toolInput: chunk.toolInput,
          toolUseId: chunk.toolUseId,
          agentUuid: activeAgent?.agentUuid,
          agent: activeContext.agent?.name,
          agentStartTime: toolType === 'agent' ? now : undefined,
          agentTodos: toolType === 'agent' ? [] : undefined,
        }])

        setSessionStats(prev => ({ ...prev, toolUseCount: prev.toolUseCount + 1 }))

        startTransition(() => {
          setActiveContext(prev => {
            const newToolUse: ToolUse = {
              name: toolName,
              type: toolType,
              timestamp: new Date(),
              status: 'running',
              toolUseId: chunk.toolUseId,
              input: chunk.toolInput
                ? (typeof chunk.toolInput === 'string'
                    ? chunk.toolInput.slice(0, 200)
                    : JSON.stringify(chunk.toolInput).slice(0, 500))
                : undefined,
            }

            if (toolType === 'agent' && chunk.toolUseId) {
              const agent = agentTracking.activeAgentsMapRef.current.get(chunk.toolUseId)
              if (agent) {
                newToolUse.name = agent.name
              }
            }

            if (toolType === 'mcp') {
              const parts = toolName.split('__')
              if (parts.length >= 2) {
                newToolUse.name = `MCP: ${parts[1]}`
                if (!prev.mcpServers.includes(parts[1])) {
                  return {
                    ...prev,
                    tools: prev.tools.includes(toolName) ? prev.tools : [...prev.tools, toolName],
                    toolHistory: [...prev.toolHistory.slice(-20), newToolUse],
                    mcpServers: [...prev.mcpServers, parts[1]],
                  }
                }
              }
            }

            return {
              ...prev,
              tools: prev.tools.includes(toolName) ? prev.tools : [...prev.tools, toolName],
              toolHistory: [...prev.toolHistory.slice(-20), newToolUse],
            }
          })
        })
        break
      }

      case 'tool_result': {
        const isExplicitAgentResult = chunk.tool === 'Task' || chunk.tool === 'TaskOutput'
        const agentByToolUseId = chunk.toolUseId ? agentTracking.activeAgentsMapRef.current.get(chunk.toolUseId) : null
        const parentAgentIdFromMap = chunk.toolUseId ? agentTracking.toolToParentMapRef.current.get(chunk.toolUseId) : null

        // Case 1: Agent final result
        if (agentByToolUseId && chunk.toolUseId) {
          agentTracking.completeAgent(chunk.toolUseId, chunk.toolOutput)
          break
        }

        // Case 2: Parallel execution tool result
        if (parentAgentIdFromMap === '__parallel__' && chunk.toolUseId) {
          agentTracking.completeParallelStep(chunk.toolUseId)
          break
        }

        // Case 3: Subagent tool result
        const hasActiveAgent = agentTracking.activeAgentsMapRef.current.size > 0
        const isSubagentToolResult = hasActiveAgent && chunk.tool && !isExplicitAgentResult
        if (isSubagentToolResult && parentAgentIdFromMap && parentAgentIdFromMap !== '__parallel__') {
          agentTracking.completeStepInAgent(parentAgentIdFromMap, chunk.tool!)
          break
        }

        // Case 4: Normal tool result by toolUseId
        if (chunk.tool && chunk.toolUseId) {
          setLogs(prev => {
            const idx = prev.findIndex(log =>
              log.type === 'tool' && log.toolUseId === chunk.toolUseId && !log.toolOutput
            )
            if (idx === -1) return prev
            const updated = [...prev]
            updated[idx] = { ...updated[idx], toolOutput: chunk.toolOutput || '' }
            return updated
          })

          startTransition(() => {
            setActiveContext(prev => ({
              ...prev,
              toolHistory: prev.toolHistory.map(tool => {
                if (tool.toolUseId === chunk.toolUseId && tool.status === 'running') {
                  return { ...tool, status: 'completed' as const }
                }
                return tool
              })
            }))
          })
          break
        }

        // Case 5: Fallback
        if (chunk.tool && !hasActiveAgent) {
          updateLastToolLog(chunk.toolOutput || '')
          startTransition(() => {
            setActiveContext(prev => ({
              ...prev,
              toolHistory: prev.toolHistory.map(tool => {
                if (tool.name === chunk.tool && tool.status === 'running') {
                  return { ...tool, status: 'completed' as const }
                }
                return tool
              })
            }))
          })
        }
        break
      }

      case 'result':
        currentResponseRef.current = null
        currentThinkingRef.current = null
        if (chunk.usage && setUsage) {
          // Acumular tokens en lugar de reemplazar (para incluir sub-agentes)
          setUsage(prev => {
            if (!prev) return chunk.usage
            return {
              inputTokens: (prev.inputTokens || 0) + (chunk.usage!.inputTokens || 0),
              outputTokens: (prev.outputTokens || 0) + (chunk.usage!.outputTokens || 0),
              cacheCreationTokens: (prev.cacheCreationTokens || 0) + (chunk.usage!.cacheCreationTokens || 0),
              cacheReadTokens: (prev.cacheReadTokens || 0) + (chunk.usage!.cacheReadTokens || 0),
              totalTokens: (prev.totalTokens || 0) + (chunk.usage!.totalTokens || 0),
              contextPercent: chunk.usage!.contextPercent || prev.contextPercent || 0,
            }
          })
        }
        break

      case 'error':
        addLog('error', normalizeContent(chunk.data))
        setIsProcessing(false)
        setActiveContext(prev => ({
          ...prev,
          agent: prev.agent ? { ...prev.agent, status: 'idle' } : undefined
        }))
        break

      case 'done':
        setIsProcessing(false)
        onSessionUpdate()
        onDone?.()
        agentTracking.cleanupOnDone()
        currentResponseRef.current = null
        currentThinkingRef.current = null
        break

      case 'context': {
        const contextChunk = chunk as unknown as ContextChunk
        const contextId = crypto.randomUUID()

        setLogs(prev => [...prev, {
          id: contextId,
          type: 'init',
          content: `context:${contextChunk.contextType}:${contextChunk.name}`,
          timestamp: new Date(),
          toolInput: contextChunk.memories
            ? { detail: contextChunk.detail, memories: contextChunk.memories }
            : contextChunk.detail,
        }])

        setActiveContext(prev => ({
          ...prev,
          ...(contextChunk.contextType === 'skill' ? { skill: contextChunk.name } : {}),
          ...(contextChunk.contextType === 'command' ? { command: contextChunk.name } : {}),
          ...(contextChunk.contextType === 'rule' ? {
            rules: prev.rules.includes(contextChunk.name) ? prev.rules : [...prev.rules, contextChunk.name]
          } : {}),
        }))
        break
      }

      case 'agent_event': {
        const { event, agentId, agentType, task, result, error, toolUseId: eventToolUseId } = chunk as unknown as {
          event: 'created' | 'started' | 'completed' | 'failed'
          agentId: string
          agentType?: string
          task?: string
          result?: string
          error?: string
          toolUseId?: string
        }
        agentTracking.handleAgentEvent(event, agentId, agentType, task, result, error, eventToolUseId)
        break
      }

      case 'learning_event': {
        if (onLearningEvent) {
          const { event, expertId, changes, error: learningError } = chunk as unknown as {
            event: 'started' | 'completed' | 'failed'
            expertId: string
            changes?: { type: string; description: string }[]
            error?: string
          }
          onLearningEvent({
            type: `learning:${event}` as 'learning:started' | 'learning:completed' | 'learning:failed',
            expertId,
            changes: changes as import('../useLearningEvents').LearningChange[],
            error: learningError,
          })
        }
        break
      }

      case 'agent_result': {
        // Acumular tokens del sub-agente al total de la sesión
        const agentResult = chunk as unknown as {
          agentId: string
          success: boolean
          usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number }
        }
        if (agentResult.usage && setUsage) {
          setUsage(prev => {
            if (!prev) return prev
            return {
              ...prev,
              inputTokens: (prev.inputTokens || 0) + (agentResult.usage!.inputTokens || 0),
              outputTokens: (prev.outputTokens || 0) + (agentResult.usage!.outputTokens || 0),
              totalTokens: (prev.totalTokens || 0) + (agentResult.usage!.totalTokens || 0),
            }
          })
        }
        break
      }
    }
  }, [
    claudeSessionId,
    activeContext.agent?.name,
    addLog,
    updateLastLogOfType,
    updateLastToolLog,
    setClaudeSessionId,
    setLogs,
    setSessionStats,
    setActiveContext,
    setIsProcessing,
    onSessionUpdate,
    onDone,
    onExitPlanMode,
    setScopedTodos,
    setWaitingForAnswer,
    setUsage,
    agentTracking,
    onLearningEvent,
  ])

  const resetRefs = useCallback(() => {
    currentResponseRef.current = null
    currentThinkingRef.current = null
    seenToolUseIdsRef.current.clear()
    seenAskUserQuestionsRef.current.clear()
    agentTracking.reset()
  }, [agentTracking])

  return {
    handleChunk,
    addLog,
    resetRefs,
    checkStuckAgents: agentTracking.checkStuckAgents,
    activeAgentsMapRef: agentTracking.activeAgentsMapRef,
  }
}

export type { UseChunkHandlerOptions } from './types'
