/**
 * Auto-Continuation Service - P0.2
 *
 * Detects truncated responses and automatically continues until completion.
 * Based on the Ralph Loop pattern from oh-my-opencode.
 *
 * Features:
 * - Truncation detection (incomplete sentences, pending tool calls)
 * - Completion marker detection
 * - Max iteration limit
 * - Configurable prompts
 */

import { EventEmitter } from 'events'
import { logger } from '../logger'

const log = logger.child('auto-continuation')

export interface ContinuationConfig {
  enabled: boolean
  maxIterations: number
  completionMarkers: string[]
  truncationIndicators: string[]
  continuePrompt: string
  cooldownMs: number
}

export interface ContinuationState {
  isActive: boolean
  currentIteration: number
  maxIterations: number
  startedAt: Date | null
  lastResponse: string
  sessionId: string | null
}

export interface ContinuationEvents {
  'continuation:started': (state: ContinuationState) => void
  'continuation:iteration': (state: ContinuationState) => void
  'continuation:completed': (state: ContinuationState, reason: string) => void
  'continuation:cancelled': (state: ContinuationState) => void
}

const DEFAULT_CONFIG: ContinuationConfig = {
  enabled: true,
  maxIterations: 5,
  completionMarkers: [
    '<promise>DONE</promise>',
    '[DONE]',
    '[COMPLETED]',
    '</complete>',
    '✅ Done',
    '✅ Completed',
  ],
  truncationIndicators: [
    '...',
    '[TRUNCATED]',
    '[CONTINUE]',
    '[TO BE CONTINUED]',
    '(continued)',
  ],
  continuePrompt: 'Continue from where you left off. Complete the remaining work.',
  cooldownMs: 1000,
}

const SENTENCE_ENDINGS = ['.', '!', '?', '```', '>', ')']
const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g

export class AutoContinuation extends EventEmitter {
  private config: ContinuationConfig
  private state: ContinuationState
  private lastContinueTime = 0

  constructor(config: Partial<ContinuationConfig> = {}) {
    super()
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.state = this.createInitialState()
  }

  private createInitialState(): ContinuationState {
    return {
      isActive: false,
      currentIteration: 0,
      maxIterations: this.config.maxIterations,
      startedAt: null,
      lastResponse: '',
      sessionId: null,
    }
  }

  start(sessionId: string): void {
    if (this.state.isActive) {
      log.warn('Continuation already active', { sessionId })
      return
    }

    this.state = {
      isActive: true,
      currentIteration: 0,
      maxIterations: this.config.maxIterations,
      startedAt: new Date(),
      lastResponse: '',
      sessionId,
    }

    log.info('Continuation started', { sessionId, maxIterations: this.config.maxIterations })
    this.emit('continuation:started', this.state)
  }

  stop(reason: string = 'manual'): void {
    if (!this.state.isActive) return

    this.state.isActive = false
    log.info('Continuation stopped', { reason, iterations: this.state.currentIteration })
    this.emit('continuation:completed', this.state, reason)
  }

  cancel(): void {
    if (!this.state.isActive) return

    this.state.isActive = false
    log.info('Continuation cancelled', { iterations: this.state.currentIteration })
    this.emit('continuation:cancelled', this.state)
  }

  reset(): void {
    this.state = this.createInitialState()
    this.lastContinueTime = 0
  }

