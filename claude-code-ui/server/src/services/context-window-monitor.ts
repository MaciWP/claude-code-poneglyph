/**
 * Context Window Monitor - OPT.1
 *
 * Preemptive context compaction with threshold-based notifications.
 * Monitors context usage and triggers compaction before hitting limits.
 *
 * Based on: oh-my-opencode/src/hooks/preemptive-compaction/index.ts
 */

import { EventEmitter } from 'events'
import { logger } from '../logger'
import type { ContextWindowState, ContextWindowStatus, ContextWindowThresholds } from '../../../shared/types'

const log = logger.child('context-window-monitor')

const ANTHROPIC_ACTUAL_LIMIT = 200_000
const CHARS_PER_TOKEN = 4

const DEFAULT_THRESHOLDS: ContextWindowThresholds = {
  warning: 0.70,
  critical: 0.85,
  emergency: 0.95,
}

const COMPACTION_COOLDOWN_MS = 60_000
const MIN_TOKENS_FOR_COMPACTION = 50_000

export interface ContextWindowEvents {
  'status:changed': (state: ContextWindowState) => void
  'threshold:warning': (state: ContextWindowState) => void
  'threshold:critical': (state: ContextWindowState) => void
  'threshold:emergency': (state: ContextWindowState) => void
  'compaction:started': () => void
  'compaction:completed': (tokensSaved: number) => void
  'compaction:failed': (error: string) => void
}

export class ContextWindowMonitor extends EventEmitter {
  private maxTokens: number
  private thresholds: ContextWindowThresholds
  private currentState: ContextWindowState
  private lastCompactionTime = 0
  private isCompacting = false

  constructor(options: {
    maxTokens?: number
    thresholds?: Partial<ContextWindowThresholds>
  } = {}) {
    super()
    this.maxTokens = options.maxTokens ?? ANTHROPIC_ACTUAL_LIMIT
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...options.thresholds }

    this.currentState = {
      usedTokens: 0,
      maxTokens: this.maxTokens,
      percentage: 0,
      status: 'safe',
      breakdown: {
        system: 0,
        history: 0,
        tools: 0,
        current: 0,
      },
    }

