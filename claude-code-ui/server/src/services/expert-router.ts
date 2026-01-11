import { EventEmitter } from 'events'
import { PromptClassifier, type ClassificationResult } from './prompt-classifier'
import { expertStore as defaultExpertStore, type ExpertStore, type ExpertSummary } from './expert-store'
import { ParallelExecutor, type ParallelExecutionResult, type ExpertTask } from './parallel-executor'
import { ResultComparator, type DetailedComparison, type ValidationResult } from './result-comparator'
import { logger } from '../logger'

const log = logger.child('expert-router')

export interface RoutingStrategy {
  name: 'single' | 'parallel' | 'cascade' | 'consensus' | 'specialist'
  description: string
}

export interface RoutingDecision {
  strategy: RoutingStrategy
  selectedExperts: string[]
  reasoning: string
  estimatedDuration: number
  confidenceThreshold: number
  requireConsensus: boolean
}

export interface RouterConfig {
  defaultStrategy: RoutingStrategy['name']
  minExpertsForConsensus: number
  maxExpertsPerQuery: number
  confidenceThreshold: number
  enableCascade: boolean
  cascadeConfidenceBoost: number
}

export interface MultiExpertResult {
  routingDecision: RoutingDecision
  execution: ParallelExecutionResult
  comparison?: DetailedComparison
  validation: ValidationResult
  finalOutput: string
  metadata: {
    totalExperts: number
    successfulExperts: number
    totalDurationMs: number
    strategyUsed: string
  }
}

const ROUTING_STRATEGIES: Record<RoutingStrategy['name'], RoutingStrategy> = {
  single: {
    name: 'single',
    description: 'Use the single best expert for the task',
  },
  parallel: {
    name: 'parallel',
    description: 'Run multiple experts in parallel and merge results',
  },
  cascade: {
    name: 'cascade',
    description: 'Run experts sequentially, stopping when confidence is high enough',
  },
  consensus: {
    name: 'consensus',
    description: 'Require agreement between multiple experts',
  },
  specialist: {
    name: 'specialist',
    description: 'Route to domain-specific specialists based on query analysis',
  },
}

const DEFAULT_CONFIG: RouterConfig = {
  defaultStrategy: 'parallel',
  minExpertsForConsensus: 2,
  maxExpertsPerQuery: 4,
  confidenceThreshold: 0.7,
  enableCascade: true,
  cascadeConfidenceBoost: 0.1,
}

export class ExpertRouter extends EventEmitter {
  private classifier: PromptClassifier
  private expertStore: ExpertStore
  private parallelExecutor: ParallelExecutor
  private comparator: ResultComparator
  private config: RouterConfig

  constructor(
    classifier: PromptClassifier,
    parallelExecutor: ParallelExecutor,
    config?: Partial<RouterConfig>,
    expertStore?: ExpertStore
  ) {
    super()
    this.classifier = classifier
    this.parallelExecutor = parallelExecutor
    this.expertStore = expertStore ?? defaultExpertStore
    this.comparator = new ResultComparator()
    this.config = { ...DEFAULT_CONFIG, ...config }

    this.parallelExecutor.on('expert:started', (data) => this.emit('expert:started', data))
    this.parallelExecutor.on('expert:completed', (data) => this.emit('expert:completed', data))
  }

  async route(
    prompt: string,
    sessionId: string,
    options?: {
      strategy?: RoutingStrategy['name']
      forceExperts?: string[]
      workDir?: string
    }
  ): Promise<MultiExpertResult> {
    const startTime = Date.now()

    log.info('Starting multi-expert routing', {
      sessionId,
      strategy: options?.strategy ?? this.config.defaultStrategy,
      forceExperts: options?.forceExperts,
    })

    const classification = this.classifier.classify(prompt)
    const availableExperts = await this.expertStore.list()
    const routingDecision = await this.makeRoutingDecision(
      classification,
      availableExperts,
      options?.strategy,
      options?.forceExperts
    )

    this.emit('routing:decided', { routingDecision, classification })

    log.debug('Routing decision made', {
      strategy: routingDecision.strategy.name,
      experts: routingDecision.selectedExperts,
      reasoning: routingDecision.reasoning,
    })

    let execution: ParallelExecutionResult
    let comparison: DetailedComparison | undefined

    switch (routingDecision.strategy.name) {
      case 'single':
        execution = await this.executeSingle(prompt, routingDecision, sessionId, options?.workDir)
        break

      case 'cascade':
        execution = await this.executeCascade(prompt, routingDecision, sessionId, options?.workDir)
        break

      case 'consensus':
        execution = await this.executeConsensus(prompt, routingDecision, sessionId, options?.workDir)
        comparison = this.comparator.compare(execution.results)
        break

      case 'specialist':
      case 'parallel':
      default:
        execution = await this.executeParallel(prompt, routingDecision, sessionId, options?.workDir)
        if (execution.results.length > 1) {
          comparison = this.comparator.compare(execution.results)
        }
        break
    }

    const validation = this.comparator.validate(execution.results)
    const finalOutput = this.generateFinalOutput(execution, comparison, validation)

    const result: MultiExpertResult = {
      routingDecision,
      execution,
      comparison,
      validation,
      finalOutput,
      metadata: {
        totalExperts: execution.results.length,
        successfulExperts: execution.successCount,
        totalDurationMs: Date.now() - startTime,
        strategyUsed: routingDecision.strategy.name,
      },
    }

    this.emit('routing:completed', result)

    log.info('Multi-expert routing completed', {
      sessionId,
      totalDurationMs: result.metadata.totalDurationMs,
      expertsUsed: result.metadata.totalExperts,
      successfulExperts: result.metadata.successfulExperts,
      validationScore: validation.score,
    })

    return result
  }

