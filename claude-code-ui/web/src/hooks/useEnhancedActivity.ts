import { useMemo } from 'react'
import type {
  ActiveContext,
  EnhancedActivityContext,
  ContextUsage,
  ToolsUsedSummary,
  TimelineEvent,
  ActiveOperation,
  AgentUsage,
  McpUsage,
  ToolUse,
} from '../types/chat'
import { getToolTaxonomy } from '../types/chat'
import type { Agent, ClaudeConfigItem } from '../lib/api'
import { MAX_CONTEXT_TOKENS } from '../lib/constants'

interface UseEnhancedActivityOptions {
  activeContext: ActiveContext
  agents: Agent[]
  agentConfigs?: ClaudeConfigItem[]
}

function extractMcpInfo(toolName: string): { server: string; tool: string } | null {
  if (!toolName.startsWith('mcp__')) return null
  const parts = toolName.split('__')
  if (parts.length >= 3) {
    return { server: parts[1], tool: parts.slice(2).join('__') }
  }
  return null
}

function getToolBaseName(toolName: string): string {
  return toolName.split('(')[0].trim()
}

export function useEnhancedActivity({ activeContext, agents, agentConfigs = [] }: UseEnhancedActivityOptions): EnhancedActivityContext {
  return useMemo(() => {
    // Build context usage from tracked data
    const contextUsage: ContextUsage = {
      estimatedTokens: 0,
      percentage: 0,
      breakdown: {
        rules: { count: activeContext.rules.length, names: activeContext.rules },
        skills: { count: activeContext.skill ? 1 : 0, names: activeContext.skill ? [activeContext.skill] : [] },
        mcpServers: { count: activeContext.mcpServers.length, names: activeContext.mcpServers },
        memories: { count: 0 },
      },
    }

    // Estimate tokens based on loaded context (rough estimate)
    const rulesTokens = contextUsage.breakdown.rules.count * 2000
    const skillsTokens = contextUsage.breakdown.skills.count * 1500
    const mcpTokens = contextUsage.breakdown.mcpServers.count * 500
    const memoriesTokens = contextUsage.breakdown.memories.count * 300

    contextUsage.estimatedTokens = rulesTokens + skillsTokens + mcpTokens + memoriesTokens
    contextUsage.percentage = Math.round((contextUsage.estimatedTokens / MAX_CONTEXT_TOKENS) * 100)

    // Build active operations from agents + running tools
    const activeOperations: ActiveOperation[] = []

    // Add active agents
    for (const agent of agents) {
      if (agent.status === 'active' || agent.status === 'pending') {
        activeOperations.push({
          id: agent.id,
          type: 'agent',
          name: agent.type,
          status: agent.status === 'active' ? 'running' : 'pending',
          detail: agent.task.slice(0, 60),
          startedAt: new Date(agent.startedAt || agent.createdAt),
        })
      }
    }

    // Add running tools from history (ONLY high-level components)
    const runningTools = activeContext.toolHistory.filter(t => t.status === 'running')
    for (const tool of runningTools) {
      const taxonomy = getToolTaxonomy(tool.name)

      // Filter: ONLY high-level categories
      const highLevelCategories = ['agent', 'skill', 'mcp', 'hook', 'interaction', 'file-read', 'file-write', 'execution']
      if (!highLevelCategories.includes(taxonomy.category)) {
        continue  // Skip file-read, file-write, execution, navigation
      }

      const mcpInfo = extractMcpInfo(tool.name)

      // For Task, extract agent info from input (TaskOutput is just for retrieving results)
      let displayName = tool.name
      let detail = tool.input
      if (tool.name === 'Task') {
        try {
          const input = typeof tool.input === 'string' ? JSON.parse(tool.input) : tool.input
          const agentType = input?.subagent_type || 'unknown'
          const description = input?.description || input?.prompt?.slice(0, 60) || ''
          displayName = agentType
          detail = description
        } catch {
          // Keep default name if parsing fails
        }
      }

      // Map tool.type to ActiveOperation.type (agent | tool | mcp)
      const opType: 'agent' | 'tool' | 'mcp' = mcpInfo ? 'mcp' :
        tool.type === 'agent' ? 'agent' :
        tool.type === 'mcp' ? 'mcp' : 'tool'

      activeOperations.push({
        id: crypto.randomUUID(),
        type: opType,
        name: mcpInfo ? `${mcpInfo.server}:${mcpInfo.tool}` : displayName,
        status: 'running',
        detail: detail,
        startedAt: tool.timestamp,
      })
    }

    // Build tools used summary
    const toolsUsed: ToolsUsedSummary = {
      fileOps: { read: 0, write: 0, edit: 0, glob: 0, grep: 0 },
      execution: { bash: 0, skill: 0, killShell: 0 },
      agents: [],
      mcps: [],
      planning: { todoWrite: 0, planMode: 0, askUser: 0 },
      navigation: { lsp: 0, webFetch: 0, webSearch: 0 },
      total: 0,
    }

    // Count by tool name
    const toolCounts = new Map<string, number>()
    const agentCounts = new Map<string, { count: number; status: AgentUsage['status']; model?: string }>()
    const mcpCounts = new Map<string, McpUsage>()

    for (const toolName of activeContext.tools) {
      const baseName = getToolBaseName(toolName)
      const count = (toolCounts.get(baseName) || 0) + 1
      toolCounts.set(baseName, count)

      // Categorize
      const mcpInfo = extractMcpInfo(toolName)
      if (mcpInfo) {
        const existing = mcpCounts.get(mcpInfo.server)
        if (existing) {
          existing.count++
          if (!existing.tools.includes(mcpInfo.tool)) {
            existing.tools.push(mcpInfo.tool)
          }
        } else {
          mcpCounts.set(mcpInfo.server, { server: mcpInfo.server, tools: [mcpInfo.tool], count: 1 })
        }
      } else {
        switch (baseName) {
          case 'Read': toolsUsed.fileOps.read++; break
          case 'Write': toolsUsed.fileOps.write++; break
          case 'Edit': toolsUsed.fileOps.edit++; break
          case 'Glob': toolsUsed.fileOps.glob++; break
          case 'Grep': toolsUsed.fileOps.grep++; break
          case 'Bash': toolsUsed.execution.bash++; break
          case 'Skill': toolsUsed.execution.skill++; break
          case 'KillShell': toolsUsed.execution.killShell++; break
          case 'TodoWrite': toolsUsed.planning.todoWrite++; break
          case 'EnterPlanMode':
          case 'ExitPlanMode': toolsUsed.planning.planMode++; break
          case 'AskUserQuestion': toolsUsed.planning.askUser++; break
          case 'LSP': toolsUsed.navigation.lsp++; break
          case 'WebFetch': toolsUsed.navigation.webFetch++; break
          case 'WebSearch': toolsUsed.navigation.webSearch++; break
          case 'Task':
          case 'TaskOutput':
            // Handle Task separately in agents section
            break
        }
      }
    }

    // Build agents summary from API data
    for (const agent of agents) {
      const existing = agentCounts.get(agent.type)
      const status: AgentUsage['status'] =
        agent.status === 'completed' ? 'completed' :
        agent.status === 'failed' ? 'failed' : 'running'

      // Look up agent config for model
      const agentConfig = agentConfigs.find(c => c.name === agent.type)
      const model = agentConfig?.model

      if (existing) {
        existing.count++
        // Prioritize running > failed > completed for display
        if (status === 'running') existing.status = 'running'
        else if (status === 'failed' && existing.status !== 'running') existing.status = 'failed'
        // Keep the model from config
        if (model && !existing.model) existing.model = model
      } else {
        agentCounts.set(agent.type, { count: 1, status, model })
      }
    }

    toolsUsed.agents = Array.from(agentCounts.entries()).map(([name, data]) => ({
      name,
      status: data.status,
      count: data.count,
      model: data.model,
    }))

    toolsUsed.mcps = Array.from(mcpCounts.values())

    // Calculate total
    toolsUsed.total =
      Object.values(toolsUsed.fileOps).reduce((a, b) => a + b, 0) +
      Object.values(toolsUsed.execution).reduce((a, b) => a + b, 0) +
      Object.values(toolsUsed.planning).reduce((a, b) => a + b, 0) +
      Object.values(toolsUsed.navigation).reduce((a, b) => a + b, 0) +
      toolsUsed.agents.reduce((a, b) => a + b.count, 0) +
      toolsUsed.mcps.reduce((a, b) => a + b.count, 0)

    // Build timeline from tool history - FILTER high-level only
    const highLevelCategories = ['agent', 'skill', 'mcp', 'hook', 'interaction', 'file-read', 'file-write', 'execution']

    const timeline: TimelineEvent[] = activeContext.toolHistory
      .slice(-15)
      .filter(item => {
        const taxonomy = getToolTaxonomy(item.name)
        return highLevelCategories.includes(taxonomy.category)
      })
      .map((item: ToolUse) => {
        const mcpInfo = extractMcpInfo(item.name)
        const taxonomy = getToolTaxonomy(item.name)

        return {
          id: crypto.randomUUID(),
          timestamp: item.timestamp,
          type: mcpInfo ? 'mcp' as const : item.type === 'agent' ? 'agent' as const : 'tool' as const,
          name: mcpInfo ? `${mcpInfo.server}:${mcpInfo.tool}` : item.name,
          status: item.status,
          category: taxonomy.category,
          detail: item.input,
        }
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    return {
      contextUsage,
      activeOperations,
      toolsUsed,
      timeline,
    }
  }, [activeContext, agents, agentConfigs])
}