    log.info('Context window monitor initialized', {
      maxTokens: this.maxTokens,
      thresholds: this.thresholds,
    })
  }

  private calculateStatus(percentage: number): ContextWindowStatus {
    if (this.isCompacting) return 'compacting'
    if (percentage >= this.thresholds.emergency) return 'critical'
    if (percentage >= this.thresholds.critical) return 'critical'
    if (percentage >= this.thresholds.warning) return 'warning'
    return 'safe'
  }

  update(breakdown: {
    system?: number
    history?: number
    tools?: number
    current?: number
  }): ContextWindowState {
    const newBreakdown = {
      system: breakdown.system ?? this.currentState.breakdown.system,
      history: breakdown.history ?? this.currentState.breakdown.history,
      tools: breakdown.tools ?? this.currentState.breakdown.tools,
      current: breakdown.current ?? this.currentState.breakdown.current,
    }

    const usedTokens =
      newBreakdown.system +
      newBreakdown.history +
      newBreakdown.tools +
      newBreakdown.current

    const percentage = usedTokens / this.maxTokens
    const newStatus = this.calculateStatus(percentage)
    const previousStatus = this.currentState.status

    this.currentState = {
      usedTokens,
      maxTokens: this.maxTokens,
      percentage,
      status: newStatus,
      breakdown: newBreakdown,
    }

    if (newStatus !== previousStatus) {
      this.emit('status:changed', this.currentState)
      log.info('Context window status changed', {
        from: previousStatus,
        to: newStatus,
        percentage: `${(percentage * 100).toFixed(1)}%`,
      })

      this.checkThresholds(percentage, previousStatus, newStatus)
    }

    return this.currentState
  }

  private checkThresholds(
    percentage: number,
    previousStatus: ContextWindowStatus,
    newStatus: ContextWindowStatus
  ): void {
    if (previousStatus === 'safe' && newStatus === 'warning') {
      this.emit('threshold:warning', this.currentState)
      log.warn('Context window warning threshold reached', {
        percentage: `${(percentage * 100).toFixed(1)}%`,
      })
    }

    if (
      (previousStatus === 'safe' || previousStatus === 'warning') &&
      newStatus === 'critical'
    ) {
      this.emit('threshold:critical', this.currentState)
      log.warn('Context window critical threshold reached', {
        percentage: `${(percentage * 100).toFixed(1)}%`,
      })

      this.maybeAutoCompact()
    }

    if (percentage >= this.thresholds.emergency) {
      this.emit('threshold:emergency', this.currentState)
      log.error('Context window emergency threshold reached', {
        percentage: `${(percentage * 100).toFixed(1)}%`,
      })
    }
  }

  private maybeAutoCompact(): void {
    const now = Date.now()
    const timeSinceLastCompaction = now - this.lastCompactionTime

    if (timeSinceLastCompaction < COMPACTION_COOLDOWN_MS) {
      log.debug('Compaction skipped - cooldown active', {
        cooldownRemaining: COMPACTION_COOLDOWN_MS - timeSinceLastCompaction,
      })
      return
    }

    if (this.currentState.usedTokens < MIN_TOKENS_FOR_COMPACTION) {
      log.debug('Compaction skipped - not enough tokens', {
        usedTokens: this.currentState.usedTokens,
        minRequired: MIN_TOKENS_FOR_COMPACTION,
      })
      return
    }

    this.triggerCompaction()
  }

  async triggerCompaction(): Promise<number> {
    if (this.isCompacting) {
      log.debug('Compaction already in progress')
      return 0
    }

    this.isCompacting = true
    this.lastCompactionTime = Date.now()
    this.emit('compaction:started')

    log.info('Starting context compaction', {
      currentTokens: this.currentState.usedTokens,
      percentage: `${(this.currentState.percentage * 100).toFixed(1)}%`,
    })

    // Compaction will be performed by the caller (e.g., history-manager)
    // This just coordinates and emits events
    // The caller should call reportCompactionResult() when done
    return 0
  }

  reportCompactionResult(tokensSaved: number): void {
    this.isCompacting = false
    this.emit('compaction:completed', tokensSaved)
    log.info('Compaction completed', {
      tokensSaved,
      newTotal: this.currentState.usedTokens - tokensSaved,
    })
  }

  getState(): ContextWindowState {
    return { ...this.currentState }
  }

  getRemainingTokens(): number {
    return this.maxTokens - this.currentState.usedTokens
  }

  getRemainingPercentage(): number {
    return 1 - this.currentState.percentage
  }

  isAtRisk(): boolean {
    return this.currentState.status === 'warning' || this.currentState.status === 'critical'
  }

  needsCompaction(): boolean {
    return (
      this.currentState.percentage >= this.thresholds.critical &&
      !this.isCompacting &&
      this.currentState.usedTokens >= MIN_TOKENS_FOR_COMPACTION
    )
  }

  setThresholds(thresholds: Partial<ContextWindowThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds }
    log.info('Thresholds updated', { thresholds: this.thresholds })
  }

  reset(): void {
    this.currentState = {
      usedTokens: 0,
      maxTokens: this.maxTokens,
      percentage: 0,
      status: 'safe',
      breakdown: {
        system: 0,
        history: 0,
        tools: 0,
        current: 0,
      },
    }
    this.isCompacting = false
    this.emit('status:changed', this.currentState)
    log.debug('Context window monitor reset')
  }

  static estimateTokens(text: string): number {
    return Math.ceil(text.length / CHARS_PER_TOKEN)
  }

  static estimateTokensForMessages(
    messages: Array<{ content: string }>
  ): number {
    return messages.reduce(
      (total, msg) => total + ContextWindowMonitor.estimateTokens(msg.content),
      0
    )
  }
}

export const contextWindowMonitor = new ContextWindowMonitor()

export function updateContextWindow(breakdown: {
  system?: number
  history?: number
  tools?: number
  current?: number
}): ContextWindowState {
  return contextWindowMonitor.update(breakdown)
}

export function getContextWindowState(): ContextWindowState {
  return contextWindowMonitor.getState()
}

export function getRemainingContextTokens(): number {
  return contextWindowMonitor.getRemainingTokens()
}

export function needsCompaction(): boolean {
  return contextWindowMonitor.needsCompaction()
}