  private async makeRoutingDecision(
    classification: ClassificationResult,
    availableExperts: ExpertSummary[],
    forcedStrategy?: RoutingStrategy['name'],
    forcedExperts?: string[]
  ): Promise<RoutingDecision> {
    const strategy = forcedStrategy
      ? ROUTING_STRATEGIES[forcedStrategy]
      : this.selectStrategy(classification, availableExperts)

    let selectedExperts: string[]

    if (forcedExperts && forcedExperts.length > 0) {
      selectedExperts = forcedExperts.filter(e =>
        availableExperts.some(ae => ae.id === e)
      )
    } else {
      selectedExperts = this.selectExperts(classification, availableExperts, strategy)
    }

    const reasoning = this.generateReasoning(classification, strategy, selectedExperts)

    return {
      strategy,
      selectedExperts,
      reasoning,
      estimatedDuration: this.estimateDuration(selectedExperts.length, strategy),
      confidenceThreshold: this.config.confidenceThreshold,
      requireConsensus: strategy.name === 'consensus',
    }
  }

  private selectStrategy(
    classification: ClassificationResult,
    availableExperts: ExpertSummary[]
  ): RoutingStrategy {
    const matchingExperts = this.findMatchingExperts(classification, availableExperts)

    if (matchingExperts.length === 0) {
      return ROUTING_STRATEGIES.single
    }

    if (classification.complexityScore > 70) {
      return ROUTING_STRATEGIES.consensus
    }

    if (classification.domains.length > 1) {
      return ROUTING_STRATEGIES.specialist
    }

    if (matchingExperts.length >= 2 && classification.complexityScore > 40) {
      return ROUTING_STRATEGIES.parallel
    }

    if (this.config.enableCascade && matchingExperts.length >= 2) {
      return ROUTING_STRATEGIES.cascade
    }

    return ROUTING_STRATEGIES.single
  }

  private selectExperts(
    classification: ClassificationResult,
    availableExperts: ExpertSummary[],
    strategy: RoutingStrategy
  ): string[] {
    const matchingExperts = this.findMatchingExperts(classification, availableExperts)

    if (matchingExperts.length === 0) {
      const highestConfidence = [...availableExperts].sort((a, b) => b.confidence - a.confidence)
      return highestConfidence.slice(0, 1).map(e => e.id)
    }

    const sortedByRelevance = this.sortByRelevance(matchingExperts, classification)

    switch (strategy.name) {
      case 'single':
        return sortedByRelevance.slice(0, 1).map(e => e.id)

      case 'consensus':
        return sortedByRelevance
          .slice(0, Math.max(this.config.minExpertsForConsensus, 2))
          .map(e => e.id)

      case 'cascade':
      case 'parallel':
      case 'specialist':
      default:
        return sortedByRelevance
          .slice(0, this.config.maxExpertsPerQuery)
          .map(e => e.id)
    }
  }

  private findMatchingExperts(
    classification: ClassificationResult,
    availableExperts: ExpertSummary[]
  ): ExpertSummary[] {
    return availableExperts.filter(expert => {
      const domainMatch = classification.domains.some(domain =>
        expert.domain.toLowerCase().includes(domain.toLowerCase()) ||
        domain.toLowerCase().includes(expert.domain.toLowerCase())
      )

      const suggestedMatch = classification.suggestedExperts.includes(expert.id)

      return domainMatch || suggestedMatch
    })
  }

  private sortByRelevance(
    experts: ExpertSummary[],
    classification: ClassificationResult
  ): ExpertSummary[] {
    return [...experts].sort((a, b) => {
      const aIsSuggested = classification.suggestedExperts.includes(a.id) ? 1 : 0
      const bIsSuggested = classification.suggestedExperts.includes(b.id) ? 1 : 0

      if (aIsSuggested !== bIsSuggested) {
        return bIsSuggested - aIsSuggested
      }

      return b.confidence - a.confidence
    })
  }

  private generateReasoning(
    classification: ClassificationResult,
    strategy: RoutingStrategy,
    selectedExperts: string[]
  ): string {
    const parts: string[] = []

    parts.push(`Complexity score: ${classification.complexityScore}/100`)
    parts.push(`Detected domains: ${classification.domains.join(', ') || 'general'}`)
    parts.push(`Strategy: ${strategy.description}`)
    parts.push(`Selected ${selectedExperts.length} expert(s): ${selectedExperts.join(', ')}`)

    return parts.join('. ')
  }

