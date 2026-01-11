export interface TodoItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  activeForm: string
}

export interface ExecutionEvent {
  id: string
  type: 'tool_use' | 'tool_result' | 'thinking' | 'agent_start' | 'agent_end' | 'todo_update' | 'context'
  timestamp: string

  // Para tool_use
  toolName?: string
  toolInput?: unknown
  toolUseId?: string
  parentToolUseId?: string

  // Para tool_result
  toolOutput?: string
  isError?: boolean

  // Para thinking
  thinkingContent?: string

  // Para agentes
  agentType?: string
  agentStatus?: 'running' | 'completed' | 'failed'
  agentError?: string
  agentTask?: string
  agentModel?: string
  agentTools?: string[]

  // Para context
  contextType?: 'skill' | 'rule' | 'mcp' | 'memory' | 'hook'
  contextName?: string
  contextDetail?: string
  contextStatus?: 'active' | 'completed' | 'failed'

  // Para todos
  todos?: TodoItem[]
}

// Snapshot del contexto al momento de la respuesta
export interface ContextSnapshot {
  mcpServers: string[]
  rules: string[]
  skills: string[]
  activeAgentIds: string[]
}

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  toolsUsed?: string[]
  images?: string[]

  // Datos ricos para persistencia
  executionEvents?: ExecutionEvent[]
  usage?: TokenUsage
  costUsd?: number
  durationMs?: number
  contextSnapshot?: ContextSnapshot
}

// Agente persistido a nivel de sesión
export interface PersistedAgent {
  id: string
  type: string
  task: string
  status: 'pending' | 'active' | 'completed' | 'failed'
  createdAt: string
  startedAt?: string
  completedAt?: string
  result?: string
  error?: string
  tokensUsed?: number
  toolUseId?: string
}

export interface Session {
  id: string
  name: string
  workDir: string
  messages: Message[]
  createdAt: string
  updatedAt: string
  agents?: PersistedAgent[]
  version?: number  // 1 = legacy, 2 = full persistence
}

export interface ClaudeConfigItem {
  name: string
  description: string
  model?: string
  tools?: string[]
  triggers?: string[]
}

export interface ClaudeConfig {
  agents: ClaudeConfigItem[]
  skills: ClaudeConfigItem[]
  commands: ClaudeConfigItem[]
}

export type ModelProvider = 'claude' | 'codex' | 'gemini'

export interface ExecuteRequest {
  prompt: string
  sessionId?: string
  workDir?: string
  tools?: string[]
  resume?: string
}

export interface ExecuteCLIRequest {
  prompt: string
  provider?: ModelProvider
  sessionId?: string
  workDir?: string
  outputFormat?: 'json' | 'stream-json' | 'text'
  continue?: boolean
  resume?: string
  allowedTools?: string[]
}

export interface ExecuteResult {
  response: string
  sessionId?: string
  toolsUsed: string[]
  mode: 'sdk' | 'cli'
  costUsd?: number
  durationMs?: number
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalTokens: number
  contextPercent: number
}

export interface StreamChunk {
  type: 'init' | 'text' | 'thinking' | 'tool_use' | 'tool_result' | 'result' | 'error' | 'done' | 'context' | 'agent_event' | 'agent_result' | 'learning_event' | 'orchestrator_event'
  data: string
  sessionId?: string
  tool?: string
  toolInput?: unknown
  toolOutput?: string
  toolUseId?: string
  parentToolUseId?: string
  costUsd?: number
  durationMs?: number
  usage?: TokenUsage
  // Context event fields
  contextType?: 'skill' | 'rule' | 'mcp' | 'memory' | 'hook'
  name?: string
  detail?: string
  status?: 'active' | 'completed' | 'failed'
  // Agent event fields
  event?: 'created' | 'started' | 'completed' | 'failed'
  agentId?: string
  agentType?: string
  task?: string
  result?: string
  error?: string
  // Sync fields
  waitingForAnswer?: boolean
  // Learning event fields
  expertId?: string
  changes?: unknown[]
}

export interface ApiError {
  error: {
    code: string
    message: string
    fields?: Record<string, string>
  }
}

export interface HealthResponse {
  status: 'ok' | 'error'
  time: string
}

// ============================================
// Context Window Types - OPT.1
// ============================================

