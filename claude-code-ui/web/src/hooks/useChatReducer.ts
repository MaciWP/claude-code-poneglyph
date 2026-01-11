import { useReducer, useCallback, useRef, useMemo, type SetStateAction, type Dispatch } from 'react'
import type { Agent } from '../lib/api'
import type { LogEntry, ActiveContext, SessionStats, TokenUsage, ScopedTodos, PastedImage } from '../types/chat'

export interface QueuedMessage {
  prompt: string
  images?: { dataUrl: string; name: string }[]
}

export interface ChatState {
  // Chat core
  input: string
  logs: LogEntry[]
  isProcessing: boolean
  waitingForAnswer: boolean
  queuedMessage: QueuedMessage | null

  // Session
  claudeSessionId: string | null
  activeContext: ActiveContext
  sessionStats: SessionStats
  sessionAgents: Agent[]
  scopedTodos: ScopedTodos

  // UI
  expandedImage: PastedImage | null
  expandedLogImage: string | null
  responseTime: number
  usage: TokenUsage | undefined
}

export type ChatAction =
  // Input
  | { type: 'SET_INPUT'; payload: string }
  | { type: 'CLEAR_INPUT' }

  // Logs
  | { type: 'SET_LOGS'; payload: LogEntry[] }
  | { type: 'ADD_LOG'; payload: LogEntry }
  | { type: 'UPDATE_LOG'; payload: { id: string; updates: Partial<LogEntry> } }
  | { type: 'UPDATE_LOG_BY_TOOLUSEID'; payload: { toolUseId: string; updates: Partial<LogEntry> } }

  // Processing
  | { type: 'START_PROCESSING' }
  | { type: 'STOP_PROCESSING' }
  | { type: 'SET_WAITING_FOR_ANSWER'; payload: boolean }

  // Queue
  | { type: 'SET_QUEUED_MESSAGE'; payload: QueuedMessage | null }
  | { type: 'CLEAR_QUEUED_MESSAGE' }

  // Session
  | { type: 'SET_CLAUDE_SESSION_ID'; payload: string | null }
  | { type: 'SET_ACTIVE_CONTEXT'; payload: ActiveContext }
  | { type: 'UPDATE_ACTIVE_CONTEXT'; payload: Partial<ActiveContext> }
  | { type: 'SET_SESSION_STATS'; payload: SessionStats }
  | { type: 'INCREMENT_MESSAGE_COUNT' }
  | { type: 'INCREMENT_TOOL_COUNT' }
  | { type: 'SET_SESSION_AGENTS'; payload: Agent[] }
  | { type: 'SET_SCOPED_TODOS'; payload: ScopedTodos }

  // UI
  | { type: 'SET_EXPANDED_IMAGE'; payload: PastedImage | null }
  | { type: 'SET_EXPANDED_LOG_IMAGE'; payload: string | null }
  | { type: 'SET_RESPONSE_TIME'; payload: number }
  | { type: 'SET_USAGE'; payload: TokenUsage | undefined }

  // Bulk operations
  | { type: 'RESET_SESSION'; payload: { logs: LogEntry[]; scopedTodos: ScopedTodos; activeContext: Partial<ActiveContext> } }
  | { type: 'CLEAR_CONTEXT' }

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    // Input
    case 'SET_INPUT':
      return { ...state, input: action.payload }
    case 'CLEAR_INPUT':
      return { ...state, input: '' }

    // Logs
    case 'SET_LOGS':
      if (action.payload === state.logs) return state
      return { ...state, logs: action.payload }
    case 'ADD_LOG':
      return { ...state, logs: [...state.logs, action.payload] }
    case 'UPDATE_LOG': {
      const idx = state.logs.findIndex(l => l.id === action.payload.id)
      if (idx === -1) return state
      const updated = [...state.logs]
      updated[idx] = { ...updated[idx], ...action.payload.updates }
      return { ...state, logs: updated }
    }
    case 'UPDATE_LOG_BY_TOOLUSEID': {
      const idx = state.logs.findIndex(l => l.toolUseId === action.payload.toolUseId)
      if (idx === -1) return state
      const updated = [...state.logs]
      updated[idx] = { ...updated[idx], ...action.payload.updates }
      return { ...state, logs: updated }
    }

    // Processing
    case 'START_PROCESSING':
      return { ...state, isProcessing: true }
    case 'STOP_PROCESSING':
      return { ...state, isProcessing: false }
    case 'SET_WAITING_FOR_ANSWER':
      return { ...state, waitingForAnswer: action.payload }

    // Queue
    case 'SET_QUEUED_MESSAGE':
      return { ...state, queuedMessage: action.payload }
    case 'CLEAR_QUEUED_MESSAGE':
      return { ...state, queuedMessage: null }

    // Session
    case 'SET_CLAUDE_SESSION_ID':
      return { ...state, claudeSessionId: action.payload }
    case 'SET_ACTIVE_CONTEXT':
      return { ...state, activeContext: action.payload }
    case 'UPDATE_ACTIVE_CONTEXT':
      return { ...state, activeContext: { ...state.activeContext, ...action.payload } }
    case 'SET_SESSION_STATS':
      return { ...state, sessionStats: action.payload }
    case 'INCREMENT_MESSAGE_COUNT':
      return { ...state, sessionStats: { ...state.sessionStats, messageCount: state.sessionStats.messageCount + 1 } }
    case 'INCREMENT_TOOL_COUNT':
      return { ...state, sessionStats: { ...state.sessionStats, toolUseCount: state.sessionStats.toolUseCount + 1 } }
    case 'SET_SESSION_AGENTS':
      return { ...state, sessionAgents: action.payload }
    case 'SET_SCOPED_TODOS':
      return { ...state, scopedTodos: action.payload }

    // UI
    case 'SET_EXPANDED_IMAGE':
      return { ...state, expandedImage: action.payload }
    case 'SET_EXPANDED_LOG_IMAGE':
      return { ...state, expandedLogImage: action.payload }
    case 'SET_RESPONSE_TIME':
      return { ...state, responseTime: action.payload }
    case 'SET_USAGE':
      return { ...state, usage: action.payload }

    // Bulk operations
    case 'RESET_SESSION':
      return {
        ...state,
        logs: action.payload.logs,
        scopedTodos: action.payload.scopedTodos,
        activeContext: {
          tools: action.payload.activeContext.tools || [],
          toolHistory: action.payload.activeContext.toolHistory || [],
          activeAgents: [],
          mcpServers: action.payload.activeContext.mcpServers || [],
          rules: action.payload.activeContext.rules || [],
        },
        claudeSessionId: null,
        sessionAgents: [],
      }
    case 'CLEAR_CONTEXT':
      return {
        ...state,
        activeContext: { tools: [], toolHistory: [], activeAgents: [], mcpServers: [], rules: [] },
        sessionAgents: [],
      }

    default:
      return state
  }
}

