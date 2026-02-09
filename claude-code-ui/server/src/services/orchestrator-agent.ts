import { EventEmitter } from 'events'
import { PromptClassifier, type ClassificationResult } from './prompt-classifier'
import { AgentSpawner, type SpawnConfig, type SpawnResult } from './agent-spawner'
import { expertStore as defaultExpertStore, type ExpertStore } from './expert-store'
import {
  metricsStore as defaultMetricsStore,
  type MetricsStore,
  type ExecutionMetrics,
} from './metrics-store'
import {
  learningLoop as defaultLearningLoop,
  type LearningLoop,
  type ExecutionTrace,
} from './learning-loop'
import { SessionStateManager, type AgentExecutionRecord } from './session-state'
import { captureFilesystemState } from './filesystem-state'
import { logger } from '../logger'

const log = logger.child('orchestrator-agent')

export interface OrchestratorConfig {
  maxConcurrentAgents: number
  summaryMaxTokens: number
  delegationThreshold: number
  defaultTimeout: number
  maxRetries: number
  retryBaseDelayMs: number
  allowFullPC: boolean
}

export interface TaskExecution {
  id: string
  originalPrompt: string
  sessionId: string
  classification: ClassificationResult
  spawnedAgents: string[]
  status: 'planning' | 'executing' | 'synthesizing' | 'complete' | 'failed'
  results: AgentResult[]
  startedAt: Date
  completedAt?: Date
  error?: string
}

export interface AgentResult {
  agentId: string
  agentType: string
  summary: string
  toolCalls: number
  durationMs: number
  success: boolean
  expertId?: string
  extractedMeta?: {
    filesModified: string[]
    filesRead: string[]
    errors: string[]
  }
}

interface AgentPlan {
  type: string
  id: string
  priority: number
  expertId?: string
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxConcurrentAgents: 3,
  summaryMaxTokens: 2000,
  delegationThreshold: 30,
  defaultTimeout: 5 * 60 * 1000,
  maxRetries: 2,
  retryBaseDelayMs: 1000,
  allowFullPC: false,
}

export interface OrchestratorDependencies {
  expertStore?: ExpertStore
  metricsStore?: MetricsStore
  learningLoop?: LearningLoop
}

export class OrchestratorAgent extends EventEmitter {
  private classifier: PromptClassifier
  private spawner: AgentSpawner
  private expertStore: ExpertStore
  private metricsStore: MetricsStore
  private learningLoop: LearningLoop
  private config: OrchestratorConfig
  private executions: Map<string, TaskExecution> = new Map()
  private abortControllers: Map<string, AbortController> = new Map()
  private sessionStateManager?: SessionStateManager
  private disposed = false
  private cleanupInterval?: Timer
  private readonly EXECUTION_TTL_MS = 30 * 60 * 1000 // 30 minutes
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

  // Store bound handlers for cleanup
  private readonly spawnerHandlers: Map<string, (...args: unknown[]) => void> = new Map()
  private readonly learningLoopHandlers: Map<string, (...args: unknown[]) => void> = new Map()

  constructor(
    classifier: PromptClassifier,
    spawner: AgentSpawner,
    config?: Partial<OrchestratorConfig>,
    deps?: OrchestratorDependencies
  ) {
    super()
    this.classifier = classifier
    this.spawner = spawner
    this.expertStore = deps?.expertStore ?? defaultExpertStore
    this.metricsStore = deps?.metricsStore ?? defaultMetricsStore
    this.learningLoop = deps?.learningLoop ?? defaultLearningLoop
    this.config = { ...DEFAULT_CONFIG, ...config }

    // Create bound handlers and store for cleanup
    const spawnerEvents = [
      'tool_use',
      'tool_result',
      'spawned',
      'completed',
      'error',
      'text',
    ] as const
    for (const event of spawnerEvents) {
      const handler = (data: unknown) => this.emit(`agent:${event}`, data)
      this.spawnerHandlers.set(event, handler)
      this.spawner.on(event, handler)
    }

    const learningEvents = ['learning:started', 'learning:completed', 'learning:failed'] as const
    for (const event of learningEvents) {
      const handler = (data: unknown) => this.emit(event, data)
      this.learningLoopHandlers.set(event, handler)
      this.learningLoop.on(event, handler)
    }

    // Start periodic cleanup of old executions
    this.startCleanupInterval()
  }

