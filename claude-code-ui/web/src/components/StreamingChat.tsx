import { useRef, useEffect, useCallback, useMemo } from 'react'
import type { Session, ClaudeConfig, ModelProvider } from '../lib/api'
import { getClaudeConfig, getSessionAgents } from '../lib/api'
import type { ClaudeModes } from '../App'
import type { FilterType, QuickToolItem } from '../types/chat'
import { STORAGE_KEYS } from '../types/preferences'
import { useWebSocket } from '../hooks/useWebSocket'
import { useChunkHandler } from '../hooks/useChunkHandler'
import { useEnhancedActivity } from '../hooks/useEnhancedActivity'
import { useImagePaste } from '../hooks/useImagePaste'
import { useLogFilter } from '../hooks/useLogFilter'
import { useSmartScroll } from '../hooks/useScrollToBottom'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useChatReducer } from '../hooks/useChatReducer'
import { useQuickTools } from '../hooks/useQuickTools'
import { Icons } from '../lib/icons'
import { reconstructFromSession } from '../lib/reconstructSession'
import RightPanel from './RightPanel'
import TodoBar from './TodoBar'
import { LogEntryView, ContextPanel, FilterBar, ImageModal, BottomControlsArea } from './streaming-chat'
import { useLearningEvents } from '../hooks/useLearningEvents'

interface Props {
  session: Session
  modes: ClaudeModes
  provider: ModelProvider
  onSessionUpdate: () => void
  onExitPlanMode?: () => void
  onModeToggle?: (mode: keyof ClaudeModes) => void
}

