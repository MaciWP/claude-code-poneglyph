import type { Session, PersistedAgent } from '../../../shared/types'
import type { LogEntry, ActiveContext, ScopedTodos, ToolUse, AgentStep, TodoItem } from '../types/chat'

export interface ReconstructionResult {
  logs: LogEntry[]
  scopedTodos: ScopedTodos
  toolHistory: ToolUse[]
  activeContext: Partial<ActiveContext>
}

function classifyTool(toolName: string, toolInput?: unknown): ToolUse['type'] {
  if (toolName === 'Task') return 'agent'
  if (toolName.startsWith('mcp__')) return 'mcp'

  // Skill tool can execute both skills and commands
  // Commands start with '/' (e.g., /advanced-planner, /docs)
  if (toolName === 'Skill' && toolInput && typeof toolInput === 'object') {
    const input = toolInput as { skill?: string }
    if (input.skill?.startsWith('/')) {
      return 'command'
    }
    return 'skill'
  }
  if (toolName === 'Skill') return 'skill'

  return 'tool'
}

function extractShortInput(input: unknown): string | undefined {
  if (!input || typeof input !== 'object') return undefined
  const obj = input as Record<string, unknown>
  if (obj.file_path) return String(obj.file_path).split('/').slice(-2).join('/')
  if (obj.pattern) return String(obj.pattern)
  if (obj.command) return String(obj.command).slice(0, 40)
  if (obj.prompt) return String(obj.prompt).slice(0, 40)
  return undefined
}

export function reconstructFromSession(session: Session): ReconstructionResult {
  const logs: LogEntry[] = []
  const scopedTodos: ScopedTodos = { global: [], byAgent: new Map() }
  const toolHistory: ToolUse[] = []
  const mcpServers = new Set<string>()
  const rules = new Set<string>()
  const skills = new Set<string>()

  // Build agent lookup map from session.agents
  const agentMap = new Map<string, PersistedAgent>()
  session.agents?.forEach(a => {
    if (a.toolUseId) agentMap.set(a.toolUseId, a)
    agentMap.set(a.id, a)
  })

  for (const msg of session.messages) {
    // User messages
    if (msg.role === 'user') {
      logs.push({
        id: crypto.randomUUID(),
        type: 'response',
        content: `> ${msg.content}`,
        timestamp: new Date(msg.timestamp),
        images: msg.images,
      })
      continue
    }

    // Assistant messages - reconstruct from executionEvents
    const events = msg.executionEvents || []

    // First pass: collect agent steps by parent toolUseId
    const agentStepsMap = new Map<string, AgentStep[]>()
    for (const event of events) {
      if (event.type === 'tool_use' && event.parentToolUseId && event.toolName !== 'Task') {
        const step: AgentStep = {
          tool: event.toolName!,
          timestamp: new Date(event.timestamp),
          status: 'completed',
          input: extractShortInput(event.toolInput),
          toolUseId: event.toolUseId,
        }
        const steps = agentStepsMap.get(event.parentToolUseId) || []
        steps.push(step)
        agentStepsMap.set(event.parentToolUseId, steps)
      }
    }

    // Map to track tool_use logs by toolUseId for later tool_result matching
    const toolLogMap = new Map<string, number>()

    // Second pass: create logs from events
    for (const event of events) {
      switch (event.type) {
        case 'thinking':
          if (event.thinkingContent) {
            logs.push({
              id: event.id,
              type: 'thinking',
              content: event.thinkingContent,
              timestamp: new Date(event.timestamp),
            })
          }
          break

        case 'tool_use': {
          const isAgent = event.toolName === 'Task'
          const agent = event.toolUseId ? agentMap.get(event.toolUseId) : undefined

          // Skip sub-agent tools for top-level logs - they appear as steps in parent
          if (event.parentToolUseId) break

          const logEntry: LogEntry = {
            id: event.id,
            type: 'tool',
            content: `Using ${event.toolName}`,
            timestamp: new Date(event.timestamp),
            tool: event.toolName,
            toolInput: event.toolInput,
            toolUseId: event.toolUseId,
          }

          if (isAgent && agent) {
            logEntry.agentType = agent.type
            logEntry.agentStatus = agent.status as 'running' | 'completed' | 'failed'
            logEntry.agentError = agent.error
            logEntry.agentSteps = agentStepsMap.get(event.toolUseId!) || []
            logEntry.toolOutput = agent.result
          }

          const logIndex = logs.push(logEntry) - 1
          if (event.toolUseId) {
            toolLogMap.set(event.toolUseId, logIndex)
          }

          // Track tool history
          toolHistory.push({
            name: event.toolName!,
            type: classifyTool(event.toolName!, event.toolInput),
            timestamp: new Date(event.timestamp),
            status: 'completed',
            toolUseId: event.toolUseId,
          })

          // Extract TodoWrite
          if (event.toolName === 'TodoWrite' && event.toolInput) {
            const input = event.toolInput as { todos?: TodoItem[] }
            if (input.todos) {
              if (event.parentToolUseId) {
                scopedTodos.byAgent.set(event.parentToolUseId, input.todos)
              } else {
                scopedTodos.global = input.todos
              }
            }
          }
          break
        }

        case 'tool_result': {
          if (event.toolUseId && toolLogMap.has(event.toolUseId)) {
            const idx = toolLogMap.get(event.toolUseId)!
            if (event.toolOutput) {
              logs[idx] = { ...logs[idx], toolOutput: event.toolOutput }
            }
          }
          break
        }

        case 'context':
          if (event.contextName) {
            if (event.contextType === 'mcp') mcpServers.add(event.contextName)
            else if (event.contextType === 'rule') rules.add(event.contextName)
            else if (event.contextType === 'skill') skills.add(event.contextName)

            logs.push({
              id: event.id,
              type: 'init',
              content: `context:${event.contextType}:${event.contextName}`,
              timestamp: new Date(event.timestamp),
              toolInput: event.contextDetail,
            })
          }
          break

        case 'agent_start': {
          // Already handled via tool_use for Task
          break
        }

        case 'agent_end': {
          // Update agent log if not already done via tool_result
          if (event.toolUseId && toolLogMap.has(event.toolUseId)) {
            const idx = toolLogMap.get(event.toolUseId)!
            const currentLog = logs[idx]
            if (!currentLog.agentStatus || currentLog.agentStatus === 'running') {
              logs[idx] = {
                ...currentLog,
                agentStatus: event.agentStatus as 'completed' | 'failed',
                agentError: event.agentError,
              }
            }
          }
          break
        }

        case 'todo_update':
          if (event.todos) {
            if (event.parentToolUseId) {
              scopedTodos.byAgent.set(event.parentToolUseId, event.todos)
            } else {
              scopedTodos.global = event.todos
            }
          }
          break
      }
    }

    // Add the text response content if present
    if (msg.content) {
      logs.push({
        id: crypto.randomUUID(),
        type: 'response',
        content: msg.content,
        timestamp: new Date(msg.timestamp),
      })
    }

    // Merge context from snapshot if available
    if (msg.contextSnapshot) {
      msg.contextSnapshot.mcpServers?.forEach(s => mcpServers.add(s))
      msg.contextSnapshot.rules?.forEach(r => rules.add(r))
      msg.contextSnapshot.skills?.forEach(s => skills.add(s))
    }
  }

  return {
    logs,
    scopedTodos,
    toolHistory,
    activeContext: {
      mcpServers: Array.from(mcpServers),
      rules: Array.from(rules),
      toolHistory: toolHistory.slice(-50),
      tools: [...new Set(toolHistory.map(t => t.name))],
      activeAgents: [],
    },
  }
}