  /**
   * Starts periodic cleanup of completed/failed executions older than TTL.
   * Runs every CLEANUP_INTERVAL_MS (5 minutes) and removes executions
   * that have been completed/failed for more than EXECUTION_TTL_MS (30 minutes).
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      let cleaned = 0
      for (const [id, execution] of this.executions) {
        if (
          (execution.status === 'complete' || execution.status === 'failed') &&
          execution.completedAt &&
          now - execution.completedAt.getTime() > this.EXECUTION_TTL_MS
        ) {
          this.executions.delete(id)
          cleaned++
        }
      }
      if (cleaned > 0) {
        log.debug('Cleaned up old executions', { cleaned, remaining: this.executions.size })
      }
    }, this.CLEANUP_INTERVAL_MS)
  }

  /**
   * Dispose of the orchestrator, cleaning up all event listeners and resources.
   * After calling dispose(), the orchestrator should not be used.
   */
  public dispose(): void {
    if (this.disposed) return
    this.disposed = true

    log.info('Disposing OrchestratorAgent')

    // Clear the cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }

    // Remove spawner event listeners
    for (const [event, handler] of this.spawnerHandlers) {
      this.spawner.off(event, handler)
    }
    this.spawnerHandlers.clear()

    // Remove learning loop event listeners
    for (const [event, handler] of this.learningLoopHandlers) {
      this.learningLoop.off(event, handler)
    }
    this.learningLoopHandlers.clear()

    // Abort any active executions
    for (const [executionId, controller] of this.abortControllers) {
      log.debug('Aborting execution during dispose', { executionId })
      controller.abort()
    }
    this.abortControllers.clear()

    // Clear executions map
    this.executions.clear()

    // Remove all listeners from this EventEmitter
    this.removeAllListeners()
  }

  /**
   * Check if the orchestrator has been disposed.
   */
  public isDisposed(): boolean {
    return this.disposed
  }

  abort(executionId: string): boolean {
    const controller = this.abortControllers.get(executionId)
    if (controller) {
      log.info('Aborting execution', { executionId })
      controller.abort()
      this.abortControllers.delete(executionId)

      const execution = this.executions.get(executionId)
      if (execution) {
        execution.status = 'failed'
        execution.error = 'Aborted by user'
        execution.completedAt = new Date()
        this.emit('aborted', { executionId })
      }
      return true
    }
    return false
  }

  getActiveExecutionId(): string | undefined {
    for (const [id, execution] of Array.from(this.executions.entries())) {
      if (
        execution.status === 'planning' ||
        execution.status === 'executing' ||
        execution.status === 'synthesizing'
      ) {
        return id
      }
    }
    return undefined
  }

