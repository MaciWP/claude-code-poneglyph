import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type { ExecutionTrace, TraceEvent } from '@shared/types'
import { logger } from '../logger'
import { traceCollector } from './trace-collector'

const log = logger.child('trace-store')

interface TraceStats {
  totalTraces: number
  totalTokens: number
  totalCost: number
  avgDuration: number
  tracesByDay: Record<string, number>
}

export class TraceStore {
  private basePath: string

  constructor(basePath?: string) {
    this.basePath = basePath || join(process.cwd(), '.claude', 'traces')

    traceCollector.on('trace:complete', (event: TraceEvent) => {
      this.save(event.trace)
    })
  }

  async save(trace: ExecutionTrace): Promise<void> {
    try {
      await mkdir(this.basePath, { recursive: true })

      const date = trace.timestamp.split('T')[0]
      const filePath = join(this.basePath, `${date}.json`)

      let traces: ExecutionTrace[] = []
      try {
        const content = await readFile(filePath, 'utf-8')
        traces = JSON.parse(content)
      } catch {
        // File doesn't exist yet
      }

      traces.push(trace)
      await writeFile(filePath, JSON.stringify(traces, null, 2))

      log.debug('Trace saved', {
        id: trace.id,
        sessionId: trace.sessionId,
        durationMs: trace.durationMs,
      })
    } catch (error) {
      log.error('Failed to save trace', { error: String(error) })
    }
  }

  async getByDate(date: string): Promise<ExecutionTrace[]> {
    const filePath = join(this.basePath, `${date}.json`)
    try {
      const content = await readFile(filePath, 'utf-8')
      return JSON.parse(content)
    } catch {
      return []
    }
  }

  async getBySession(sessionId: string): Promise<ExecutionTrace[]> {
    const allTraces = await this.getAllTraces()
    return allTraces.filter((t) => t.sessionId === sessionId)
  }

  async getRecent(limit = 50): Promise<ExecutionTrace[]> {
    const allTraces = await this.getAllTraces()
    allTraces.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    return allTraces.slice(0, limit)
  }

  async getDateRange(from: string, to: string): Promise<ExecutionTrace[]> {
    const dates = this.generateDateRange(from, to)
    const results = await Promise.all(dates.map((date) => this.getByDate(date)))
    const allTraces = results.flat()

    allTraces.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return allTraces
  }

  async getStats(): Promise<TraceStats> {
    const allTraces = await this.getAllTraces()

    const totalTokens = allTraces.reduce((sum, t) => sum + t.totalTokens, 0)
    const totalCost = allTraces.reduce((sum, t) => sum + t.totalCostUsd, 0)
    const avgDuration =
      allTraces.length > 0
        ? allTraces.reduce((sum, t) => sum + t.durationMs, 0) / allTraces.length
        : 0

    const tracesByDay: Record<string, number> = {}
    for (const trace of allTraces) {
      const day = trace.timestamp.split('T')[0]
      tracesByDay[day] = (tracesByDay[day] || 0) + 1
    }

    return {
      totalTraces: allTraces.length,
      totalTokens,
      totalCost,
      avgDuration,
      tracesByDay,
    }
  }

  private async getAllTraces(): Promise<ExecutionTrace[]> {
    const dates = this.getRecentDates(30)
    const results = await Promise.all(dates.map((date) => this.getByDate(date)))
    return results.flat()
  }

  private getRecentDates(days: number): string[] {
    const dates: string[] = []
    const now = new Date()

    for (let i = 0; i < days; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      dates.push(date.toISOString().split('T')[0])
    }

    return dates
  }

  private generateDateRange(from: string, to: string): string[] {
    const dates: string[] = []
    const current = new Date(from)
    const end = new Date(to)

    while (current <= end) {
      dates.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    }

    return dates
  }
}

export const traceStore = new TraceStore()
