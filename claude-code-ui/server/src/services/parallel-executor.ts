import { EventEmitter } from 'events'
import { AgentSpawner, type SpawnConfig } from './agent-spawner'
import { expertStore as defaultExpertStore, type ExpertStore, type Expertise } from './expert-store'
import { logger } from '../logger'

const log = logger.child('parallel-executor')

export interface ParallelExecutionConfig {
  maxParallelAgents: number
  timeout: number
  requireConsensus: boolean
  consensusThreshold: number
  allowPartialResults: boolean
}

export interface ExpertTask {
  expertId: string
  prompt: string
  priority?: number
  required?: boolean
}

export interface ExpertResult {
  expertId: string
  agentId: string
  output: string
  success: boolean
  toolCalls: number
  durationMs: number
  confidence: number
  expertise?: Expertise
}

export interface ParallelExecutionResult {
  executionId: string
  results: ExpertResult[]
  startedAt: Date
  completedAt: Date
  totalDurationMs: number
  successCount: number
  failureCount: number
  consensus?: ConsensusResult
}

export interface ConsensusResult {
  achieved: boolean
  score: number
  agreementLevel: 'full' | 'majority' | 'partial' | 'none'
  mergedOutput: string
  conflicts: ConflictInfo[]
}

export interface ConflictInfo {
  topic: string
  experts: string[]
  positions: string[]
}

const DEFAULT_CONFIG: ParallelExecutionConfig = {
  maxParallelAgents: 5,
  timeout: 5 * 60 * 1000,
  requireConsensus: false,
  consensusThreshold: 0.7,
  allowPartialResults: true,
}

export class ParallelExecutor extends EventEmitter {
  private spawner: AgentSpawner
  private expertStore: ExpertStore
  private config: ParallelExecutionConfig
  private activeExecutions: Map<string, ParallelExecutionResult> = new Map()

  constructor(
    spawner: AgentSpawner,
    config?: Partial<ParallelExecutionConfig>,
    expertStore?: ExpertStore
  ) {
    super()
    this.spawner = spawner
    this.expertStore = expertStore ?? defaultExpertStore
    this.config = { ...DEFAULT_CONFIG, ...config }

    this.spawner.on('tool_use', (data) => this.emit('agent:tool_use', data))
  }

