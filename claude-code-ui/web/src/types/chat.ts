// Import shared types for internal use and re-export
import type { TodoItem, TokenUsage, StreamChunk } from '@shared/types'
export type { TodoItem, TokenUsage, StreamChunk }

export interface PastedImage {
  id: string
  dataUrl: string
  file: File
}

export interface AgentStep {
  tool: string
  timestamp: Date
  status: 'running' | 'completed' | 'failed'
  input?: string
  error?: string
  toolUseId?: string
}

export interface LogEntry {
  id: string
  type: 'response' | 'tool' | 'thinking' | 'init' | 'error' | 'result' | 'agent_result'
  content: string
  timestamp: Date
  tool?: string
  toolInput?: unknown
  toolOutput?: string
  toolUseId?: string  // For correlating Task tool_use with tool_result
  parentToolUseId?: string  // Parent Task's toolUseId for agent tool correlation
  agentUuid?: string  // Frontend-generated unique ID for agent tracking
  images?: string[]
  agent?: string
  agentType?: string
  agentModel?: string
  agentTools?: string[]
  agentSteps?: AgentStep[]
  agentStartTime?: Date
  agentStatus?: 'running' | 'completed' | 'failed'
  agentError?: string
  agentTodos?: TodoItem[]  // Todos specific to this agent
}

export interface ToolUse {
  name: string
  type: 'tool' | 'agent' | 'skill' | 'command' | 'mcp'
  timestamp: Date
  status: 'running' | 'completed' | 'failed'
  toolUseId?: string
  input?: string
}

export type ToolCategory =
  | 'file-read'
  | 'file-write'
  | 'execution'
  | 'agent'
  | 'skill'
  | 'planning'
  | 'interaction'
  | 'navigation'
  | 'mcp'
  | 'rule'
  | 'hook'
  | 'memory'

export type ToolIconName =
  | 'bookOpen'
  | 'search'
  | 'searchCode'
  | 'pen'
  | 'fileEdit'
  | 'notebook'
  | 'terminal'
  | 'bot'
  | 'layers'
  | 'zap'
  | 'clipboard'
  | 'ruler'
  | 'checkCircle'
  | 'help'
  | 'compass'
  | 'globe'
  | 'circleStop'
  | 'plug'
  | 'settings'
  | 'folder'

export interface ToolTaxonomyEntry {
  category: ToolCategory
  icon: ToolIconName
  color: string
  bgColor: string
  description: string
}