const initialState: ChatState = {
  input: '',
  logs: [],
  isProcessing: false,
  waitingForAnswer: false,
  queuedMessage: null,
  claudeSessionId: null,
  activeContext: {
    tools: [],
    toolHistory: [],
    activeAgents: [],
    mcpServers: [],
    rules: [],
  },
  sessionStats: {
    messageCount: 0,
    toolUseCount: 0,
  },
  sessionAgents: [],
  scopedTodos: { global: [], byAgent: new Map() },
  expandedImage: null,
  expandedLogImage: null,
  responseTime: 0,
  usage: {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    totalTokens: 0,
    contextPercent: 0,
  },
}

export interface CompatibleSetters {
  setLogs: Dispatch<SetStateAction<LogEntry[]>>
  setClaudeSessionId: Dispatch<SetStateAction<string | null>>
  setIsProcessing: Dispatch<SetStateAction<boolean>>
  setActiveContext: Dispatch<SetStateAction<ActiveContext>>
  setSessionStats: Dispatch<SetStateAction<SessionStats>>
  setUsage: Dispatch<SetStateAction<TokenUsage | undefined>>
  setSessionAgents: Dispatch<SetStateAction<Agent[]>>
  setScopedTodos: Dispatch<SetStateAction<ScopedTodos>>
  setWaitingForAnswer: Dispatch<SetStateAction<boolean>>
}