  async executeParallel(
    tasks: ExpertTask[],
    sessionId: string,
    workDir?: string
  ): Promise<ParallelExecutionResult> {
    const executionId = `parallel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const startedAt = new Date()

    log.info('Starting parallel execution', {
      executionId,
      taskCount: tasks.length,
      experts: tasks.map(t => t.expertId),
    })

    this.emit('execution:started', { executionId, taskCount: tasks.length })

    const limitedTasks = tasks.slice(0, this.config.maxParallelAgents)
    if (tasks.length > this.config.maxParallelAgents) {
      log.warn('Tasks exceed max parallel agents, limiting', {
        requested: tasks.length,
        limited: this.config.maxParallelAgents,
      })
    }

    const expertiseMap = new Map<string, Expertise>()
    for (const task of limitedTasks) {
      try {
        const expertise = await this.expertStore.load(task.expertId)
        expertiseMap.set(task.expertId, expertise)
      } catch (error) {
        log.warn('Failed to load expertise', { expertId: task.expertId, error: String(error) })
      }
    }

    const resultPromises = limitedTasks.map(task =>
      this.executeExpertTask(task, sessionId, executionId, workDir, expertiseMap.get(task.expertId))
    )

    const settledResults = await Promise.allSettled(resultPromises)

    const results: ExpertResult[] = []
    for (let i = 0; i < settledResults.length; i++) {
      const settled = settledResults[i]
      const task = limitedTasks[i]

      if (settled.status === 'fulfilled') {
        results.push(settled.value)
      } else {
        log.error('Expert task failed', {
          expertId: task.expertId,
          error: settled.reason,
        })

        if (task.required && !this.config.allowPartialResults) {
          throw new Error(`Required expert ${task.expertId} failed: ${settled.reason}`)
        }

        results.push({
          expertId: task.expertId,
          agentId: 'failed',
          output: `Error: ${settled.reason}`,
          success: false,
          toolCalls: 0,
          durationMs: 0,
          confidence: 0,
        })
      }
    }

    const completedAt = new Date()
    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    let consensus: ConsensusResult | undefined
    if (this.config.requireConsensus && successCount > 1) {
      consensus = this.calculateConsensus(results.filter(r => r.success))
    }

    const execution: ParallelExecutionResult = {
      executionId,
      results,
      startedAt,
      completedAt,
      totalDurationMs: completedAt.getTime() - startedAt.getTime(),
      successCount,
      failureCount,
      consensus,
    }

    this.activeExecutions.set(executionId, execution)

    log.info('Parallel execution complete', {
      executionId,
      totalDurationMs: execution.totalDurationMs,
      successCount,
      failureCount,
      consensusAchieved: consensus?.achieved,
    })

    this.emit('execution:completed', execution)

    return execution
  }

  async executeWithExperts(
    prompt: string,
    expertIds: string[],
    sessionId: string,
    workDir?: string
  ): Promise<ParallelExecutionResult> {
    const tasks: ExpertTask[] = expertIds.map(expertId => ({
      expertId,
      prompt,
      required: false,
    }))

    return this.executeParallel(tasks, sessionId, workDir)
  }

  async executeAllExperts(
    prompt: string,
    sessionId: string,
    workDir?: string
  ): Promise<ParallelExecutionResult> {
    const experts = await this.expertStore.list()
    const expertIds = experts.map(e => e.id)

    return this.executeWithExperts(prompt, expertIds, sessionId, workDir)
  }

  private async executeExpertTask(
    task: ExpertTask,
    sessionId: string,
    executionId: string,
    workDir?: string,
    expertise?: Expertise
  ): Promise<ExpertResult> {
    const startTime = Date.now()

    log.debug('Executing expert task', {
      executionId,
      expertId: task.expertId,
    })

    this.emit('expert:started', { executionId, expertId: task.expertId })

    const enrichedPrompt = this.enrichPromptWithExpertise(task.prompt, expertise)

    const spawnConfig: SpawnConfig = {
      type: `expert:${task.expertId}`,
      prompt: enrichedPrompt,
      sessionId,
      parentExecutionId: executionId,
      maxTokens: 1000,
      timeout: this.config.timeout,
      workDir,
      expertId: task.expertId,
    }

    const result = await this.spawner.spawn(spawnConfig)
    const durationMs = Date.now() - startTime

    const expertResult: ExpertResult = {
      expertId: task.expertId,
      agentId: result.agentId,
      output: result.output,
      success: result.success,
      toolCalls: result.metrics.toolCalls,
      durationMs,
      confidence: expertise?.confidence ?? 0.5,
      expertise,
    }

    this.emit('expert:completed', {
      executionId,
      expertId: task.expertId,
      success: result.success,
      durationMs,
    })

    return expertResult
  }

  private enrichPromptWithExpertise(prompt: string, expertise?: Expertise): string {
    if (!expertise) {
      return prompt
    }

    return `## Expert Context
You are the **${expertise.domain}** expert with confidence level ${(expertise.confidence * 100).toFixed(0)}%.

### Your Mental Model
${expertise.mental_model.overview}

### Key Files You Know
${(expertise.mental_model?.key_files ?? []).map(f => `- \`${f.path}\`: ${f.purpose}`).join('\n')}

### Known Patterns
${expertise.patterns?.map(p => `- **${p.name}** (${(p.confidence * 100).toFixed(0)}% confidence): ${p.usage || ''}`).join('\n') || 'None documented'}

### Known Issues
${expertise.known_issues?.map(i => `- ${i.id}: ${i.symptom}`).join('\n') || 'None documented'}

---

## Your Task
${prompt}

---

## Response Format
Please provide your expert analysis and recommendations.
At the end, include a **Confidence Assessment** section with:
- Your confidence in this response (0-100%)
- Key assumptions made
- Areas of uncertainty
`
  }

  private calculateConsensus(results: ExpertResult[]): ConsensusResult {
    if (results.length === 0) {
      return {
        achieved: false,
        score: 0,
        agreementLevel: 'none',
        mergedOutput: '',
        conflicts: [],
      }
    }

    if (results.length === 1) {
      return {
        achieved: true,
        score: 1,
        agreementLevel: 'full',
        mergedOutput: results[0].output,
        conflicts: [],
      }
    }

    const outputs = results.map(r => r.output.toLowerCase())
    const conflicts: ConflictInfo[] = []

    let agreementScore = 0
    let comparisons = 0

    for (let i = 0; i < outputs.length; i++) {
      for (let j = i + 1; j < outputs.length; j++) {
        const similarity = this.calculateSimilarity(outputs[i], outputs[j])
        agreementScore += similarity
        comparisons++

        if (similarity < 0.5) {
          conflicts.push({
            topic: 'General approach',
            experts: [results[i].expertId, results[j].expertId],
            positions: ['Different approaches detected'],
          })
        }
      }
    }

    const avgScore = comparisons > 0 ? agreementScore / comparisons : 0

    let agreementLevel: ConsensusResult['agreementLevel']
    if (avgScore >= 0.9) agreementLevel = 'full'
    else if (avgScore >= 0.7) agreementLevel = 'majority'
    else if (avgScore >= 0.4) agreementLevel = 'partial'
    else agreementLevel = 'none'

    const sortedByConfidence = [...results].sort((a, b) => b.confidence - a.confidence)
    const mergedOutput = this.mergeOutputs(sortedByConfidence)

    return {
      achieved: avgScore >= this.config.consensusThreshold,
      score: avgScore,
      agreementLevel,
      mergedOutput,
      conflicts,
    }
  }

  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 3))
    const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 3))

    const intersection = new Set([...words1].filter(x => words2.has(x)))
    const union = new Set([...words1, ...words2])

    return union.size > 0 ? intersection.size / union.size : 0
  }

  private mergeOutputs(results: ExpertResult[]): string {
    if (results.length === 0) return ''
    if (results.length === 1) return results[0].output

    let merged = `## Multi-Expert Consensus\n\n`
    merged += `Analyzed by ${results.length} experts with combined insights:\n\n`

    for (const result of results) {
      merged += `### ${result.expertId} (${(result.confidence * 100).toFixed(0)}% confidence)\n`
      merged += `${result.output.slice(0, 500)}${result.output.length > 500 ? '...' : ''}\n\n`
    }

    merged += `---\n`
    merged += `**Consensus Score**: ${(this.calculateConsensus(results).score * 100).toFixed(1)}%\n`

    return merged
  }

  getExecution(executionId: string): ParallelExecutionResult | undefined {
    return this.activeExecutions.get(executionId)
  }

  getActiveExecutions(): ParallelExecutionResult[] {
    return Array.from(this.activeExecutions.values())
  }
}

export const createParallelExecutor = (
  spawner: AgentSpawner,
  config?: Partial<ParallelExecutionConfig>
): ParallelExecutor => {
  return new ParallelExecutor(spawner, config)
}