  detectTruncation(response: string): boolean {
    if (!response || response.trim().length === 0) {
      return false
    }

    const trimmed = response.trim()

    // Check for explicit truncation indicators
    for (const indicator of this.config.truncationIndicators) {
      if (trimmed.endsWith(indicator)) {
        log.debug('Truncation detected: explicit indicator', { indicator })
        return true
      }
    }

    // Remove code blocks for sentence analysis
    const withoutCode = trimmed.replace(CODE_BLOCK_PATTERN, '')
    const lastLine = withoutCode.split('\n').filter(l => l.trim()).pop() || ''

    // Check if last line ends with proper sentence ending
    const hasProperEnding = SENTENCE_ENDINGS.some(ending =>
      lastLine.trimEnd().endsWith(ending)
    )

    if (!hasProperEnding && lastLine.length > 20) {
      // Long line without proper ending suggests truncation
      log.debug('Truncation detected: incomplete sentence', { lastLine: lastLine.slice(-50) })
      return true
    }

    // Check for incomplete markdown lists
    const lines = trimmed.split('\n')
    const lastNonEmptyLine = lines.filter(l => l.trim()).pop() || ''
    if (/^[-*\d+\.]\s*$/.test(lastNonEmptyLine)) {
      log.debug('Truncation detected: incomplete list item')
      return true
    }

    // Check for unclosed code blocks
    const codeBlockStarts = (trimmed.match(/```/g) || []).length
    if (codeBlockStarts % 2 !== 0) {
      log.debug('Truncation detected: unclosed code block')
      return true
    }

    return false
  }

  hasCompletionMarker(response: string): boolean {
    const normalized = response.toLowerCase()

    for (const marker of this.config.completionMarkers) {
      if (normalized.includes(marker.toLowerCase())) {
        log.debug('Completion marker found', { marker })
        return true
      }
    }

    return false
  }

  shouldContinue(response: string): { should: boolean; reason: string } {
    if (!this.config.enabled) {
      return { should: false, reason: 'disabled' }
    }

    if (!this.state.isActive) {
      return { should: false, reason: 'not_active' }
    }

    // Check cooldown
    const now = Date.now()
    if (now - this.lastContinueTime < this.config.cooldownMs) {
      return { should: false, reason: 'cooldown' }
    }

    // Check max iterations
    if (this.state.currentIteration >= this.config.maxIterations) {
      this.stop('max_iterations')
      return { should: false, reason: 'max_iterations' }
    }

    // Check for completion marker
    if (this.hasCompletionMarker(response)) {
      this.stop('completed')
      return { should: false, reason: 'completed' }
    }

    // Check for truncation
    if (this.detectTruncation(response)) {
      return { should: true, reason: 'truncation_detected' }
    }

    return { should: false, reason: 'no_truncation' }
  }

  getContinuePrompt(lastResponse: string): string {
    const lastLines = lastResponse.split('\n').slice(-3).join('\n')

    let prompt = this.config.continuePrompt

    // Add context about where we left off
    if (lastLines.trim()) {
      prompt += `\n\nYour previous response ended with:\n\`\`\`\n${lastLines.slice(-200)}\n\`\`\``
    }

    // Add iteration info
    prompt += `\n\n(Continuation ${this.state.currentIteration + 1}/${this.config.maxIterations})`

    return prompt
  }

  recordIteration(response: string): void {
    this.state.currentIteration++
    this.state.lastResponse = response
    this.lastContinueTime = Date.now()

    log.debug('Iteration recorded', {
      iteration: this.state.currentIteration,
      maxIterations: this.config.maxIterations,
    })

    this.emit('continuation:iteration', this.state)
  }

  getState(): ContinuationState {
    return { ...this.state }
  }

  setConfig(config: Partial<ContinuationConfig>): void {
    this.config = { ...this.config, ...config }
    this.state.maxIterations = this.config.maxIterations
  }

  isActive(): boolean {
    return this.state.isActive
  }
}

// Singleton instance
export const autoContinuation = new AutoContinuation()

// Helper functions
export function detectTruncation(response: string): boolean {
  return autoContinuation.detectTruncation(response)
}

export function shouldContinue(response: string): { should: boolean; reason: string } {
  return autoContinuation.shouldContinue(response)
}

export function getContinuePrompt(lastResponse: string): string {
  return autoContinuation.getContinuePrompt(lastResponse)
}

export function startContinuation(sessionId: string): void {
  autoContinuation.start(sessionId)
}

export function stopContinuation(reason?: string): void {
  autoContinuation.stop(reason)
}

export function cancelContinuation(): void {
  autoContinuation.cancel()
}

export function getContinuationState(): ContinuationState {
  return autoContinuation.getState()
}
