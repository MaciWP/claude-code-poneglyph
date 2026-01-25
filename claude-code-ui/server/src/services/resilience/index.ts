/**
 * Error Recovery & Resilience System
 *
 * Based on SPEC-016: Error Recovery & Resilience
 *
 * Provides:
 * - Error classification (transient vs permanent)
 * - Retry with exponential backoff + jitter
 * - Circuit breaker pattern
 * - Fallback chains
 * - Timeout handling
 * - Unified resilience manager
 */

// Error Classifier
export {
  ErrorClassifier,
  errorClassifier,
  ErrorCategory,
  type ClassifiedError,
  TimeoutError,
  CircuitOpenError,
  RetryExhaustedError,
} from './error-classifier'

// Retry
export {
  Retry,
  retry,
  withRetry,
  withRetrySafe,
  calculateDelay,
  DEFAULT_RETRY_CONFIG,
  type RetryConfig,
  type RetryEvent,
  type RetryResult,
} from './retry'

// Circuit Breaker
export {
  CircuitBreaker,
  CircuitBreakerRegistry,
  circuitRegistry,
  providerCircuits,
  agentCircuits,
  DEFAULT_CIRCUIT_CONFIG,
  type CircuitBreakerConfig,
  type CircuitState,
  type CircuitStateChangeEvent,
  type CircuitMetrics,
} from './circuit-breaker'

// Fallback
export {
  Fallback,
  fallback,
  withFallback,
  withFallbackSafe,
  createAgentFallbackChain,
  agentFallbackChains,
  providerFallbackChains,
  type FallbackChain,
  type FallbackOperation,
  type FallbackEvent,
  type FallbackResult,
} from './fallback'

// Timeout
export {
  TimeoutManager,
  timeoutManager,
  withTimeout,
  withTimeoutSafe,
  createCancellableTimeout,
  createDeadline,
  raceWithTimeouts,
  DEFAULT_TIMEOUT_CONFIG,
  type TimeoutConfig,
} from './timeout'

// Resilience Manager (unified interface)
export {
  ResilienceManager,
  resilienceManager,
  type ResilienceOptions,
  type ResilienceMetrics,
  type RecoveryEvent,
} from './resilience-manager'
