import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { logger } from '../logger'

const log = logger.child('metrics-store')

export interface ExecutionMetrics {
  id: string
  timestamp: string
  prompt: string
  sessionId: string
  useOrchestrator: boolean
  classification?: {
    complexityScore: number
    domains: string[]
    requiresDelegation: boolean
  }
  agentsSpawned: number
  totalToolCalls: number
  durationMs: number
  success: boolean
  partialSuccess?: boolean
  expertiseUsed: boolean
  agentMetrics?: AgentExecutionMetrics[]
}

export interface AgentExecutionMetrics {
  agentId: string
  agentType: string
  toolCalls: number
  durationMs: number
  selfImproved?: boolean
}

export interface MetricsSummary {
  avgToolCalls: number
  avgTimeMs: number
  delegationRate: number
  expertHitRate: number
  totalExecutions: number
  comparison: {
    toolCallsDelta: number
    timeDelta: number
  }
}

export class MetricsStore {
  private basePath: string

  constructor(basePath?: string) {
    this.basePath = basePath || join(process.cwd(), '.claude', 'metrics')
  }

  async record(execution: ExecutionMetrics): Promise<void> {
    try {
      await mkdir(this.basePath, { recursive: true })

      const date = new Date().toISOString().split('T')[0]
      const filePath = join(this.basePath, `${date}.json`)

      let executions: ExecutionMetrics[] = []
      try {
        const content = await readFile(filePath, 'utf-8')
        executions = JSON.parse(content)
      } catch {
        // File doesn't exist yet
      }

      executions.push(execution)
      await writeFile(filePath, JSON.stringify(executions, null, 2))

      log.debug('Recorded execution metrics', {
        id: execution.id,
        toolCalls: execution.totalToolCalls,
        durationMs: execution.durationMs
      })
    } catch (error) {
      log.error('Failed to record metrics', { error: String(error) })
    }
  }

  async getExecutions(options: {
    timeRange?: '24h' | '7d' | '30d'
    domain?: string
    limit?: number
  } = {}): Promise<ExecutionMetrics[]> {
    const { timeRange = '24h', domain, limit } = options

    const days = { '24h': 1, '7d': 7, '30d': 30 }[timeRange]
    const dates = this.getDateRange(days)

    const allExecutions: ExecutionMetrics[] = []

    for (const date of dates) {
      const filePath = join(this.basePath, `${date}.json`)
      try {
        const content = await readFile(filePath, 'utf-8')
        const executions: ExecutionMetrics[] = JSON.parse(content)
        allExecutions.push(...executions)
      } catch {
        // File doesn't exist for this date
      }
    }

    let filtered = allExecutions

    if (domain && domain !== 'all') {
      filtered = filtered.filter(e =>
        e.classification?.domains?.includes(domain)
      )
    }

    filtered.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    if (limit) {
      filtered = filtered.slice(0, limit)
    }

    return filtered
  }

  async getSummary(options: {
    timeRange?: '24h' | '7d' | '30d'
    domain?: string
  } = {}): Promise<MetricsSummary> {
    const executions = await this.getExecutions(options)

    const withOrchestrator = executions.filter(e => e.useOrchestrator)
    const baseline = executions.filter(e => !e.useOrchestrator)

    const avgToolCalls = this.average(withOrchestrator, 'totalToolCalls')
    const avgTimeMs = this.average(withOrchestrator, 'durationMs')

    const delegationRate = withOrchestrator.length > 0
      ? (withOrchestrator.filter(e => e.agentsSpawned > 0).length / withOrchestrator.length) * 100
      : 0

    const expertHitRate = withOrchestrator.length > 0
      ? (withOrchestrator.filter(e => e.expertiseUsed).length / withOrchestrator.length) * 100
      : 0

    const baselineToolCalls = this.average(baseline, 'totalToolCalls')
    const baselineTimeMs = this.average(baseline, 'durationMs')

    return {
      avgToolCalls,
      avgTimeMs,
      delegationRate,
      expertHitRate,
      totalExecutions: executions.length,
      comparison: {
        toolCallsDelta: baselineToolCalls > 0
          ? ((avgToolCalls - baselineToolCalls) / baselineToolCalls) * 100
          : 0,
        timeDelta: baselineTimeMs > 0
          ? ((avgTimeMs - baselineTimeMs) / baselineTimeMs) * 100
          : 0
      }
    }
  }

  /**
   * Get metrics within a time window (for singularity calculations)
   */
  async getMetrics(timeWindowMs: number): Promise<Array<ExecutionMetrics & {
    requiredUserIntervention?: boolean
    wasReviewed?: boolean
    passedOnFirstReview?: boolean
  }>> {
    const days = Math.ceil(timeWindowMs / (24 * 60 * 60 * 1000))
    const executions = await this.getExecutions({ timeRange: days <= 1 ? '24h' : days <= 7 ? '7d' : '30d' })
    const cutoff = Date.now() - timeWindowMs

    return executions
      .filter(e => new Date(e.timestamp).getTime() >= cutoff)
      .map(e => ({
        ...e,
        requiredUserIntervention: false,
        wasReviewed: false,
        passedOnFirstReview: false
      }))
  }

  private getDateRange(days: number): string[] {
    const dates: string[] = []
    const now = new Date()

    for (let i = 0; i < days; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      dates.push(date.toISOString().split('T')[0])
    }

    return dates
  }

  private average(arr: ExecutionMetrics[], key: keyof ExecutionMetrics): number {
    if (arr.length === 0) return 0
    const values = arr.map(item => (item[key] as number) || 0)
    return values.reduce((a, b) => a + b, 0) / arr.length
  }
}

export const metricsStore = new MetricsStore()
