import { logger } from '../logger'
import { EventEmitter } from 'events'
import { AGENT_TTL_MS, AGENT_CLEANUP_INTERVAL_MS } from '../constants'

const log = logger.child('agent-registry')

export type AgentStatus = 'pending' | 'active' | 'completed' | 'failed' | 'deleted'
export type AgentType = 'scout' | 'architect' | 'builder' | 'reviewer' | 'general-purpose' | 'Explore' | 'Plan' | 'code-quality' | 'refactor-agent' | 'command-loader' | 'planner' | 'error-analyzer'

export interface Agent {
  id: string
  type: AgentType
  sessionId: string
  status: AgentStatus
  task: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  result?: string
  error?: string
  tokensUsed?: number
  parentAgentId?: string
  toolCalls?: number
  expertiseUsed?: string
}

export interface AgentMetrics {
  totalAgents: number
  activeAgents: number
  completedAgents: number
  failedAgents: number
  delegationRate: number
  avgDurationMs: number
  totalTokens: number
  totalToolCalls: number
  expertiseUsageRate: number
}

export interface SessionAgentStats {
  sessionId: string
  agents: Agent[]
  metrics: AgentMetrics
}

class AgentRegistry extends EventEmitter {
  private agents: Map<string, Agent> = new Map()
  private sessionAgents: Map<string, Set<string>> = new Map()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  startCleanup(ttlMs: number = AGENT_TTL_MS): void {
    if (this.cleanupInterval) return

    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      let cleaned = 0

      for (const [id, agent] of this.agents) {
        if (['completed', 'failed', 'deleted'].includes(agent.status)) {
          const completedAt = agent.completedAt?.getTime() || agent.createdAt.getTime()
          if (now - completedAt > ttlMs) {
            this.agents.delete(id)
            const sessionIds = this.sessionAgents.get(agent.sessionId)
            if (sessionIds) {
              sessionIds.delete(id)
              if (sessionIds.size === 0) {
                this.sessionAgents.delete(agent.sessionId)
              }
            }
            cleaned++
          }
        }
      }

      if (cleaned > 0) {
        log.info('TTL cleanup completed', { cleaned, remaining: this.agents.size })
      }
    }, AGENT_CLEANUP_INTERVAL_MS)

    log.info('Agent TTL cleanup started', { ttlMs })
  }

  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
      log.info('Agent TTL cleanup stopped')
    }
  }

  createAgent(params: {
    type: AgentType
    sessionId: string
    task: string
    parentAgentId?: string
  }): Agent {
    const id = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const agent: Agent = {
      id,
      type: params.type,
      sessionId: params.sessionId,
      status: 'pending',
      task: params.task,
      createdAt: new Date(),
      parentAgentId: params.parentAgentId,
    }

    this.agents.set(id, agent)

    if (!this.sessionAgents.has(params.sessionId)) {
      this.sessionAgents.set(params.sessionId, new Set())
    }
    this.sessionAgents.get(params.sessionId)!.add(id)

    log.info('Agent created', { id, type: params.type, sessionId: params.sessionId })
    this.emit('agent:created', agent)

    return agent
  }

  startAgent(id: string): Agent | null {
    const agent = this.agents.get(id)
    if (!agent) return null

    agent.status = 'active'
    agent.startedAt = new Date()

    log.info('Agent started', { id, type: agent.type })
    this.emit('agent:started', agent)

    return agent
  }

  completeAgent(id: string, result: string, optionsOrTokens?: number | {
    tokensUsed?: number
    toolCalls?: number
    expertiseUsed?: string
  }): Agent | null {
    const agent = this.agents.get(id)
    if (!agent) return null

    const options = typeof optionsOrTokens === 'number'
      ? { tokensUsed: optionsOrTokens }
      : optionsOrTokens

    agent.status = 'completed'
    agent.completedAt = new Date()
    agent.result = result
    agent.tokensUsed = options?.tokensUsed
    agent.toolCalls = options?.toolCalls
    agent.expertiseUsed = options?.expertiseUsed

    const duration = agent.startedAt
      ? agent.completedAt.getTime() - agent.startedAt.getTime()
      : 0

    log.info('Agent completed', {
      id,
      type: agent.type,
      durationMs: duration,
      tokensUsed: options?.tokensUsed,
      toolCalls: options?.toolCalls
    })
    this.emit('agent:completed', agent)

    return agent
  }

  incrementToolCalls(id: string): void {
    const agent = this.agents.get(id)
    if (agent) {
      agent.toolCalls = (agent.toolCalls || 0) + 1
      this.emit('agent:tool_use', { agentId: id, toolCalls: agent.toolCalls })
    }
  }

  failAgent(id: string, error: string): Agent | null {
    const agent = this.agents.get(id)
    if (!agent) return null

    agent.status = 'failed'
    agent.completedAt = new Date()
    agent.error = error

    log.warn('Agent failed', { id, type: agent.type, error })
    this.emit('agent:failed', agent)

    return agent
  }

  deleteAgent(id: string): boolean {
    const agent = this.agents.get(id)
    if (!agent) return false

    agent.status = 'deleted'

    log.info('Agent deleted', { id, type: agent.type })
    this.emit('agent:deleted', agent)

    return true
  }

  getAgent(id: string): Agent | null {
    return this.agents.get(id) || null
  }

  getSessionAgents(sessionId: string): Agent[] {
    const agentIds = this.sessionAgents.get(sessionId)
    if (!agentIds) return []

    return Array.from(agentIds)
      .map((id) => this.agents.get(id))
      .filter((a): a is Agent => a !== undefined && a.status !== 'deleted')
  }

  getActiveAgents(sessionId?: string): Agent[] {
    const agents = sessionId
      ? this.getSessionAgents(sessionId)
      : Array.from(this.agents.values())

    return agents.filter((a) => a.status === 'active')
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values()).filter((a) => a.status !== 'deleted')
  }

  getMetrics(sessionId?: string): AgentMetrics {
    const agents = sessionId
      ? this.getSessionAgents(sessionId)
      : this.getAllAgents()

    const completed = agents.filter((a) => a.status === 'completed')
    const failed = agents.filter((a) => a.status === 'failed')
    const active = agents.filter((a) => a.status === 'active')

    const durations = completed
      .filter((a) => a.startedAt && a.completedAt)
      .map((a) => a.completedAt!.getTime() - a.startedAt!.getTime())

    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0

    const totalTokens = agents.reduce((sum, a) => sum + (a.tokensUsed || 0), 0)
    const totalToolCalls = agents.reduce((sum, a) => sum + (a.toolCalls || 0), 0)

    const delegationRate = agents.length > 0
      ? (agents.filter((a) => a.parentAgentId).length / agents.length) * 100
      : 0

    const expertiseUsageRate = agents.length > 0
      ? (agents.filter((a) => a.expertiseUsed).length / agents.length) * 100
      : 0

    return {
      totalAgents: agents.length,
      activeAgents: active.length,
      completedAgents: completed.length,
      failedAgents: failed.length,
      delegationRate,
      avgDurationMs: Math.round(avgDuration),
      totalTokens,
      totalToolCalls,
      expertiseUsageRate,
    }
  }

  getSessionStats(sessionId: string): SessionAgentStats {
    return {
      sessionId,
      agents: this.getSessionAgents(sessionId),
      metrics: this.getMetrics(sessionId),
    }
  }

  clearSession(sessionId: string): number {
    const agentIds = this.sessionAgents.get(sessionId)
    if (!agentIds) return 0

    let count = 0
    for (const id of agentIds) {
      const agent = this.agents.get(id)
      if (agent) {
        agent.status = 'deleted'
        count++
      }
    }

    this.sessionAgents.delete(sessionId)
    log.info('Session agents cleared', { sessionId, count })
    this.emit('session:cleared', sessionId)

    return count
  }

  clearAll(): number {
    const count = this.agents.size
    this.agents.clear()
    this.sessionAgents.clear()
    log.info('All agents cleared', { count })
    this.emit('registry:cleared')
    return count
  }
}

export const agentRegistry = new AgentRegistry()

// Auto-start cleanup on module load
agentRegistry.startCleanup()