export const TOOL_TAXONOMY: Record<string, ToolTaxonomyEntry> = {
  Read: { category: 'file-read', icon: 'bookOpen', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', description: 'Read file' },
  Glob: { category: 'file-read', icon: 'search', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', description: 'Find files' },
  Grep: { category: 'file-read', icon: 'searchCode', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', description: 'Search content' },
  Write: { category: 'file-write', icon: 'pen', color: 'text-amber-400', bgColor: 'bg-amber-500/20', description: 'Write file' },
  Edit: { category: 'file-write', icon: 'fileEdit', color: 'text-amber-400', bgColor: 'bg-amber-500/20', description: 'Edit file' },
  NotebookEdit: { category: 'file-write', icon: 'notebook', color: 'text-amber-400', bgColor: 'bg-amber-500/20', description: 'Edit notebook' },
  Bash: { category: 'execution', icon: 'terminal', color: 'text-blue-400', bgColor: 'bg-blue-500/20', description: 'Run command' },
  Task: { category: 'agent', icon: 'bot', color: 'text-orange-400', bgColor: 'bg-orange-500/20', description: 'Spawn agent' },
  TaskOutput: { category: 'agent', icon: 'layers', color: 'text-orange-400', bgColor: 'bg-orange-500/20', description: 'Agent output' },
  Skill: { category: 'skill', icon: 'zap', color: 'text-purple-400', bgColor: 'bg-purple-500/20', description: 'Execute skill' },
  TodoWrite: { category: 'planning', icon: 'clipboard', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', description: 'Manage tasks' },
  EnterPlanMode: { category: 'planning', icon: 'ruler', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', description: 'Start planning' },
  ExitPlanMode: { category: 'planning', icon: 'checkCircle', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', description: 'Finish planning' },
  AskUserQuestion: { category: 'interaction', icon: 'help', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', description: 'Ask user' },
  LSP: { category: 'navigation', icon: 'compass', color: 'text-teal-400', bgColor: 'bg-teal-500/20', description: 'Code navigation' },
  WebFetch: { category: 'navigation', icon: 'globe', color: 'text-teal-400', bgColor: 'bg-teal-500/20', description: 'Fetch URL' },
  WebSearch: { category: 'navigation', icon: 'searchCode', color: 'text-teal-400', bgColor: 'bg-teal-500/20', description: 'Web search' },
  KillShell: { category: 'execution', icon: 'circleStop', color: 'text-red-400', bgColor: 'bg-red-500/20', description: 'Kill process' },
}

export type ContextIconName = 'zap' | 'ruler' | 'anchor' | 'plug' | 'brain' | 'terminal'

export const CONTEXT_TAXONOMY: Record<string, { icon: ContextIconName; color: string; bgColor: string; label: string }> = {
  skill: { icon: 'zap', color: 'text-purple-400', bgColor: 'bg-purple-500/20', label: 'Skill' },
  command: { icon: 'terminal', color: 'text-blue-400', bgColor: 'bg-blue-500/20', label: 'Command' },
  rule: { icon: 'ruler', color: 'text-rose-400', bgColor: 'bg-rose-500/20', label: 'Rule' },
  hook: { icon: 'anchor', color: 'text-lime-400', bgColor: 'bg-lime-500/20', label: 'Hook' },
  mcp: { icon: 'plug', color: 'text-pink-400', bgColor: 'bg-pink-500/20', label: 'MCP' },
  memory: { icon: 'brain', color: 'text-indigo-400', bgColor: 'bg-indigo-500/20', label: 'Memory' },
}

export type ContextType = keyof typeof CONTEXT_TAXONOMY

export interface ContextEntry {
  id: string
  type: ContextType
  name: string
  detail?: string
  timestamp: Date
  status?: 'active' | 'completed' | 'failed'
}

export function getToolTaxonomy(toolName: string): ToolTaxonomyEntry {
  if (toolName.startsWith('mcp__')) {
    return { category: 'mcp', icon: 'plug', color: 'text-pink-400', bgColor: 'bg-pink-500/20', description: 'MCP tool' }
  }

  if (toolName.startsWith('Agent:')) {
    return { category: 'agent', icon: 'bot', color: 'text-orange-400', bgColor: 'bg-orange-500/20', description: 'Agent task' }
  }

  const baseName = toolName.split('(')[0].trim()
  return TOOL_TAXONOMY[baseName] || { category: 'execution', icon: 'settings', color: 'text-gray-400', bgColor: 'bg-gray-500/20', description: 'Tool' }
}

export interface AgentStats {
  filesRead: number
  filesWritten: number
  searchesRun: number
  commandsRun: number
  startTime: Date
  endTime?: Date
}

export interface ActiveContext {
  agent?: { name: string; status: 'idle' | 'running' }
  skill?: string
  command?: string
  tools: string[]
  // Enhanced tracking
  toolHistory: ToolUse[]
  activeAgents: string[]
  mcpServers: string[]
  rules: string[]
}

// Enhanced Activity Panel types
export interface ContextBreakdown {
  rules: { count: number; names: string[] }
  skills: { count: number; names: string[] }
  mcpServers: { count: number; names: string[] }
  memories: { count: number }
}

export interface ContextUsage {
  estimatedTokens: number
  percentage: number
  breakdown: ContextBreakdown
}

export interface ActiveOperation {
  id: string
  type: 'agent' | 'tool' | 'mcp'
  name: string
  status: 'running' | 'pending' | 'completed' | 'failed'
  detail?: string
  startedAt: Date
}

export interface AgentUsage {
  name: string
  status: 'completed' | 'failed' | 'running'
  count: number
  model?: string
}

export interface McpUsage {
  server: string
  tools: string[]
  count: number
}

export interface ToolsUsedSummary {
  fileOps: { read: number; write: number; edit: number; glob: number; grep: number }
  execution: { bash: number; skill: number; killShell: number }
  agents: AgentUsage[]
  mcps: McpUsage[]
  planning: { todoWrite: number; planMode: number; askUser: number }
  navigation: { lsp: number; webFetch: number; webSearch: number }
  total: number
}

export interface TimelineEvent {
  id: string
  timestamp: Date
  type: 'tool' | 'agent' | 'mcp' | 'context' | 'error'
  name: string
  status: 'running' | 'completed' | 'failed'
  category?: ToolCategory
  detail?: string
}

export interface EnhancedActivityContext {
  contextUsage: ContextUsage
  activeOperations: ActiveOperation[]
  toolsUsed: ToolsUsedSummary
  timeline: TimelineEvent[]
}

export interface SessionStats {
  messageCount: number
  toolUseCount: number
}

// TodoItem, TokenUsage, StreamChunk are now imported from shared/types.ts

export interface ScopedTodos {
  global: TodoItem[]
  byAgent: Map<string, TodoItem[]>
}

export type FilterType = 'all' | 'response' | 'tool' | 'thinking' | 'agent' | 'context' | 'file' | 'exec' | 'mcp' | 'plan'

export const LOG_TYPE_BADGES: Record<LogEntry['type'], string> = {
  response: 'bg-blue-600/20 text-blue-400',
  tool: 'bg-green-600/20 text-green-400',
  thinking: 'bg-purple-600/20 text-purple-400',
  init: 'bg-gray-600/20 text-gray-400',
  error: 'bg-red-600/20 text-red-400',
  result: 'bg-blue-600/20 text-blue-400',
  agent_result: 'bg-orange-600/20 text-orange-400',
}

export type FilterIconName = 'message' | 'folder' | 'terminal' | 'bot' | 'plug' | 'ruler' | 'zap' | 'brain'

export const FILTER_BUTTONS: { key: FilterType; label: string; color: string; icon?: FilterIconName }[] = [
  { key: 'all', label: 'ALL', color: 'gray' },
  { key: 'response', label: 'CHAT', color: 'blue', icon: 'message' },
  { key: 'file', label: 'FILES', color: 'emerald', icon: 'folder' },
  { key: 'exec', label: 'EXEC', color: 'sky', icon: 'terminal' },
  { key: 'agent', label: 'AGENTS', color: 'orange', icon: 'bot' },
  { key: 'mcp', label: 'MCP', color: 'pink', icon: 'plug' },
  { key: 'plan', label: 'PLAN', color: 'cyan', icon: 'ruler' },
  { key: 'context', label: 'CONTEXT', color: 'rose', icon: 'zap' },
  { key: 'thinking', label: 'THINK', color: 'purple', icon: 'brain' },
]

// QuickTools types
export interface QuickToolItem {
  name: string
  type: 'agent' | 'skill' | 'command'
  description: string
}

export interface ToolsByType {
  skills: QuickToolItem[]
  commands: QuickToolItem[]
  agents: QuickToolItem[]
}

export interface QuickToolsState {
  isVisible: boolean
  toolsByType: ToolsByType
}
