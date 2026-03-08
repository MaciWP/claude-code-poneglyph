import { EventEmitter } from 'events'
import type { ExecutionTrace, AgentTrace, TraceEvent } from '@shared/types'
import { logger } from '../logger'

const log = logger.child('trace-collector')

export class TraceCollector extends EventEmitter {
  private readonly MAX_TRACES = 100
  private traces = new Map<string, ExecutionTrace>()
  private sessionToTrace = new Map<string, string>()

  startTrace(sessionId: string, prompt: string): ExecutionTrace {
    const trace: ExecutionTrace = {
      id: crypto.randomUUID(),
      sessionId,
      prompt,
      promptScore: 0,
      complexityScore: 0,
      skillsLoaded: [],
      agents: [],
      totalTokens: 0,
      totalCostUsd: 0,
      durationMs: 0,
      status: 'running',
      timestamp: new Date().toISOString(),
    }

    this.traces.set(trace.id, trace)
    this.sessionToTrace.set(sessionId, trace.id)

    log.info('Trace started', { traceId: trace.id, sessionId })
    this.emitTraceEvent('trace:start', trace)

    return trace
  }

  updateTrace(traceId: string, updates: Partial<ExecutionTrace>): void {
    const trace = this.traces.get(traceId)
    if (!trace) {
      log.warn('Trace not found for update', { traceId })
      return
    }

    Object.assign(trace, updates)
    this.emitTraceEvent('trace:update', trace)
  }

  addAgent(traceId: string, agent: Omit<AgentTrace, 'id'>): string {
    const trace = this.traces.get(traceId)
    if (!trace) {
      log.warn('Trace not found for addAgent', { traceId })
      return ''
    }

    const agentTrace: AgentTrace = {
      ...agent,
      id: crypto.randomUUID(),
    }

    trace.agents.push(agentTrace)

    log.debug('Agent added to trace', {
      traceId,
      agentId: agentTrace.id,
      type: agentTrace.type,
    })
    this.emitTraceEvent('trace:agent_start', trace)

    return agentTrace.id
  }

  updateAgent(traceId: string, agentId: string, updates: Partial<AgentTrace>): void {
    const trace = this.traces.get(traceId)
    if (!trace) {
      log.warn('Trace not found for updateAgent', { traceId })
      return
    }

    const agent = trace.agents.find((a) => a.id === agentId)
    if (!agent) {
      log.warn('Agent not found in trace', { traceId, agentId })
      return
    }

    Object.assign(agent, updates)

    if (updates.status === 'completed' || updates.status === 'failed') {
      if (agent.startedAt && !agent.completedAt) {
        agent.completedAt = new Date().toISOString()
      }
      if (agent.startedAt) {
        agent.durationMs =
          new Date(agent.completedAt!).getTime() - new Date(agent.startedAt).getTime()
      }
      this.emitTraceEvent('trace:agent_complete', trace)
    } else {
      this.emitTraceEvent('trace:update', trace)
    }
  }

  completeTrace(traceId: string, status: 'completed' | 'failed'): ExecutionTrace | undefined {
    const trace = this.traces.get(traceId)
    if (!trace) {
      log.warn('Trace not found for complete', { traceId })
      return undefined
    }

    trace.status = status
    trace.durationMs = Date.now() - new Date(trace.timestamp).getTime()

    // Accumulate agent tokens
    trace.totalTokens = trace.agents.reduce((sum, a) => sum + a.tokensUsed, 0)

    log.info('Trace completed', {
      traceId,
      status,
      durationMs: trace.durationMs,
      agents: trace.agents.length,
    })
    this.emitTraceEvent('trace:complete', trace)

    // Clean up session mapping
    this.sessionToTrace.delete(trace.sessionId)

    // Evict oldest traces to prevent memory leak
    if (this.traces.size > this.MAX_TRACES) {
      const oldest = this.traces.keys().next().value
      if (oldest) this.traces.delete(oldest)
    }

    return trace
  }

  getTrace(traceId: string): ExecutionTrace | undefined {
    return this.traces.get(traceId)
  }

  getTraceBySession(sessionId: string): ExecutionTrace | undefined {
    const traceId = this.sessionToTrace.get(sessionId)
    if (!traceId) return undefined
    return this.traces.get(traceId)
  }

  getActiveTraces(): ExecutionTrace[] {
    return Array.from(this.traces.values()).filter((t) => t.status === 'running')
  }

  private emitTraceEvent(type: TraceEvent['type'], trace: ExecutionTrace): void {
    const event: TraceEvent = { type, trace }
    this.emit(type, event)
    this.emit('trace_event', event)
  }
}

export const traceCollector = new TraceCollector()