export default function StreamingChat({ session, modes, provider, onSessionUpdate, onExitPlanMode, onModeToggle }: Props) {
  const { state, actions, compatibleSetters } = useChatReducer()
  const [filter, setFilter] = useLocalStorage<FilterType>(STORAGE_KEYS.FILTER, 'all')
  const [claudeConfig, setClaudeConfig] = useLocalStorage<ClaudeConfig>(STORAGE_KEYS.CLAUDE_CONFIG, { agents: [], skills: [], commands: [] })
  const [isContextPanelOpen, setIsContextPanelOpen] = useLocalStorage(STORAGE_KEYS.CONTEXT_PANEL, true)
  const { events: learningEvents, addEvent: addLearningEvent } = useLearningEvents()

  const { pastedImages, handlePaste, removeImage, clearImages } = useImagePaste()
  const { filteredLogs } = useLogFilter({ logs: state.logs, filter })
  const scrollDeps = useMemo(() => [state.logs.length], [state.logs.length])
  const { containerRef: logsContainerRef, isAutoScrollPaused, scrollToBottom } = useSmartScroll(scrollDeps)

  // QuickTools integration
  const handleSelectTool = useCallback((tool: QuickToolItem) => {
    let text = ''
    switch (tool.type) {
      case 'command':
        // Commands: add / prefix only if name doesn't already have it
        text = tool.name.startsWith('/') ? tool.name : `/${tool.name}`
        break
      case 'agent':
        text = `use agent ${tool.name}`
        break
      case 'skill':
        text = `usar skill ${tool.name}`
        break
    }
    actions.setInput(state.input ? `${state.input} ${text}` : text)
  }, [actions, state.input])

  const { state: quickToolsState, handlers: quickToolsHandlers } = useQuickTools({
    config: claudeConfig,
    isProcessing: state.isProcessing,
    onSelectTool: handleSelectTool,
  })

  const enhancedActivity = useEnhancedActivity({
    activeContext: state.activeContext,
    agents: state.sessionAgents,
    agentConfigs: claudeConfig.agents,
  })

  const { handleChunk, addLog, resetRefs } = useChunkHandler({
    setLogs: compatibleSetters.setLogs,
    setClaudeSessionId: compatibleSetters.setClaudeSessionId,
    setIsProcessing: compatibleSetters.setIsProcessing,
    setActiveContext: compatibleSetters.setActiveContext,
    setSessionStats: compatibleSetters.setSessionStats,
    setUsage: compatibleSetters.setUsage,
    onSessionUpdate,
    claudeSessionId: state.claudeSessionId,
    activeContext: state.activeContext,
    onDone: () => {
      actions.stopProcessing()
      actions.setWaitingForAnswer(false)
    },
    onExitPlanMode,
    setSessionAgents: compatibleSetters.setSessionAgents,
    setScopedTodos: compatibleSetters.setScopedTodos,
    setWaitingForAnswer: compatibleSetters.setWaitingForAnswer,
    onLearningEvent: addLearningEvent,
  })

  const { isConnected, send, abort, sendUserAnswer } = useWebSocket({ onMessage: handleChunk })
  const lastEscapeRef = useRef<number>(0)
  const prevCompletedAgentIdsRef = useRef<Set<string>>(new Set())

  // Refs to avoid dependency issues in effects
  const setLogsRef = useRef(compatibleSetters.setLogs)
  setLogsRef.current = compatibleSetters.setLogs
  const actionsRef = useRef(actions)
  actionsRef.current = actions
  const resetRefsRef = useRef(resetRefs)
  resetRefsRef.current = resetRefs

  const handleAbort = useCallback(() => {
    if (!state.isProcessing) return
    abort()
    actions.stopProcessing()
  }, [state.isProcessing, abort, actions])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && state.isProcessing) {
        const now = Date.now()
        if (now - lastEscapeRef.current < 500) {
          abort()
          actionsRef.current.stopProcessing()
          lastEscapeRef.current = 0
        } else {
          lastEscapeRef.current = now
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.isProcessing, abort])

  useEffect(() => {
    getClaudeConfig().then(setClaudeConfig)
  }, [setClaudeConfig])

  useEffect(() => {
    getSessionAgents(session.id).then(result => actionsRef.current.setSessionAgents(result.agents))
  }, [session.id])

  useEffect(() => {
    const completedAgents = state.activeContext.toolHistory
      .filter(t => t.type === 'agent' && t.status === 'completed' && t.toolUseId)

    const prevCompleted = prevCompletedAgentIdsRef.current
    const newlyCompleted = completedAgents.filter(t => !prevCompleted.has(t.toolUseId!))

    if (newlyCompleted.length > 0) {
      setLogsRef.current(currentLogs => {
        const updated = [...currentLogs]
        let changed = false

        for (const agent of newlyCompleted) {
          for (let i = updated.length - 1; i >= 0; i--) {
            const log = updated[i]
            if (log.type === 'tool' && log.tool === 'Task' && log.toolUseId === agent.toolUseId && !log.toolOutput) {
              updated[i] = { ...updated[i], toolOutput: 'Agent completed' }
              changed = true
              break
            }
          }
        }

        return changed ? updated : currentLogs
      })

      prevCompletedAgentIdsRef.current = new Set(completedAgents.map(t => t.toolUseId!))
    }
  }, [state.activeContext.toolHistory])

  useEffect(() => {
    const { logs: reconstructedLogs, scopedTodos: reconstructedTodos, activeContext: restoredContext } =
      reconstructFromSession(session)

    actionsRef.current.resetSession({
      logs: reconstructedLogs,
      scopedTodos: reconstructedTodos,
      activeContext: restoredContext,
    })
    resetRefsRef.current()
    prevCompletedAgentIdsRef.current = new Set()
  }, [session.id, session.messages])

  const handleUserAnswer = useCallback((answer: string) => {
    if (!answer.trim() || !isConnected) return
    addLog('response', `> ${answer}`)
    sendUserAnswer(answer)
    actions.setWaitingForAnswer(false)
  }, [isConnected, addLog, sendUserAnswer, actions])

  // Core message sending logic
  const sendMessage = useCallback((prompt: string, images?: { dataUrl: string; name: string }[]) => {
    if (!prompt.trim() && (!images || images.length === 0)) return
    if (!isConnected) return

    const imageDataUrls = images?.map(img => img.dataUrl) || []

    const newContext: Partial<typeof state.activeContext> = { tools: [] }
    const agentMatch = prompt.match(/use agent (\S+)/i) || prompt.match(/Task.*agent[:\s]+(\S+)/i)
    if (agentMatch) {
      newContext.agent = { name: agentMatch[1], status: 'running' }
    }
    const commandMatch = prompt.match(/^\/(\S+)/)
    if (commandMatch) {
      newContext.command = `/${commandMatch[1]}`
    }
    for (const skill of claudeConfig.skills) {
      if (skill.triggers?.some(t => prompt.toLowerCase().includes(t.toLowerCase()))) {
        newContext.skill = skill.name
        break
      }
    }

    actions.updateActiveContext(newContext)
    actions.incrementMessageCount()
    actions.startProcessing()

    addLog('response', `> ${prompt}`, undefined, undefined, imageDataUrls.length > 0 ? imageDataUrls : undefined)

    send({
      type: 'execute-cli',
      data: {
        prompt,
        messages: (session.messages ?? []).slice(-20).map(m => ({
          role: m.role,
          content: m.content
        })),
        provider,
        sessionId: session.id,
        workDir: session.workDir,
        resume: state.claudeSessionId,
        images: images && images.length > 0 ? images : undefined,
        orchestrate: modes.orchestrate,
        leadOrchestrate: false,  // Claude decide cuándo usar Task tool
        planMode: modes.planMode,
        bypassPermissions: modes.bypassPermissions,
        allowFullPC: modes.allowFullPC,
      },
    })
  }, [isConnected, claudeConfig.skills, actions, addLog, send, provider, session.id, session.workDir, state.claudeSessionId, modes])

  // Handle submit (only when not processing)
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if ((!state.input.trim() && pastedImages.length === 0) || state.isProcessing || !isConnected) return

    const prompt = state.input.trim()
    const images = pastedImages.map(img => ({
      dataUrl: img.dataUrl,
      name: img.file.name || 'pasted-image.png',
    }))

    actions.clearInput()
    clearImages()
    sendMessage(prompt, images.length > 0 ? images : undefined)
  }, [state.input, state.isProcessing, pastedImages, isConnected, actions, clearImages, sendMessage])

  // Handle queue (during processing)
  const handleQueue = useCallback(() => {
    if ((!state.input.trim() && pastedImages.length === 0) || !state.isProcessing) return

    const prompt = state.input.trim()
    const images = pastedImages.map(img => ({
      dataUrl: img.dataUrl,
      name: img.file.name || 'pasted-image.png',
    }))

    actions.setQueuedMessage({
      prompt,
      images: images.length > 0 ? images : undefined,
    })
    actions.clearInput()
    clearImages()

    // Add visual feedback in logs
    addLog('response', `📋 Queued: ${prompt}`)
  }, [state.input, state.isProcessing, pastedImages, actions, clearImages, addLog])

  // Send queued message when processing ends
  const prevIsProcessingRef = useRef(state.isProcessing)
  useEffect(() => {
    const wasProcessing = prevIsProcessingRef.current
    const isNowProcessing = state.isProcessing
    prevIsProcessingRef.current = isNowProcessing

    // If processing just ended and we have a queued message, send it
    if (wasProcessing && !isNowProcessing && state.queuedMessage) {
      const { prompt, images } = state.queuedMessage
      actions.clearQueuedMessage()
      // Small delay to let UI update
      setTimeout(() => {
        sendMessage(prompt, images)
      }, 100)
    }
  }, [state.isProcessing, state.queuedMessage, actions, sendMessage])

  return (
    <div className="h-full flex flex-col bg-surface-primary">
      {/* Main content area - StatsBar moved to bottom */}
      <div className="flex-1 flex overflow-hidden">
        <ContextPanel
          activity={enhancedActivity}
          isOpen={isContextPanelOpen}
          onToggle={() => setIsContextPanelOpen(!isContextPanelOpen)}
          onClear={actions.clearContext}
        />

        <div className="flex-1 flex flex-col relative">
          <FilterBar
            filter={filter}
            onFilterChange={setFilter}
            logs={state.logs}
          />

          <div
            ref={logsContainerRef}
            className="flex-1 overflow-y-auto p-4 font-mono text-sm"
          >
            {filteredLogs.length === 0 && (
              <div className="text-center text-gray-600 py-8">
                <p>No logs yet. Send a message to start.</p>
              </div>
            )}

            {filteredLogs.map(log => (
              <LogEntryView
                key={log.id}
                entry={log}
                onExpandImage={actions.setExpandedLogImage}
                activeAgent={state.activeContext.agent?.name}
                sessionId={session.id}
                onSendMessage={handleUserAnswer}
              />
            ))}

            {state.isProcessing && (
              <div className="flex items-center gap-2 text-gray-500 py-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span>Processing...</span>
              </div>
            )}
          </div>

          {isAutoScrollPaused && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-4 right-8 px-3 py-2 rounded-full bg-blue-500 text-white shadow-lg hover:bg-blue-600 transition-all duration-200 flex items-center gap-2 animate-fade-in"
            >
              <Icons.chevronDown className="w-4 h-4" />
              <span className="text-sm">New messages</span>
            </button>
          )}
        </div>

        <RightPanel />
      </div>

      <TodoBar todos={state.scopedTodos.global} />

      {/* BottomControlsArea: StatsBar + QuickTools + ModeToggles + ChatInput */}
      <BottomControlsArea
        sessionStats={state.sessionStats}
        isConnected={isConnected}
        isProcessing={state.isProcessing}
        responseTime={state.responseTime}
        usage={state.usage}
        learningEvents={learningEvents}
        modes={onModeToggle ? modes : undefined}
        onModeToggle={onModeToggle}
        quickToolsState={quickToolsState}
        onSelectTool={quickToolsHandlers.onSelectTool}
        input={state.input}
        onInputChange={actions.setInput}
        onSubmit={handleSubmit}
        onQueue={handleQueue}
        onPaste={handlePaste}
        pastedImages={pastedImages}
        onRemoveImage={removeImage}
        onExpandImage={actions.setExpandedImage}
        hasQueuedMessage={state.queuedMessage !== null}
        onAbort={handleAbort}
        waitingForAnswer={state.waitingForAnswer}
        onInputFocus={quickToolsHandlers.onFocus}
        onInputBlur={quickToolsHandlers.onBlur}
      />

      {state.expandedImage && (
        <ImageModal
          src={state.expandedImage.dataUrl}
          onClose={() => actions.setExpandedImage(null)}
        />
      )}

      {state.expandedLogImage && (
        <ImageModal
          src={state.expandedLogImage}
          onClose={() => actions.setExpandedLogImage(null)}
        />
      )}
    </div>
  )
}
