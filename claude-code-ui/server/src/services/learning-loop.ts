import { EventEmitter } from 'events'
import { expertStore as defaultExpertStore, type ExpertStore, type Expertise, type ExpertisePattern, type ExpertiseChangelog } from './expert-store'
import { memoryStore } from './memory/store'
import { memoryGraph } from './memory/graph'
import { logger } from '../logger'

const log = logger.child('learning-loop')

export interface LearningConfig {
  minToolCallsForLearning: number
  minDurationMsForLearning: number
  maxPatternsPerExpert: number
  confidenceDeltaOnSuccess: number
  confidenceDeltaOnFailure: number
  autoLearnEnabled: boolean
}

const DEFAULT_CONFIG: LearningConfig = {
  minToolCallsForLearning: 3,
  minDurationMsForLearning: 5000,
  maxPatternsPerExpert: 20,
  confidenceDeltaOnSuccess: 0.02,
  confidenceDeltaOnFailure: -0.05,
  autoLearnEnabled: true
}

export interface ExecutionTrace {
  agentId: string
  agentType: string
  expertId?: string
  sessionId: string
  prompt: string
  output: string
  success: boolean
  toolCalls: number
  durationMs: number
  filesModified?: string[]
  patternsUsed?: string[]
}

export interface LearningResult {
  expertId: string
  learned: boolean
  changes: LearningChange[]
  newConfidence: number
  memoryId?: string
}

export interface LearningChange {
  type: 'pattern' | 'issue' | 'file' | 'confidence'
  description: string
  data?: PatternCandidate | IssueCandidate | { path: string } | undefined
}

interface PatternCandidate {
  name: string
  usage: string
  confidence: number
  example?: string
}

interface IssueCandidate {
  symptom: string
  solution: string
  verified: boolean
}

export class LearningLoop extends EventEmitter {
  private config: LearningConfig
  private expertStore: ExpertStore
  private learningHistory: Map<string, ExecutionTrace[]> = new Map()

  constructor(
    config?: Partial<LearningConfig>,
    expertStore?: ExpertStore
  ) {
    super()
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.expertStore = expertStore ?? defaultExpertStore
  }

  async processExecution(trace: ExecutionTrace): Promise<LearningResult | null> {
    if (!this.config.autoLearnEnabled) {
      return null
    }

    if (!trace.expertId) {
      log.debug('No expertId in trace, skipping learning', { agentId: trace.agentId })
      return null
    }

    if (!this.shouldTriggerLearning(trace)) {
      log.debug('Trace does not meet learning criteria', {
        agentId: trace.agentId,
        toolCalls: trace.toolCalls,
        durationMs: trace.durationMs
      })
      return null
    }

    log.info('Processing execution for learning', {
      agentId: trace.agentId,
      expertId: trace.expertId,
      success: trace.success
    })

    this.emit('learning:started', { expertId: trace.expertId, agentId: trace.agentId })

    try {
      const expertExists = await this.expertStore.exists(trace.expertId)
      if (!expertExists) {
        log.warn('Expert not found, skipping learning', { expertId: trace.expertId })
        return null
      }

      this.addToHistory(trace)

      const changes: LearningChange[] = []
      const expertise = await this.expertStore.load(trace.expertId)

      if (trace.success) {
        const patterns = this.extractPatterns(trace, expertise)
        for (const pattern of patterns) {
          const added = await this.addPattern(trace.expertId, pattern, expertise)
          if (added) {
            changes.push({
              type: 'pattern',
              description: `Added pattern: ${pattern.name}`,
              data: pattern
            })
          }
        }

        const files = this.extractNewFiles(trace, expertise)
        for (const file of files) {
          changes.push({
            type: 'file',
            description: `Discovered file: ${file}`,
            data: { path: file }
          })
        }
      } else {
        const issue = this.extractIssue(trace)
        if (issue) {
          await this.addIssue(trace.expertId, issue)
          changes.push({
            type: 'issue',
            description: `Recorded issue: ${issue.symptom}`,
            data: issue
          })
        }
      }

      const confidenceDelta = trace.success
        ? this.config.confidenceDeltaOnSuccess
        : this.config.confidenceDeltaOnFailure

      await this.updateConfidence(trace.expertId, confidenceDelta, trace)
      changes.push({
        type: 'confidence',
        description: `Confidence ${confidenceDelta >= 0 ? 'increased' : 'decreased'} by ${Math.abs(confidenceDelta).toFixed(2)}`
      })

      const memoryId = await this.persistToMemory(trace, changes)

      const updatedExpertise = await this.expertStore.load(trace.expertId)

      const result: LearningResult = {
        expertId: trace.expertId,
        learned: changes.length > 0,
        changes,
        newConfidence: updatedExpertise.confidence,
        memoryId
      }

      this.emit('learning:completed', result)

      log.info('Learning completed', {
        expertId: trace.expertId,
        changesCount: changes.length,
        newConfidence: result.newConfidence
      })

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      log.error('Learning failed', { expertId: trace.expertId, error: errorMessage })
      this.emit('learning:failed', { expertId: trace.expertId, error: errorMessage })
      return null
    }
  }

