// =============================================================================
// AI-FRIENDLY LOGGING TYPES
// =============================================================================
// SPEC-019: Structured JSON logging optimized for AI debugging
// =============================================================================

/**
 * Log levels optimized for AI analysis
 * - debug: Detailed internals (AI reads when debugging specific issues)
 * - info: Normal operations (AI scans for context)
 * - warn: Potential issues (AI investigates if related to error)
 * - error: Failures (AI focuses here first)
 * - fatal: System failures (AI reports immediately)
 */
export type AILogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

/**
 * Context for AI to understand the execution environment
 */
export interface AILogContext {
  /** Session being debugged */
  sessionId?: string
  /** Thread from SPEC-011 */
  threadId?: string
  /** Request correlation ID for tracing */
  requestId?: string
  /** Which agent (builder, reviewer, etc.) */
  agentId?: string
  /** What operation (e.g., "file.edit", "api.call") */
  operation?: string
  /** Workflow phase (explore, plan, build, review) */
  phase?: 'explore' | 'plan' | 'build' | 'review' | 'execute' | 'stream'
}

/**
 * Trace information for distributed tracing
 */
export interface TraceInfo {
  /** Unique span identifier */
  spanId: string
  /** Parent span for hierarchy */
  parentSpanId?: string
  /** Duration in milliseconds */
  duration?: number
  /** Status of the traced operation */
  status: 'started' | 'completed' | 'failed'
}

/**
 * Parsed stack frame for AI analysis
 */
export interface StackFrame {
  file: string
  line: number
  function?: string
  column?: number
}

/**
 * Error information structured for AI debugging
 */
export interface ErrorInfo {
  /** Error class name */
  name: string
  /** Error message */
  message: string
  /** Parsed stack frames for easy analysis */
  stack: StackFrame[]
  /** Nested error cause */
  cause?: ErrorInfo
  /** Context where error occurred */
  context: {
    file?: string
    line?: number
    function?: string
    args?: unknown[]
  }
}

/**
 * Main AI-optimized log structure
 */
export interface AILog {
  // Identity
  /** Unique log ID (ULID format for sortability) */
  id: string
  /** ISO 8601 timestamp */
  timestamp: string
  /** Log level */
  level: AILogLevel

  // Context for AI
  context: AILogContext

  // Human-readable
  /** Short description of the event */
  message: string
  /** AI-generated summary for long logs */
  summary?: string

  // Machine-readable
  /** Structured payload for detailed analysis */
  data: Record<string, unknown>

  // For debugging
  /** Trace information for distributed tracing */
  trace?: TraceInfo
  /** Structured error information */
  error?: ErrorInfo

  // Relationships
  /** Parent log ID for hierarchies */
  parentId?: string
  /** Request correlation ID */
  correlationId?: string
  /** What triggered this log */
  causedBy?: string
}

/**
 * LLM-specific call logging
 */
export interface LLMCallData {
  provider: 'claude' | 'openai' | 'xai' | 'gemini'
  model: string
  prompt: {
    system?: string
    user: string
    /** If prompt was truncated for log */
    truncated: boolean
    tokenEstimate: number
  }
  response?: {
    content: string
    truncated: boolean
    tokenEstimate: number
    finishReason: string
  }
  metrics: {
    latency: number
    inputTokens: number
    outputTokens: number
    cost?: number
  }
  toolCalls?: Array<{
    name: string
    input: unknown
    output?: unknown
  }>
}

/**
 * Span for tracing operations
 */
export interface Span {
  id: string
  operation: string
  startTime: number
  parentSpanId?: string
  context: AILogContext
}

/**
 * Filter options for querying logs
 */
export interface LogFilter {
  level?: AILogLevel[]
  agentId?: string
  sessionId?: string
  requestId?: string
  operation?: string
  since?: Date
  until?: Date
  limit?: number
}

/**
 * Logger configuration
 */
export interface AILoggerConfig {
  /** Minimum log level to output */
  minLevel: AILogLevel
  /** Enable console output */
  console: boolean
  /** Enable file output */
  file: boolean
  /** Base directory for log files */
  logDir: string
  /** Maximum prompt length before truncation */
  maxPromptLength: number
  /** Enable JSON Lines format */
  jsonl: boolean
}