export type ContextWindowStatus = 'safe' | 'warning' | 'critical' | 'compacting'

export interface ContextWindowState {
  usedTokens: number
  maxTokens: number
  percentage: number
  status: ContextWindowStatus
  breakdown: {
    system: number
    history: number
    tools: number
    current: number
  }
}

export interface ContextWindowThresholds {
  warning: number   // Default: 0.70 (70%)
  critical: number  // Default: 0.85 (85%)
  emergency: number // Default: 0.95 (95%)
}

// ============================================
// Truncation Types - OPT.2
// ============================================

export interface TruncationResult {
  content: string
  truncated: boolean
  originalTokens: number
  finalTokens: number
  linesRemoved: number
}

// ============================================
// Tool Permissions Types - OPT.4
// ============================================

export interface AgentToolConfig {
  tools: string[]
  mcpServers: string[]
  description: string
}

// ============================================
// Cache Types - OPT.8
// ============================================

export interface CacheStats {
  hits: number
  misses: number
  size: number
  hitRate: number
}

// ============================================
// Auto-Continuation Types - P0.2
// ============================================

export interface ContinuationState {
  isActive: boolean
  currentIteration: number
  maxIterations: number
  startedAt: string | null
  sessionId: string | null
}

export interface ContinuationEvent {
  type: 'continuation'
  event: 'started' | 'iteration' | 'completed' | 'cancelled'
  state: ContinuationState
  reason?: string
}

// ============================================
// Git Worktree Types - P1b.1
// ============================================

export interface WorktreeInfo {
  path: string
  branch: string
  taskId: string
  taskName?: string
  baseBranch: string
  isActive: boolean
  stats: {
    commitCount: number
    filesChanged: number
    additions: number
    deletions: number
  }
  createdAt: string
}

export interface WorktreeConfig {
  enabled: boolean
  basePath: string
  branchPrefix: string
  autoCleanupHours: number
  mergeOnSuccess: boolean
}

export interface MergeResult {
  success: boolean
  conflicts: string[]
  merged: boolean
  message: string
}

export interface FileChange {
  status: 'A' | 'M' | 'D' | 'R' | 'C' | 'U'
  path: string
}

// ============================================
// Kanban Types - P1a.2
// ============================================

export type KanbanTaskStatus = 'backlog' | 'pending' | 'running' | 'completed' | 'failed'

export interface KanbanTask {
  id: string
  title: string
  description?: string
  status: KanbanTaskStatus
  agentId?: string
  agentType?: string
  toolCalls: number
  createdAt: string
  startedAt?: string
  completedAt?: string
  error?: string
  progress?: number
}

export interface KanbanColumn {
  id: string
  title: string
  status: KanbanTaskStatus
  color: string
  tasks: KanbanTask[]
}

// ============================================
// Terminal Grid Types - P1a.3
// ============================================

export type TerminalPaneStatus = 'running' | 'completed' | 'failed'

export interface TerminalPane {
  agentId: string
  agentType: string
  taskTitle?: string
  status: TerminalPaneStatus
  output: string[]
  startedAt: string
  endedAt?: string
  isExpanded: boolean
}

export type TerminalGridLayout = 'auto' | '1x1' | '2x2' | '3x3'

export interface TerminalGridState {
  panes: TerminalPane[]
  layout: TerminalGridLayout
  maxLines: number
  autoScroll: boolean
}

// ============================================
// Merge Resolver Types - P1b.2
// ============================================

export interface MergeConflict {
  file: string
  ours: string
  theirs: string
  base?: string
  markers: {
    start: number
    middle: number
    end: number
  }
}

export type MergeStrategy = 'ours' | 'theirs' | 'combined' | 'manual'

export interface MergeResolution {
  file: string
  resolved: string
  strategy: MergeStrategy
  confidence: number
  reasoning: string
}

export interface MergeResolverResult {
  success: boolean
  conflicts: MergeConflict[]
  resolutions: MergeResolution[]
  requiresReview: boolean
  message: string
}

// ============================================
// Agent Result Types - For token accumulation
// ============================================

export interface AgentResultChunk {
  type: 'agent_result'
  agentId: string
  success: boolean
  summary?: string
  fullOutputPath?: string
  usage?: TokenUsage
  durationMs?: number
  toolCalls?: number
}
