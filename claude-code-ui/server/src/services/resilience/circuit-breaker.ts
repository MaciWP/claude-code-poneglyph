/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by failing fast when a service is unhealthy.
 * Based on SPEC-016: Error Recovery & Resilience
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service unhealthy, requests fail immediately
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 */

import { EventEmitter } from 'events'
import { logger } from '../../logger'
import { CircuitOpenError } from './error-classifier'

const log = logger.child('circuit-breaker')

/**
 * Circuit breaker states
 */
export type CircuitState = 'closed' | 'open' | 'half-open'

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold: number
  /** Number of successes in half-open to close circuit (default: 2) */
  successThreshold: number
  /** Time in ms to wait before transitioning from open to half-open (default: 30000) */
  timeout: number
  /** Minimum number of calls before circuit can open (default: 10) */
  volumeThreshold: number
  /** Time window for counting failures in ms (default: 60000) */
  failureWindow: number
  /** Max concurrent calls in half-open state (default: 1) */
  halfOpenMaxCalls: number
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000,
  volumeThreshold: 10,
  failureWindow: 60000,
  halfOpenMaxCalls: 1,
}

/**
 * Circuit state change event
 */
export interface CircuitStateChangeEvent {
  circuitName: string
  from: CircuitState
  to: CircuitState
  timestamp: number
  failures: number
  successes: number
}

/**
 * Circuit call result
 */
interface CallRecord {
  timestamp: number
  success: boolean
}

/**
 * Circuit breaker metrics
 */
export interface CircuitMetrics {
  name: string
  state: CircuitState
  failures: number
  successes: number
  totalCalls: number
  failureRate: number
  lastFailure: number | null
  lastSuccess: number | null
  lastStateChange: number
}

/**
 * Circuit Breaker class
 */
export class CircuitBreaker extends EventEmitter {
  public readonly name: string
  private config: CircuitBreakerConfig
  private state: CircuitState = 'closed'
  private failures = 0
  private successes = 0
  private totalCalls = 0
  private lastFailure: number | null = null
  private lastSuccess: number | null = null
  private lastStateChange: number = Date.now()
  private openedAt: number | null = null
  private callHistory: CallRecord[] = []
  private halfOpenCalls = 0

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    super()
    this.name = name
    this.config = { ...DEFAULT_CIRCUIT_CONFIG, ...config }

    log.debug('Circuit breaker created', { name, config: this.config })
  }

  /**
   * Execute an operation through the circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit allows the call
    if (!this.canExecute()) {
      log.debug('Circuit open, rejecting call', { name: this.name, state: this.state })
      throw new CircuitOpenError(this.name)
    }

    // Track half-open calls
    if (this.state === 'half-open') {
      this.halfOpenCalls++
    }

    try {
      const result = await operation()
      this.recordSuccess()
      return result
    } catch (error) {
      this.recordFailure()
      throw error
    } finally {
      if (this.state === 'half-open') {
        this.halfOpenCalls--
      }
    }
  }

  /**
   * Check if the circuit allows a call
   */
  canExecute(): boolean {
    this.checkStateTransition()

    switch (this.state) {
      case 'closed':
        return true

      case 'open':
        return false

      case 'half-open':
        // Allow limited calls in half-open state
        return this.halfOpenCalls < this.config.halfOpenMaxCalls
    }
  }

  /**
   * Record a successful call
   */
  recordSuccess(): void {
    this.successes++
    this.totalCalls++
    this.lastSuccess = Date.now()
    this.callHistory.push({ timestamp: Date.now(), success: true })
    this.pruneHistory()

    log.debug('Circuit success recorded', {
      name: this.name,
      state: this.state,
      successes: this.successes,
    })

    // In half-open state, check if we should close
    if (this.state === 'half-open' && this.successes >= this.config.successThreshold) {
      this.transitionTo('closed')
    }
  }

  /**
   * Record a failed call
   */
  recordFailure(): void {
    this.failures++
    this.totalCalls++
    this.lastFailure = Date.now()
    this.callHistory.push({ timestamp: Date.now(), success: false })
    this.pruneHistory()

    log.debug('Circuit failure recorded', {
      name: this.name,
      state: this.state,
      failures: this.failures,
    })

    // In half-open state, go back to open on any failure
    if (this.state === 'half-open') {
      this.transitionTo('open')
      return
    }

    // In closed state, check if we should open
    if (this.state === 'closed') {
      const recentFailures = this.getRecentFailures()
      if (
        this.totalCalls >= this.config.volumeThreshold &&
        recentFailures >= this.config.failureThreshold
      ) {
        this.transitionTo('open')
      }
    }
  }

  /**
   * Check for automatic state transitions (open -> half-open)
   */
  private checkStateTransition(): void {
    if (this.state === 'open' && this.openedAt) {
      const elapsed = Date.now() - this.openedAt
      if (elapsed >= this.config.timeout) {
        this.transitionTo('half-open')
      }
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    if (this.state === newState) return

    const oldState = this.state
    this.state = newState
    this.lastStateChange = Date.now()

    // Reset counters on state change
    if (newState === 'closed') {
      this.failures = 0
      this.successes = 0
      this.openedAt = null
    } else if (newState === 'open') {
      this.openedAt = Date.now()
      this.successes = 0
    } else if (newState === 'half-open') {
      this.successes = 0
      this.halfOpenCalls = 0
    }

    const event: CircuitStateChangeEvent = {
      circuitName: this.name,
      from: oldState,
      to: newState,
      timestamp: Date.now(),
      failures: this.failures,
      successes: this.successes,
    }

    log.info('Circuit state changed', event)
    this.emit('state-change', event)
  }

  /**
   * Get failures within the failure window
   */
  private getRecentFailures(): number {
    const cutoff = Date.now() - this.config.failureWindow
    return this.callHistory.filter((r) => !r.success && r.timestamp > cutoff).length
  }

  /**
   * Remove old entries from call history
   */
  private pruneHistory(): void {
    const cutoff = Date.now() - this.config.failureWindow
    this.callHistory = this.callHistory.filter((r) => r.timestamp > cutoff)
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    this.checkStateTransition()
    return this.state
  }

  /**
   * Get circuit metrics
   */
  getMetrics(): CircuitMetrics {
    this.checkStateTransition()
    const recentCalls = this.callHistory.length
    const recentFailures = this.callHistory.filter((r) => !r.success).length

    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalCalls: this.totalCalls,
      failureRate: recentCalls > 0 ? recentFailures / recentCalls : 0,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      lastStateChange: this.lastStateChange,
    }
  }

  /**
   * Force circuit to a specific state (for testing/admin)
   */
  forceState(state: CircuitState): void {
    log.warn('Circuit state forced', { name: this.name, state })
    this.transitionTo(state)
  }

  /**
   * Reset circuit to closed state
   */
  reset(): void {
    log.info('Circuit reset', { name: this.name })
    this.state = 'closed'
    this.failures = 0
    this.successes = 0
    this.totalCalls = 0
    this.lastFailure = null
    this.lastSuccess = null
    this.lastStateChange = Date.now()
    this.openedAt = null
    this.callHistory = []
    this.halfOpenCalls = 0
    this.emit('reset', { circuitName: this.name, timestamp: Date.now() })
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...config }
    log.debug('Circuit config updated', { name: this.name, config: this.config })
  }
}