export function useChatReducer() {
  const [state, dispatch] = useReducer(chatReducer, initialState)
  const requestStartRef = useRef<number>(0)
  const stateRef = useRef(state)
  stateRef.current = state

  // Compatible setters for useChunkHandler (support functional updates)
  const setLogs = useCallback((value: SetStateAction<LogEntry[]>) => {
    const newValue = typeof value === 'function' ? value(stateRef.current.logs) : value
    dispatch({ type: 'SET_LOGS', payload: newValue })
  }, [])

  const setClaudeSessionId = useCallback((value: SetStateAction<string | null>) => {
    const newValue = typeof value === 'function' ? value(stateRef.current.claudeSessionId) : value
    dispatch({ type: 'SET_CLAUDE_SESSION_ID', payload: newValue })
  }, [])

  const setIsProcessing = useCallback((value: SetStateAction<boolean>) => {
    const newValue = typeof value === 'function' ? value(stateRef.current.isProcessing) : value
    if (newValue) {
      requestStartRef.current = Date.now()
      dispatch({ type: 'START_PROCESSING' })
    } else {
      if (requestStartRef.current > 0) {
        dispatch({ type: 'SET_RESPONSE_TIME', payload: Date.now() - requestStartRef.current })
        requestStartRef.current = 0
      }
      dispatch({ type: 'STOP_PROCESSING' })
    }
  }, [])

  const setActiveContext = useCallback((value: SetStateAction<ActiveContext>) => {
    const newValue = typeof value === 'function' ? value(stateRef.current.activeContext) : value
    dispatch({ type: 'SET_ACTIVE_CONTEXT', payload: newValue })
  }, [])

  const setSessionStats = useCallback((value: SetStateAction<SessionStats>) => {
    const newValue = typeof value === 'function' ? value(stateRef.current.sessionStats) : value
    dispatch({ type: 'SET_SESSION_STATS', payload: newValue })
  }, [])

  const setUsage = useCallback((value: SetStateAction<TokenUsage | undefined>) => {
    const newValue = typeof value === 'function' ? value(stateRef.current.usage) : value
    dispatch({ type: 'SET_USAGE', payload: newValue })
  }, [])

  const setSessionAgents = useCallback((value: SetStateAction<Agent[]>) => {
    const newValue = typeof value === 'function' ? value(stateRef.current.sessionAgents) : value
    dispatch({ type: 'SET_SESSION_AGENTS', payload: newValue })
  }, [])

  const setScopedTodos = useCallback((value: SetStateAction<ScopedTodos>) => {
    const newValue = typeof value === 'function' ? value(stateRef.current.scopedTodos) : value
    dispatch({ type: 'SET_SCOPED_TODOS', payload: newValue })
  }, [])

  const setWaitingForAnswer = useCallback((value: SetStateAction<boolean>) => {
    const newValue = typeof value === 'function' ? value(stateRef.current.waitingForAnswer) : value
    dispatch({ type: 'SET_WAITING_FOR_ANSWER', payload: newValue })
  }, [])

  const compatibleSetters: CompatibleSetters = useMemo(() => ({
    setLogs,
    setClaudeSessionId,
    setIsProcessing,
    setActiveContext,
    setSessionStats,
    setUsage,
    setSessionAgents,
    setScopedTodos,
    setWaitingForAnswer,
  }), [setLogs, setClaudeSessionId, setIsProcessing, setActiveContext, setSessionStats, setUsage, setSessionAgents, setScopedTodos, setWaitingForAnswer])

  // Simple actions (direct dispatch, no functional updates)
  const setInput = useCallback((input: string) => dispatch({ type: 'SET_INPUT', payload: input }), [])
  const clearInput = useCallback(() => dispatch({ type: 'CLEAR_INPUT' }), [])
  const setLogsAction = useCallback((logs: LogEntry[]) => dispatch({ type: 'SET_LOGS', payload: logs }), [])
  const addLog = useCallback((log: LogEntry) => dispatch({ type: 'ADD_LOG', payload: log }), [])
  const updateLog = useCallback((id: string, updates: Partial<LogEntry>) => dispatch({ type: 'UPDATE_LOG', payload: { id, updates } }), [])
  const updateLogByToolUseId = useCallback((toolUseId: string, updates: Partial<LogEntry>) => dispatch({ type: 'UPDATE_LOG_BY_TOOLUSEID', payload: { toolUseId, updates } }), [])
  const startProcessing = useCallback(() => {
    requestStartRef.current = Date.now()
    dispatch({ type: 'START_PROCESSING' })
  }, [])
  const stopProcessing = useCallback(() => {
    if (requestStartRef.current > 0) {
      dispatch({ type: 'SET_RESPONSE_TIME', payload: Date.now() - requestStartRef.current })
      requestStartRef.current = 0
    }
    dispatch({ type: 'STOP_PROCESSING' })
  }, [])
  const setWaitingForAnswerAction = useCallback((waiting: boolean) => dispatch({ type: 'SET_WAITING_FOR_ANSWER', payload: waiting }), [])
  const setClaudeSessionIdAction = useCallback((id: string | null) => dispatch({ type: 'SET_CLAUDE_SESSION_ID', payload: id }), [])
  const setActiveContextAction = useCallback((ctx: ActiveContext) => dispatch({ type: 'SET_ACTIVE_CONTEXT', payload: ctx }), [])
  const updateActiveContext = useCallback((ctx: Partial<ActiveContext>) => dispatch({ type: 'UPDATE_ACTIVE_CONTEXT', payload: ctx }), [])
  const setSessionStatsAction = useCallback((stats: SessionStats) => dispatch({ type: 'SET_SESSION_STATS', payload: stats }), [])
  const incrementMessageCount = useCallback(() => dispatch({ type: 'INCREMENT_MESSAGE_COUNT' }), [])
  const incrementToolCount = useCallback(() => dispatch({ type: 'INCREMENT_TOOL_COUNT' }), [])
  const setSessionAgentsAction = useCallback((agents: Agent[]) => dispatch({ type: 'SET_SESSION_AGENTS', payload: agents }), [])
  const setScopedTodosAction = useCallback((todos: ScopedTodos) => dispatch({ type: 'SET_SCOPED_TODOS', payload: todos }), [])
  const setExpandedImage = useCallback((img: PastedImage | null) => dispatch({ type: 'SET_EXPANDED_IMAGE', payload: img }), [])
  const setExpandedLogImage = useCallback((src: string | null) => dispatch({ type: 'SET_EXPANDED_LOG_IMAGE', payload: src }), [])
  const setResponseTime = useCallback((time: number) => dispatch({ type: 'SET_RESPONSE_TIME', payload: time }), [])
  const setUsageAction = useCallback((usage: TokenUsage | undefined) => dispatch({ type: 'SET_USAGE', payload: usage }), [])
  const resetSession = useCallback((data: { logs: LogEntry[]; scopedTodos: ScopedTodos; activeContext: Partial<ActiveContext> }) => dispatch({ type: 'RESET_SESSION', payload: data }), [])
  const clearContext = useCallback(() => dispatch({ type: 'CLEAR_CONTEXT' }), [])
  const setQueuedMessage = useCallback((msg: QueuedMessage | null) => dispatch({ type: 'SET_QUEUED_MESSAGE', payload: msg }), [])
  const clearQueuedMessage = useCallback(() => dispatch({ type: 'CLEAR_QUEUED_MESSAGE' }), [])

  const actions = useMemo(() => ({
    setInput,
    clearInput,
    setLogs: setLogsAction,
    addLog,
    updateLog,
    updateLogByToolUseId,
    startProcessing,
    stopProcessing,
    setWaitingForAnswer: setWaitingForAnswerAction,
    setClaudeSessionId: setClaudeSessionIdAction,
    setActiveContext: setActiveContextAction,
    updateActiveContext,
    setSessionStats: setSessionStatsAction,
    incrementMessageCount,
    incrementToolCount,
    setSessionAgents: setSessionAgentsAction,
    setScopedTodos: setScopedTodosAction,
    setExpandedImage,
    setExpandedLogImage,
    setResponseTime,
    setUsage: setUsageAction,
    resetSession,
    clearContext,
    setQueuedMessage,
    clearQueuedMessage,
  }), [
    setInput, clearInput, setLogsAction, addLog, updateLog, updateLogByToolUseId,
    startProcessing, stopProcessing, setWaitingForAnswerAction, setClaudeSessionIdAction,
    setActiveContextAction, updateActiveContext, setSessionStatsAction, incrementMessageCount,
    incrementToolCount, setSessionAgentsAction, setScopedTodosAction, setExpandedImage,
    setExpandedLogImage, setResponseTime, setUsageAction, resetSession, clearContext,
    setQueuedMessage, clearQueuedMessage,
  ])

  return { state, dispatch, actions, compatibleSetters }
}

export type ChatActions = ReturnType<typeof useChatReducer>['actions']