  private estimateDuration(expertCount: number, strategy: RoutingStrategy): number {
    const baseTime = 30000

    switch (strategy.name) {
      case 'single':
        return baseTime
      case 'cascade':
        return baseTime * expertCount
      case 'parallel':
      case 'consensus':
      case 'specialist':
        return baseTime * 1.5
      default:
        return baseTime
    }
  }

  private async executeSingle(
    prompt: string,
    decision: RoutingDecision,
    sessionId: string,
    workDir?: string
  ): Promise<ParallelExecutionResult> {
    const tasks: ExpertTask[] = [{
      expertId: decision.selectedExperts[0],
      prompt,
      required: true,
    }]

    return this.parallelExecutor.executeParallel(tasks, sessionId, workDir)
  }

  private async executeParallel(
    prompt: string,
    decision: RoutingDecision,
    sessionId: string,
    workDir?: string
  ): Promise<ParallelExecutionResult> {
    const tasks: ExpertTask[] = decision.selectedExperts.map(expertId => ({
      expertId,
      prompt,
      required: false,
    }))

    return this.parallelExecutor.executeParallel(tasks, sessionId, workDir)
  }

  private async executeCascade(
    prompt: string,
    decision: RoutingDecision,
    sessionId: string,
    workDir?: string
  ): Promise<ParallelExecutionResult> {
    const allResults: ParallelExecutionResult['results'] = []
    const startedAt = new Date()

    for (const expertId of decision.selectedExperts) {
      log.debug('Cascade: executing expert', { expertId })

      const tasks: ExpertTask[] = [{ expertId, prompt, required: true }]
      const result = await this.parallelExecutor.executeParallel(tasks, sessionId, workDir)

      allResults.push(...result.results)

      const lastResult = result.results[0]
      if (lastResult?.success && lastResult.confidence >= decision.confidenceThreshold) {
        log.debug('Cascade: confidence threshold met, stopping', {
          expertId,
          confidence: lastResult.confidence,
        })
        break
      }

      log.debug('Cascade: continuing to next expert', {
        expertId,
        confidence: lastResult?.confidence,
        threshold: decision.confidenceThreshold,
      })
    }

    const completedAt = new Date()

    return {
      executionId: `cascade-${Date.now()}`,
      results: allResults,
      startedAt,
      completedAt,
      totalDurationMs: completedAt.getTime() - startedAt.getTime(),
      successCount: allResults.filter(r => r.success).length,
      failureCount: allResults.filter(r => !r.success).length,
    }
  }

  private async executeConsensus(
    prompt: string,
    decision: RoutingDecision,
    sessionId: string,
    workDir?: string
  ): Promise<ParallelExecutionResult> {
    const tasks: ExpertTask[] = decision.selectedExperts.map(expertId => ({
      expertId,
      prompt,
      required: true,
    }))

    const execution = await this.parallelExecutor.executeParallel(tasks, sessionId, workDir)

    const consensus = this.comparator.buildConsensus(execution.results)
    execution.consensus = consensus

    return execution
  }

  private generateFinalOutput(
    execution: ParallelExecutionResult,
    comparison?: DetailedComparison,
    validation?: ValidationResult
  ): string {
    if (execution.results.length === 1 && execution.results[0].success) {
      return execution.results[0].output
    }

    const successfulResults = execution.results.filter(r => r.success)

    if (successfulResults.length === 0) {
      return '## Error\n\nAll experts failed to provide results. Please try again or check expert configurations.'
    }

    if (comparison) {
      return this.comparator.merge(successfulResults)
    }

    let output = `# Expert Analysis\n\n`
    output += `**Experts consulted**: ${successfulResults.length}\n`
    output += `**Validation score**: ${((validation?.score ?? 0) * 100).toFixed(1)}%\n\n`

    for (const result of successfulResults) {
      output += `## ${result.expertId}\n`
      output += `${result.output}\n\n`
    }

    if (validation?.issues && validation.issues.length > 0) {
      output += `## ⚠️ Validation Notes\n\n`
      for (const issue of validation.issues) {
        output += `- **${issue.type}**: ${issue.message}\n`
      }
    }

    return output
  }

  async getAvailableStrategies(): Promise<RoutingStrategy[]> {
    return Object.values(ROUTING_STRATEGIES)
  }

  async suggestStrategy(prompt: string): Promise<{
    suggested: RoutingStrategy
    reasoning: string
    alternatives: RoutingStrategy[]
  }> {
    const classification = this.classifier.classify(prompt)
    const availableExperts = await this.expertStore.list()
    const suggested = this.selectStrategy(classification, availableExperts)

    const alternatives = Object.values(ROUTING_STRATEGIES).filter(
      s => s.name !== suggested.name
    )

    return {
      suggested,
      reasoning: this.generateReasoning(classification, suggested, []),
      alternatives,
    }
  }
}

export const createExpertRouter = (
  classifier: PromptClassifier,
  parallelExecutor: ParallelExecutor,
  config?: Partial<RouterConfig>
): ExpertRouter => {
  return new ExpertRouter(classifier, parallelExecutor, config)
}
