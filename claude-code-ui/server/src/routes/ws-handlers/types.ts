import type { ClaudeService } from '../../services/claude'
import type { CodexService } from '../../services/codex'
import type { GeminiService } from '../../services/gemini'
import type { SessionStore } from '../../services/sessions'
import type { orchestrator as OrchestratorType } from '../../services/orchestrator'
import type { agentRegistry as AgentRegistryType } from '../../services/agent-registry'
import type { OrchestratorAgent } from '../../services/orchestrator-agent'
import type { ContextWindowState } from '@shared/types'

/**
 * Active process tracking for abort functionality
 */
export interface ActiveProcess {
  abort: () => void
  sendUserAnswer?: (answer: string) => void
  sessionId?: string
  createdAt: number
}

/**
 * Context window event listeners per WebSocket
 */
export interface ContextListeners {
  statusChanged: (state: ContextWindowState) => void
  thresholdWarning: (state: ContextWindowState) => void
  thresholdCritical: (state: ContextWindowState) => void
  compactionStarted: () => void
  compactionCompleted: (tokensSaved: number) => void
}

/**
 * WebSocket with send method type
 */
export interface WebSocketWithSend {
  send: (data: string) => void
}

/**
 * Services bundle for WebSocket handlers
 */
export interface WebSocketServices {
  claude: ClaudeService
  codex: CodexService
  gemini: GeminiService
  sessions: SessionStore
  orchestrator: typeof OrchestratorType
  agentRegistry: typeof AgentRegistryType
  leadOrchestrator?: OrchestratorAgent
}

/**
 * Execute CLI message data structure
 */
export interface ExecuteCliData {
  prompt: string
  messages?: Array<{ role: string; content: string }>
  sessionId?: string
  workDir?: string
  resume?: boolean
  images?: Array<{ dataUrl: string }>
  orchestrate?: boolean
  leadOrchestrate?: boolean
  thinking?: boolean
  planMode?: boolean
  bypassPermissions?: boolean
  allowFullPC?: boolean
  provider?: 'claude' | 'codex' | 'gemini'
}

/**
 * Task tool tracking info for Kanban/Terminals
 */
export interface TaskToolInfo {
  agentId: string
  agentType: string
  taskTitle: string
}

/**
 * Constants for WebSocket handling
 */
export const WS_CONSTANTS = {
  MAX_ACTIVE_PROCESSES: 500,
  CLEANUP_INTERVAL_MS: 60 * 1000, // 1 minute
  PROCESS_TTL_MS: 30 * 60 * 1000, // 30 minutes
  EXECUTION_TIMEOUT_MS: 10 * 60 * 1000, // 10 minutes
} as const
