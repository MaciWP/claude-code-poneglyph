import type {
  LogEntry,
  ActiveContext,
  SessionStats,
  StreamChunk,
  ToolUse,
  ContextType,
  AgentStep,
  TokenUsage,
  TodoItem,
  ScopedTodos,
} from '../../types/chat'
import type { Agent, AgentType, AgentStatus } from '../../lib/api'
import type { LearningEvent } from '../useLearningEvents'

export interface ActiveAgent {
  id: string
  name: string
  subagentType: string
  description: string
  startTime: Date
  steps: AgentStep[]
  lastStepTime?: number
  agentUuid: string
  todos?: TodoItem[]
}

export interface MemorySummary {
  id: string
  title: string
  type: string
  similarity: number
  confidence: number
}

export interface ContextChunk {
  type: 'context'
  contextType: ContextType
  name: string
  detail?: string
  status?: 'active' | 'completed' | 'failed'
  memories?: MemorySummary[] // For memory-injection context type
}

export interface UseChunkHandlerOptions {
  setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>
  setClaudeSessionId: React.Dispatch<React.SetStateAction<string | null>>
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>
  setActiveContext: React.Dispatch<React.SetStateAction<ActiveContext>>
  setSessionStats: React.Dispatch<React.SetStateAction<SessionStats>>
  setUsage?: React.Dispatch<React.SetStateAction<TokenUsage | undefined>>
  onSessionUpdate: () => void
  claudeSessionId: string | null
  activeContext: ActiveContext
  onDone?: () => void
  onExitPlanMode?: () => void
  setSessionAgents?: React.Dispatch<React.SetStateAction<Agent[]>>
  setScopedTodos?: React.Dispatch<React.SetStateAction<ScopedTodos>>
  setWaitingForAnswer?: React.Dispatch<React.SetStateAction<boolean>>
  onLearningEvent?: (event: LearningEvent) => void
}

export {
  StreamChunk,
  ToolUse,
  AgentStep,
  TokenUsage,
  TodoItem,
  ScopedTodos,
  LogEntry,
  ActiveContext,
  SessionStats,
  Agent,
  AgentType,
  AgentStatus,
}