  private shouldTriggerLearning(trace: ExecutionTrace): boolean {
    return (
      trace.toolCalls >= this.config.minToolCallsForLearning ||
      trace.durationMs >= this.config.minDurationMsForLearning ||
      !trace.success
    )
  }

  private addToHistory(trace: ExecutionTrace): void {
    const key = trace.expertId || 'unknown'
    const history = this.learningHistory.get(key) || []
    history.push(trace)

    if (history.length > 50) {
      history.shift()
    }

    this.learningHistory.set(key, history)
  }

  private extractPatterns(trace: ExecutionTrace, expertise: Expertise): PatternCandidate[] {
    const candidates: PatternCandidate[] = []
    const existingPatternNames = new Set(expertise.patterns?.map(p => p.name.toLowerCase()) || [])

    const patternIndicators = [
      { regex: /for await.*of/i, name: 'Async Iteration', usage: 'Streaming data processing' },
      { regex: /\.on\(['"].*['"]/i, name: 'Event Listener', usage: 'Event-driven communication' },
      { regex: /try\s*\{[\s\S]*catch/i, name: 'Error Handling', usage: 'Exception management' },
      { regex: /exponential.*backoff|backoff.*exponential/i, name: 'Exponential Backoff', usage: 'Retry logic with increasing delays' },
      { regex: /reconnect|retry/i, name: 'Reconnection Logic', usage: 'Connection recovery' },
      { regex: /emit\(['"].*['"]/i, name: 'Event Emission', usage: 'Publishing events' },
      { regex: /Promise\.all/i, name: 'Parallel Execution', usage: 'Concurrent operations' },
      { regex: /AbortController|abort/i, name: 'Abort Handling', usage: 'Cancellation support' },
    ]

    const outputLower = trace.output.toLowerCase()
    const promptLower = trace.prompt.toLowerCase()

    for (const indicator of patternIndicators) {
      if (indicator.regex.test(trace.output) || indicator.regex.test(trace.prompt)) {
        if (!existingPatternNames.has(indicator.name.toLowerCase())) {
          candidates.push({
            name: indicator.name,
            usage: indicator.usage,
            confidence: 0.75
          })
        }
      }
    }

    const filePatterns = trace.output.match(/(?:modified|created|updated|edited)\s+[`']?([^\s`']+\.[jt]sx?)[`']?/gi)
    if (filePatterns && filePatterns.length >= 2) {
      if (!existingPatternNames.has('multi-file modification')) {
        candidates.push({
          name: 'Multi-File Modification',
          usage: 'Coordinated changes across multiple files',
          confidence: 0.70
        })
      }
    }

    return candidates.slice(0, 3)
  }

  private extractNewFiles(trace: ExecutionTrace, expertise: Expertise): string[] {
    const knownFiles = new Set(expertise.mental_model.key_files.map(f => f.path))
    const newFiles: string[] = []

    const fileMatches = trace.output.match(/(?:file|path|modified|created|updated):\s*[`']?([^\s`'\n]+\.[jt]sx?)[`']?/gi) || []

    for (const match of fileMatches) {
      const filePath = match.replace(/^[^:]+:\s*[`']?/, '').replace(/[`']?$/, '')
      if (!knownFiles.has(filePath) && !newFiles.includes(filePath)) {
        newFiles.push(filePath)
      }
    }

    return newFiles.slice(0, 5)
  }

  private extractIssue(trace: ExecutionTrace): IssueCandidate | null {
    const errorIndicators = [
      /error:\s*(.+)/i,
      /failed:\s*(.+)/i,
      /exception:\s*(.+)/i,
      /cannot\s+(.+)/i,
    ]

    for (const regex of errorIndicators) {
      const match = trace.output.match(regex)
      if (match) {
        return {
          symptom: match[1].slice(0, 100),
          solution: 'Pending investigation',
          verified: false
        }
      }
    }

    if (!trace.success && trace.output.length > 0) {
      return {
        symptom: `Task failed: ${trace.prompt.slice(0, 50)}...`,
        solution: 'Pending investigation',
        verified: false
      }
    }

    return null
  }

  private async addPattern(
    expertId: string,
    pattern: PatternCandidate,
    expertise: Expertise
  ): Promise<boolean> {
    const currentPatterns = expertise.patterns || []

    if (currentPatterns.length >= this.config.maxPatternsPerExpert) {
      log.debug('Max patterns reached, skipping', { expertId, maxPatterns: this.config.maxPatternsPerExpert })
      return false
    }

    const newPattern: ExpertisePattern = {
      name: pattern.name,
      confidence: pattern.confidence,
      usage: pattern.usage,
      example: pattern.example
    }

    expertise.patterns = [...currentPatterns, newPattern]

    await this.expertStore.addChangelogEntry(expertId, {
      type: 'learned',
      source: 'learning-loop',
      change: `Added pattern: ${pattern.name}`,
      confidence_delta: 0.01
    })

    log.debug('Added pattern', { expertId, patternName: pattern.name })
    return true
  }

  private async addIssue(expertId: string, issue: IssueCandidate): Promise<void> {
    const expertise = await this.expertStore.load(expertId)
    const currentIssues = expertise.known_issues || []

    const issueId = `${expertId.toUpperCase()}-${String(currentIssues.length + 1).padStart(3, '0')}`

    expertise.known_issues = [
      ...currentIssues,
      {
        id: issueId,
        symptom: issue.symptom,
        solution: issue.solution,
        verified: issue.verified,
        date_found: new Date().toISOString().split('T')[0]
      }
    ]

    await this.expertStore.save(expertId, expertise)

    await this.expertStore.addChangelogEntry(expertId, {
      type: 'learned',
      source: 'learning-loop',
      change: `Recorded issue: ${issueId} - ${issue.symptom.slice(0, 50)}`
    })

    log.debug('Added issue', { expertId, issueId })
  }

  private async updateConfidence(
    expertId: string,
    delta: number,
    trace: ExecutionTrace
  ): Promise<void> {
    const changelogEntry: Omit<ExpertiseChangelog, 'date'> = {
      type: trace.success ? 'verified' : 'learned',
      source: 'learning-loop',
      change: trace.success
        ? `Task completed successfully: ${trace.prompt.slice(0, 50)}...`
        : `Task failed: ${trace.prompt.slice(0, 50)}...`,
      confidence_delta: delta
    }

    await this.expertStore.addChangelogEntry(expertId, changelogEntry)
  }

  private async persistToMemory(
    trace: ExecutionTrace,
    changes: LearningChange[]
  ): Promise<string | undefined> {
    if (changes.length === 0) {
      return undefined
    }

    try {
      const content = `Expert learning from ${trace.expertId}:\n` +
        changes.map(c => `- ${c.description}`).join('\n')

      const memory = await memoryStore.add(
        content,
        'procedural',
        'inferred',
        {
          tags: ['expert-learning', trace.expertId || 'unknown'],
          sessionId: trace.sessionId,
          initialConfidence: 0.8
        }
      )

      const expertMemories = await memoryStore.search(trace.expertId || '', { limit: 5 })
      for (const related of expertMemories) {
        if (related.memory.id !== memory.id) {
          await memoryGraph.addEdge(memory.id, related.memory.id, 'extends', 0.7)
        }
      }

      log.debug('Persisted to memory', { memoryId: memory.id, changesCount: changes.length })
      return memory.id
    } catch (error) {
      log.warn('Failed to persist to memory', { error: String(error) })
      return undefined
    }
  }

  getHistory(expertId: string): ExecutionTrace[] {
    return this.learningHistory.get(expertId) || []
  }

  getStats(): {
    totalExecutions: number
    executionsByExpert: Record<string, number>
    successRate: number
  } {
    let total = 0
    let successes = 0
    const byExpert: Record<string, number> = {}

    for (const [expertId, traces] of Array.from(this.learningHistory.entries())) {
      byExpert[expertId] = traces.length
      total += traces.length
      successes += traces.filter(t => t.success).length
    }

    return {
      totalExecutions: total,
      executionsByExpert: byExpert,
      successRate: total > 0 ? successes / total : 0
    }
  }

  setAutoLearnEnabled(enabled: boolean): void {
    this.config.autoLearnEnabled = enabled
    log.info('Auto-learn setting changed', { enabled })
  }

  isAutoLearnEnabled(): boolean {
    return this.config.autoLearnEnabled
  }
}

export const learningLoop = new LearningLoop()