/**
 * Circuit Breaker Registry
 *
 * Manages multiple circuit breakers by name
 */
export class CircuitBreakerRegistry extends EventEmitter {
  private circuits: Map<string, CircuitBreaker> = new Map()
  private defaultConfig: Partial<CircuitBreakerConfig>

  constructor(defaultConfig: Partial<CircuitBreakerConfig> = {}) {
    super()
    this.defaultConfig = defaultConfig
  }

  /**
   * Get or create a circuit breaker
   */
  getCircuit(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    let circuit = this.circuits.get(name)
    if (!circuit) {
      circuit = new CircuitBreaker(name, { ...this.defaultConfig, ...config })

      // Forward events
      circuit.on('state-change', (event) => this.emit('state-change', event))
      circuit.on('reset', (event) => this.emit('reset', event))

      this.circuits.set(name, circuit)
      log.debug('Circuit breaker registered', { name })
    }
    return circuit
  }

  /**
   * Get circuit by name (returns undefined if not exists)
   */
  get(name: string): CircuitBreaker | undefined {
    return this.circuits.get(name)
  }

  /**
   * Check if circuit exists
   */
  has(name: string): boolean {
    return this.circuits.has(name)
  }

  /**
   * Get all circuit states
   */
  getStates(): Record<string, CircuitState> {
    const states: Record<string, CircuitState> = {}
    for (const [name, circuit] of this.circuits) {
      states[name] = circuit.getState()
    }
    return states
  }

  /**
   * Get all circuit metrics
   */
  getAllMetrics(): CircuitMetrics[] {
    return Array.from(this.circuits.values()).map((c) => c.getMetrics())
  }

  /**
   * Reset a specific circuit
   */
  resetCircuit(name: string): boolean {
    const circuit = this.circuits.get(name)
    if (circuit) {
      circuit.reset()
      return true
    }
    return false
  }

  /**
   * Reset all circuits
   */
  resetAll(): void {
    for (const circuit of this.circuits.values()) {
      circuit.reset()
    }
    log.info('All circuits reset', { count: this.circuits.size })
  }

  /**
   * Remove a circuit
   */
  remove(name: string): boolean {
    const circuit = this.circuits.get(name)
    if (circuit) {
      circuit.removeAllListeners()
      this.circuits.delete(name)
      return true
    }
    return false
  }

  /**
   * Get circuit count
   */
  get size(): number {
    return this.circuits.size
  }

  /**
   * Get all circuit names
   */
  getNames(): string[] {
    return Array.from(this.circuits.keys())
  }
}

// Default singleton registry
export const circuitRegistry = new CircuitBreakerRegistry()

// Pre-defined circuits for providers and agents
export const providerCircuits = {
  claude: () => circuitRegistry.getCircuit('provider:claude'),
  openai: () => circuitRegistry.getCircuit('provider:openai'),
  xai: () => circuitRegistry.getCircuit('provider:xai'),
  gemini: () => circuitRegistry.getCircuit('provider:gemini'),
}

export const agentCircuits = {
  builder: () => circuitRegistry.getCircuit('agent:builder'),
  reviewer: () => circuitRegistry.getCircuit('agent:reviewer'),
  planner: () => circuitRegistry.getCircuit('agent:planner'),
  scout: () => circuitRegistry.getCircuit('agent:scout'),
  architect: () => circuitRegistry.getCircuit('agent:architect'),
}
