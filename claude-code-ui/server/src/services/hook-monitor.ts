import type { HookStats } from '@shared/types'
import { logger } from '../logger'

const log = logger.child('hook-monitor')

interface HookAccumulator {
  stats: HookStats
  totalDurationMs: number
  successCount: number
}

export class HookMonitor {
  private hooks = new Map<string, HookAccumulator>()

  recordHookExecution(
    hookName: string,
    type: string,
    durationMs: number,
    success: boolean,
    error?: string
  ): void {
    let accumulator = this.hooks.get(hookName)

    if (!accumulator) {
      accumulator = {
        stats: {
          name: hookName,
          type,
          executions: 0,
          avgDurationMs: 0,
          successRate: 1,
          lastExecutedAt: new Date().toISOString(),
        },
        totalDurationMs: 0,
        successCount: 0,
      }
      this.hooks.set(hookName, accumulator)
    }

    accumulator.stats.executions++
    accumulator.totalDurationMs += durationMs
    accumulator.stats.avgDurationMs = accumulator.totalDurationMs / accumulator.stats.executions

    if (success) {
      accumulator.successCount++
    } else if (error) {
      accumulator.stats.lastError = error
    }

    accumulator.stats.successRate = accumulator.successCount / accumulator.stats.executions
    accumulator.stats.lastExecutedAt = new Date().toISOString()

    log.debug('Hook execution recorded', {
      hookName,
      type,
      durationMs,
      success,
      totalExecutions: accumulator.stats.executions,
    })
  }

  getHookStats(hookName?: string): HookStats | HookStats[] {
    if (hookName) {
      const accumulator = this.hooks.get(hookName)
      if (!accumulator) {
        return {
          name: hookName,
          type: 'unknown',
          executions: 0,
          avgDurationMs: 0,
          successRate: 0,
          lastExecutedAt: '',
        }
      }
      return { ...accumulator.stats }
    }

    return Array.from(this.hooks.values()).map((a) => ({ ...a.stats }))
  }

  getAllStats(): HookStats[] {
    return Array.from(this.hooks.values()).map((a) => ({ ...a.stats }))
  }
}

export const hookMonitor = new HookMonitor()
