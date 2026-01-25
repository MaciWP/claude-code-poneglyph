// =============================================================================
// LIB EXPORTS
// =============================================================================

// AI-Friendly Logger (SPEC-019)
export {
  createAILogger,
  getLogger,
  aiLogger,
  type AILogger,
} from './ai-logger'

// Logger Bridge (backward compatibility)
export {
  createBridgedLogger,
  createRequestLogger,
  generateCorrelationId,
  generateRequestId,
} from './logger-bridge'