  async execute(prompt: string, sessionId: string, workDir?: string): Promise<string> {
    if (this.disposed) {
      throw new Error('OrchestratorAgent has been disposed and cannot execute new tasks')
    }

    const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const startTime = Date.now()
    const abortController = new AbortController()
    this.abortControllers.set(executionId, abortController)

    log.info('Orchestrator execution start', {
      executionId,
      sessionId,
      promptLength: prompt.length,
    })

    if (this.sessionStateManager && sessionId) {
      try {
        if (workDir) {
          const fsState = await captureFilesystemState(workDir)
          this.sessionStateManager.updateFilesystemState(
            sessionId,
            fsState.diffStat,
            fsState.statusShort
          )
        }
      } catch (err) {
        log.warn('Failed to capture filesystem state', { error: String(err) })
      }
    }

    const classification = this.classifier.classify(prompt)
    this.emit('classified', { executionId, classification })

    const sessionState = this.sessionStateManager?.getState(sessionId)
    const turnNumber = sessionState ? sessionState.turns.length + 1 : 1
    const isFollowUp = turnNumber > 1

    log.info('Prompt classified', {
      executionId,
      complexity: classification.complexityScore,
      domains: classification.domains,
      isFollowUp,
      turnNumber,
    })

    const execution: TaskExecution = {
      id: executionId,
      originalPrompt: prompt,
      sessionId,
      classification,
      spawnedAgents: [],
      status: 'planning',
      results: [],
      startedAt: new Date(),
    }
    this.executions.set(executionId, execution)

    try {
      // Si no requiere delegación, retornar directamente sin spawnear agentes
      if (!classification.requiresDelegation) {
        log.info('Low complexity - no delegation needed', {
          executionId,
          complexity: classification.complexityScore,
        })
        execution.status = 'complete'
        execution.completedAt = new Date()
        await this.recordMetrics(execution, false)
        this.emit('completed', { executionId, execution })
        return `Task evaluated as low complexity (score: ${classification.complexityScore}/100). No agent delegation needed.`
      }

      execution.status = 'executing'
      this.emit('executing', { executionId })

      const agentPlan = await this.planAgents(classification)
      log.debug('Agent plan created', { executionId, planSize: agentPlan.length })

      // Verificar abort antes de iniciar
      if (abortController.signal.aborted) {
        log.info('Execution aborted before agent spawn', { executionId })
        throw new Error('Execution aborted by user')
      }

      // Limitar a maxConcurrentAgents y ejecutar en PARALELO
      const agentsToRun = agentPlan.slice(0, this.config.maxConcurrentAgents)
      log.info('Spawning agents in parallel', {
        executionId,
        totalPlanned: agentPlan.length,
        spawning: agentsToRun.length,
        maxConcurrent: this.config.maxConcurrentAgents,
      })

      const agentPromises = agentsToRun.map((agentConfig) => {
        const timeoutPromise = new Promise<never>((_, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Agent execution timeout after ${this.config.defaultTimeout}ms`))
          }, this.config.defaultTimeout)
          abortController.signal.addEventListener('abort', () => {
            clearTimeout(timeout)
            reject(new Error('Execution aborted by user'))
          })
        })

        return Promise.race([
          this.spawnAndWait(agentConfig, prompt, sessionId, executionId, workDir),
          timeoutPromise,
        ])
      })

      const results = await Promise.allSettled(agentPromises)

      for (const result of results) {
        if (result.status === 'fulfilled') {
          execution.results.push(result.value)
          execution.spawnedAgents.push(result.value.agentId)

          if (!result.value.success) {
            log.warn('Agent failed, but others may succeed', {
              executionId,
              agentId: result.value.agentId,
            })
          }
        } else {
          log.warn('Agent promise rejected', {
            executionId,
            reason: result.reason?.message || String(result.reason),
          })
        }
      }

      execution.status = 'synthesizing'
      const synthesis = this.synthesizeResults(execution)

      if (this.sessionStateManager && sessionId) {
        const agentRecords: AgentExecutionRecord[] = execution.results.map((r) => ({
          agentType: r.agentType,
          summary: r.summary,
          filesModified: r.extractedMeta?.filesModified ?? [],
          filesRead: r.extractedMeta?.filesRead ?? [],
          success: r.success,
          errors: r.extractedMeta?.errors ?? [],
          durationMs: r.durationMs,
        }))

        this.sessionStateManager.recordTurn(
          sessionId,
          execution.originalPrompt,
          agentRecords,
          synthesis
        )
      }

      execution.status = 'complete'
      execution.completedAt = new Date()

      await this.recordMetrics(execution, true)
      this.emit('completed', { executionId, execution })

      log.info('Orchestrator execution complete', {
        executionId,
        durationMs: Date.now() - startTime,
        agentsUsed: execution.results.length,
        totalToolCalls: execution.results.reduce((sum, r) => sum + r.toolCalls, 0),
      })

      return synthesis
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      execution.status = 'failed'
      execution.error = errorMessage
      execution.completedAt = new Date()

      await this.recordMetrics(execution, true)
      this.emit('failed', { executionId, error: errorMessage })

      log.error('Orchestrator execution failed', { executionId, error: errorMessage })

      throw error
    } finally {
      this.abortControllers.delete(executionId)
    }
  }

  private async planAgents(classification: ClassificationResult): Promise<AgentPlan[]> {
    const plan: AgentPlan[] = []
    const availableExperts = await this.getAvailableExperts()

    const matchedExperts = classification.suggestedExperts.filter((expertId) =>
      availableExperts.includes(expertId)
    )

    if (matchedExperts.length > 0) {
      for (const expertId of matchedExperts) {
        plan.push({
          type: `expert:${expertId}`,
          id: expertId,
          priority: 1,
          expertId,
        })
      }
    } else {
      for (const agentType of classification.suggestedAgents) {
        plan.push({
          type: agentType,
          id: agentType,
          priority: this.getAgentPriority(agentType),
        })
      }
    }

    return plan.sort((a, b) => a.priority - b.priority)
  }

  private async spawnAndWait(
    agentConfig: AgentPlan,
    originalPrompt: string,
    sessionId: string,
    executionId: string,
    workDir?: string
  ): Promise<AgentResult> {
    const enrichedPrompt = this.enrichPromptForAgent(agentConfig, originalPrompt, sessionId)
    const startTime = Date.now()

    const hasSessionContext = !!this.sessionStateManager?.getState(sessionId)?.turns.length

    log.info('Pre-spawn agent', {
      executionId,
      agentType: agentConfig.type,
      promptLength: enrichedPrompt.length,
      hasSessionContext,
    })

    const spawnConfig: SpawnConfig = {
      type: agentConfig.type,
      prompt: enrichedPrompt,
      sessionId,
      parentExecutionId: executionId,
      maxTokens: this.config.summaryMaxTokens,
      timeout: this.config.defaultTimeout,
      workDir,
      expertId: agentConfig.expertId,
      allowFullPC: this.config.allowFullPC,
    }

    let result: SpawnResult | undefined
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        result = await this.spawner.spawn(spawnConfig)

        if (result.success) {
          break
        }

        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryBaseDelayMs * Math.pow(2, attempt)
          log.info('Agent failed, retrying with backoff', {
            executionId,
            agentType: agentConfig.type,
            attempt: attempt + 1,
            maxRetries: this.config.maxRetries,
            delayMs: delay,
            output: result.output?.slice(0, 100),
          })
          await this.sleep(delay)
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryBaseDelayMs * Math.pow(2, attempt)
          log.info('Agent spawn threw error, retrying', {
            executionId,
            agentType: agentConfig.type,
            attempt: attempt + 1,
            error: lastError.message,
            delayMs: delay,
          })
          await this.sleep(delay)
        }
      }
    }

    if (!result) {
      result = {
        agentId: `failed-${Date.now()}`,
        success: false,
        output: lastError?.message || 'Agent spawn failed after retries',
        metrics: { toolCalls: 0, durationMs: 0, tokensUsed: 0 },
      }
    }

    const durationMs = Date.now() - startTime

    const agentResult: AgentResult = {
      agentId: result.agentId,
      agentType: agentConfig.type,
      summary: this.truncateSummary(result.output, this.config.summaryMaxTokens),
      toolCalls: result.metrics.toolCalls,
      durationMs,
      success: result.success,
      expertId: agentConfig.expertId,
      extractedMeta: result.extractedMeta
        ? {
            filesModified: result.extractedMeta.filesModified,
            filesRead: result.extractedMeta.filesRead,
            errors: result.extractedMeta.errors,
          }
        : undefined,
    }

    log.info('Post-spawn agent', {
      executionId,
      agentType: agentConfig.type,
      success: agentResult.success,
      outputLength: result.output.length,
      filesModified: agentResult.extractedMeta?.filesModified ?? [],
      truncated: result.output.length > this.config.summaryMaxTokens * 4,
    })

    if (agentConfig.expertId) {
      const trace: ExecutionTrace = {
        agentId: result.agentId,
        agentType: agentConfig.type,
        expertId: agentConfig.expertId,
        sessionId,
        prompt: originalPrompt,
        output: result.output,
        success: result.success,
        toolCalls: result.metrics.toolCalls,
        durationMs,
      }

      this.learningLoop.processExecution(trace).catch((err) => {
        log.warn('Learning loop failed', { error: String(err), agentId: result.agentId })
      })
    }

    return agentResult
  }

  private enrichPromptForAgent(
    config: AgentPlan,
    originalPrompt: string,
    sessionId?: string
  ): string {
    const sessionContext = sessionId
      ? this.sessionStateManager?.getContextForOrchestrator(sessionId) || ''
      : ''

    const basePrompt = `## Context
You are a specialized agent invoked by the Lead Orchestrator.
Your task comes from the user's original request.

## Critical Instructions
1. Generate an **EXECUTIVE SUMMARY** when done (max ${this.config.summaryMaxTokens} tokens)
2. Include: modified files, key changes, metrics
3. Do NOT include full code in the summary
4. The Orchestrator only sees your summary

## User Task
${originalPrompt}

## Your Specialization
Agent type: ${config.type}
${config.expertId ? `Expert ID: ${config.expertId}` : ''}
`

    if (sessionContext) {
      const sessionState = sessionId ? this.sessionStateManager?.getState(sessionId) : undefined

      log.info('Session context injected', {
        sessionId,
        turnNumber: sessionState ? sessionState.turns.length + 1 : 1,
        messagesCount: sessionState?.turns.length ?? 0,
      })

      return `${sessionContext}\n\n---\n\n${basePrompt}`
    }

    return basePrompt
  }

  private synthesizeResults(execution: TaskExecution): string {
    const { classification, results } = execution

    const totalToolCalls = results.reduce((sum, r) => sum + r.toolCalls, 0)
    const totalTime = results.reduce((sum, r) => sum + r.durationMs, 0)
    const allSuccess = results.every((r) => r.success)
    const successCount = results.filter((r) => r.success).length

    let synthesis = `## Task ${allSuccess ? 'Completed ✅' : 'Partially Completed ⚠️'}\n\n`

    synthesis += `### Work Performed\n\n`
    for (const result of results) {
      const status = result.success ? '✅' : '❌'
      synthesis += `**${result.agentType}** ${status} (${result.durationMs}ms):\n`
      synthesis += `${result.summary}\n\n`
    }

    synthesis += `### Metrics\n`
    synthesis += `| Metric | Value |\n|--------|-------|\n`
    synthesis += `| Agents used | ${results.length} (${successCount} success) |\n`
    synthesis += `| Total tool calls | ${totalToolCalls} |\n`
    synthesis += `| Total time | ${totalTime}ms |\n`
    synthesis += `| Complexity score | ${classification.complexityScore}/100 |\n`
    synthesis += `| Domains | ${classification.domains.join(', ') || 'general'} |\n`

    if (results.some((r) => r.expertId)) {
      const experts = results.filter((r) => r.expertId).map((r) => r.expertId)
      synthesis += `| Expertise used | ${experts.join(', ')} |\n`
    }

    return synthesis
  }

  private truncateSummary(text: string, maxTokens: number): string {
    const maxChars = maxTokens * 4
    if (text.length <= maxChars) return text

    return text.substring(0, maxChars - 100) + '\n\n[SUMMARY TRUNCATED - EXCEEDED TOKEN LIMIT]'
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private getAgentPriority(agentType: string): number {
    const priorities: Record<string, number> = {
      scout: 1,
      Explore: 1,
      architect: 2,
      Plan: 2,
      builder: 3,
      'general-purpose': 3,
      reviewer: 4,
      'code-quality': 4,
      'refactor-agent': 5,
    }
    return priorities[agentType] ?? 5
  }

  private async getAvailableExperts(): Promise<string[]> {
    try {
      const experts = await this.expertStore.list()
      return experts.map((e) => e.id)
    } catch {
      // Expert store unavailable, continue without expert capabilities
      return []
    }
  }

  private async recordMetrics(execution: TaskExecution, usedOrchestrator: boolean): Promise<void> {
    const metrics: ExecutionMetrics = {
      id: execution.id,
      timestamp: execution.startedAt.toISOString(),
      prompt: execution.originalPrompt.slice(0, 200),
      sessionId: execution.sessionId,
      useOrchestrator: usedOrchestrator,
      classification: {
        complexityScore: execution.classification.complexityScore,
        domains: execution.classification.domains,
        requiresDelegation: execution.classification.requiresDelegation,
      },
      agentsSpawned: execution.spawnedAgents.length,
      totalToolCalls: execution.results.reduce((sum, r) => sum + r.toolCalls, 0),
      durationMs: execution.completedAt
        ? execution.completedAt.getTime() - execution.startedAt.getTime()
        : 0,
      success: execution.status === 'complete',
      partialSuccess:
        execution.results.some((r) => r.success) && execution.results.some((r) => !r.success),
      expertiseUsed: execution.results.some((r) => r.expertId),
      agentMetrics: execution.results.map((r) => ({
        agentId: r.agentId,
        agentType: r.agentType,
        toolCalls: r.toolCalls,
        durationMs: r.durationMs,
        selfImproved: false,
      })),
    }

    try {
      await this.metricsStore.record(metrics)
      log.debug('Metrics recorded', { executionId: execution.id })
    } catch (error) {
      log.warn('Failed to record metrics', { error: String(error) })
    }
  }

  getExecution(executionId: string): TaskExecution | undefined {
    return this.executions.get(executionId)
  }

  getActiveExecutions(): TaskExecution[] {
    return Array.from(this.executions.values()).filter(
      (e) => e.status !== 'complete' && e.status !== 'failed'
    )
  }

  updateClassifierExperts(experts: string[]): void {
    this.classifier.setAvailableExperts(experts)
  }

  setSessionStateManager(manager: SessionStateManager): void {
    this.sessionStateManager = manager
  }
}

export const createOrchestratorAgent = (
  classifier: PromptClassifier,
  spawner: AgentSpawner,
  config?: Partial<OrchestratorConfig>
): OrchestratorAgent => {
  return new OrchestratorAgent(classifier, spawner, config)
}
