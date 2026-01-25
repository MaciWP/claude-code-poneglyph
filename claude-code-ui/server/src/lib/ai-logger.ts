// =============================================================================
// AI-FRIENDLY LOGGER IMPLEMENTATION
// =============================================================================
// SPEC-019: Structured JSON logging optimized for AI debugging
// =============================================================================

import { mkdir, appendFile } from 'fs/promises'
import { join } from 'path'
import type {
  AILog,
  AILogLevel,
  AILogContext,
  TraceInfo,
  ErrorInfo,
  StackFrame,
  Span,
  LogFilter,
  LLMCallData,
  AILoggerConfig,
} from '../types/logging'
import { config } from '../config'

// =============================================================================
// CONSTANTS
// =============================================================================

const LOG_LEVEL_PRIORITY: Record<AILogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
}

const LOG_LEVEL_COLORS: Record<AILogLevel, string> = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
  fatal: '\x1b[35m', // Magenta
}

const RESET = '\x1b[0m'
const DIM = '\x1b[2m'
const BOLD = '\x1b[1m'

const DEFAULT_CONFIG: AILoggerConfig = {
  minLevel: 'info',
  console: true,
  file: true,
  logDir: './storage/logs',
  maxPromptLength: 500,
  jsonl: true,
}

// =============================================================================
// ULID GENERATION (simple implementation)
// =============================================================================

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
let lastTime = 0
let lastRandom = 0

function generateULID(): string {
  const now = Date.now()
  let timeStr = ''
  let time = now

  // Time component (10 chars)
  for (let i = 0; i < 10; i++) {
    timeStr = ENCODING[time % 32] + timeStr
    time = Math.floor(time / 32)
  }

  // Random component (16 chars) - with monotonic increment
  let randomStr = ''
  if (now === lastTime) {
    lastRandom++
  } else {
    lastTime = now
    lastRandom = Math.floor(Math.random() * 0xffffffffffff)
  }

  let random = lastRandom
  for (let i = 0; i < 16; i++) {
    randomStr = ENCODING[random % 32] + randomStr
    random = Math.floor(random / 32)
  }

  return timeStr + randomStr
}

// =============================================================================
// STACK TRACE PARSING
// =============================================================================

function parseStackTrace(stack: string | undefined): StackFrame[] {
  if (!stack) return []

  const frames: StackFrame[] = []
  const lines = stack.split('\n')

  for (const line of lines) {
    // Match patterns like:
    // "    at functionName (file.ts:10:5)"
    // "    at file.ts:10:5"
    // "    at Object.<anonymous> (file.ts:10:5)"
    const match = line.match(/^\s*at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/)
    if (match) {
      frames.push({
        function: match[1] || undefined,
        file: match[2],
        line: parseInt(match[3], 10),
        column: parseInt(match[4], 10),
      })
    }
  }

  return frames.slice(0, 10) // Limit to 10 frames
}

function createErrorInfo(error: Error): ErrorInfo {
  const frames = parseStackTrace(error.stack)
  const firstFrame = frames[0]

  return {
    name: error.name,
    message: error.message,
    stack: frames,
    cause: error.cause instanceof Error ? createErrorInfo(error.cause) : undefined,
    context: {
      file: firstFrame?.file,
      line: firstFrame?.line,
      function: firstFrame?.function,
    },
  }
}

// =============================================================================
// LOG STORAGE
// =============================================================================

class LogStorage {
  private logs: AILog[] = []
  private initialized = false
  private logDir: string

  constructor(logDir: string) {
    this.logDir = logDir
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      await mkdir(this.logDir, { recursive: true })
      await mkdir(join(this.logDir, 'sessions'), { recursive: true })
      await mkdir(join(this.logDir, 'errors'), { recursive: true })
      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize log storage:', error)
    }
  }

  async append(log: AILog): Promise<void> {
    // In-memory storage (limited)
    this.logs.push(log)
    if (this.logs.length > 10000) {
      this.logs = this.logs.slice(-5000)
    }

    // File storage
    if (!this.initialized) {
      await this.initialize()
    }

    const line = JSON.stringify(log) + '\n'

    // Write to current.jsonl
    try {
      await appendFile(join(this.logDir, 'current.jsonl'), line)
    } catch {
      // Ignore file write errors
    }

    // Write errors to separate file
    if (log.level === 'error' || log.level === 'fatal') {
      const date = new Date().toISOString().split('T')[0]
      try {
        await appendFile(join(this.logDir, 'errors', `${date}.jsonl`), line)
      } catch {
        // Ignore file write errors
      }
    }

    // Write to session file if sessionId present
    if (log.context.sessionId) {
      try {
        await appendFile(
          join(this.logDir, 'sessions', `${log.context.sessionId}.jsonl`),
          line
        )
      } catch {
        // Ignore file write errors
      }
    }
  }

  query(filter: LogFilter): AILog[] {
    let results = this.logs

    if (filter.level && filter.level.length > 0) {
      results = results.filter((log) => filter.level!.includes(log.level))
    }

    if (filter.agentId) {
      results = results.filter((log) => log.context.agentId === filter.agentId)
    }

    if (filter.sessionId) {
      results = results.filter((log) => log.context.sessionId === filter.sessionId)
    }

    if (filter.requestId) {
      results = results.filter((log) => log.context.requestId === filter.requestId)
    }

    if (filter.operation) {
      const pattern = filter.operation.replace('*', '.*')
      const regex = new RegExp(`^${pattern}$`)
      results = results.filter((log) =>
        log.context.operation && regex.test(log.context.operation)
      )
    }

    if (filter.since) {
      const sinceMs = filter.since.getTime()
      results = results.filter((log) => new Date(log.timestamp).getTime() >= sinceMs)
    }

    if (filter.until) {
      const untilMs = filter.until.getTime()
      results = results.filter((log) => new Date(log.timestamp).getTime() <= untilMs)
    }

    // Sort by timestamp (newest first for limit)
    results = results.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    if (filter.limit && filter.limit > 0) {
      results = results.slice(0, filter.limit)
    }

    return results
  }

  getErrors(since: Date): AILog[] {
    return this.query({
      level: ['error', 'fatal'],
      since,
    })
  }

  getTrace(correlationId: string): AILog[] {
    return this.logs
      .filter((log) => log.correlationId === correlationId)
      .sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
  }
}

// =============================================================================
// AI LOGGER CLASS
// =============================================================================

export interface AILogger {
  // Basic logging
  debug(message: string, data?: Record<string, unknown>): void
  info(message: string, data?: Record<string, unknown>): void
  warn(message: string, data?: Record<string, unknown>): void
  error(message: string, error?: Error | null, data?: Record<string, unknown>): void
  fatal(message: string, error?: Error | null, data?: Record<string, unknown>): void

  // Tracing
  startSpan(operation: string): Span
  endSpan(span: Span, status: 'completed' | 'failed'): void

  // Context
  withContext(context: Partial<AILogContext>): AILogger
  withCorrelation(correlationId: string): AILogger
  withRequestId(requestId: string): AILogger
  withSession(sessionId: string): AILogger
  withAgent(agentId: string): AILogger

  // LLM specific
  logLLMCall(call: LLMCallData): void
  logToolCall(tool: string, input: unknown, output: unknown, duration?: number): void

  // Query (for AI to read)
  getLogs(filter: LogFilter): AILog[]
  getTrace(correlationId: string): AILog[]
  getErrors(since: Date): AILog[]

  // Child logger
  child(name: string): AILogger
}

class AILoggerImpl implements AILogger {
  private context: AILogContext
  private correlationId?: string
  private config: AILoggerConfig
  private storage: LogStorage
  private name: string

  constructor(
    name: string,
    storage: LogStorage,
    config: AILoggerConfig,
    context: AILogContext = {},
    correlationId?: string
  ) {
    this.name = name
    this.storage = storage
    this.config = config
    this.context = context
    this.correlationId = correlationId
  }

  private shouldLog(level: AILogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.minLevel]
  }

  private formatConsole(log: AILog): string {
    const color = LOG_LEVEL_COLORS[log.level]
    const timestamp = log.timestamp.slice(11, 23) // HH:mm:ss.SSS
    const level = log.level.toUpperCase().padEnd(5)

    let output = `${DIM}${timestamp}${RESET} ${color}${level}${RESET}`

    // Add context identifiers
    const contextParts: string[] = []
    if (this.name) contextParts.push(this.name)
    if (log.context.operation) contextParts.push(log.context.operation)
    if (contextParts.length > 0) {
      output += ` ${DIM}[${contextParts.join('/')}]${RESET}`
    }

    output += ` ${log.message}`

    // Add compact data
    if (Object.keys(log.data).length > 0) {
      const dataStr = JSON.stringify(log.data)
      output += ` ${DIM}${dataStr.length > 150 ? dataStr.slice(0, 150) + '...' : dataStr}${RESET}`
    }

    // Add error if present
    if (log.error) {
      output += `\n  ${color}${BOLD}${log.error.name}${RESET}: ${log.error.message}`
      if (log.error.stack.length > 0) {
        const frame = log.error.stack[0]
        output += `\n  ${DIM}at ${frame.function || '<anonymous>'} (${frame.file}:${frame.line})${RESET}`
      }
    }

    return output
  }

  private async log(
    level: AILogLevel,
    message: string,
    data: Record<string, unknown> = {},
    error?: Error | null
  ): Promise<void> {
    if (!this.shouldLog(level)) return

    const log: AILog = {
      id: generateULID(),
      timestamp: new Date().toISOString(),
      level,
      context: { ...this.context },
      message,
      data,
      correlationId: this.correlationId,
    }

    if (error) {
      log.error = createErrorInfo(error)
    }

    // Console output
    if (this.config.console) {
      const formatted = this.formatConsole(log)
      if (level === 'error' || level === 'fatal') {
        console.error(formatted)
      } else if (level === 'warn') {
        console.warn(formatted)
      } else {
        console.log(formatted)
      }
    }

    // File storage
    if (this.config.file) {
      await this.storage.append(log)
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data)
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data)
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data)
  }

  error(message: string, error?: Error | null, data?: Record<string, unknown>): void {
    this.log('error', message, data || {}, error)
  }

  fatal(message: string, error?: Error | null, data?: Record<string, unknown>): void {
    this.log('fatal', message, data || {}, error)
  }

  startSpan(operation: string): Span {
    const span: Span = {
      id: generateULID(),
      operation,
      startTime: Date.now(),
      parentSpanId: this.context.operation ? undefined : undefined, // Could track parent spans
      context: { ...this.context, operation },
    }

    this.log('debug', `Span started: ${operation}`, {
      spanId: span.id,
      operation,
    })

    return span
  }

  endSpan(span: Span, status: 'completed' | 'failed'): void {
    const duration = Date.now() - span.startTime

    // TraceInfo for structured logging
    const traceInfo: TraceInfo = {
      spanId: span.id,
      parentSpanId: span.parentSpanId,
      duration,
      status,
    }

    const level = status === 'failed' ? 'warn' : 'debug'
    this.log(level, `Span ${status}: ${span.operation}`, {
      spanId: traceInfo.spanId,
      parentSpanId: traceInfo.parentSpanId,
      duration: traceInfo.duration,
      status: traceInfo.status,
    })
  }

  withContext(context: Partial<AILogContext>): AILogger {
    return new AILoggerImpl(
      this.name,
      this.storage,
      this.config,
      { ...this.context, ...context },
      this.correlationId
    )
  }

  withCorrelation(correlationId: string): AILogger {
    return new AILoggerImpl(
      this.name,
      this.storage,
      this.config,
      this.context,
      correlationId
    )
  }

  withRequestId(requestId: string): AILogger {
    return this.withContext({ requestId })
  }

  withSession(sessionId: string): AILogger {
    return this.withContext({ sessionId })
  }

  withAgent(agentId: string): AILogger {
    return this.withContext({ agentId })
  }

  logLLMCall(call: LLMCallData): void {
    // Truncate prompt if needed
    const truncatedPrompt = call.prompt.user.length > this.config.maxPromptLength
      ? call.prompt.user.slice(0, this.config.maxPromptLength)
      : call.prompt.user

    const truncatedResponse = call.response?.content
      ? call.response.content.length > this.config.maxPromptLength
        ? call.response.content.slice(0, this.config.maxPromptLength)
        : call.response.content
      : undefined

    this.log('info', `LLM call to ${call.provider}/${call.model}`, {
      provider: call.provider,
      model: call.model,
      prompt: {
        system: call.prompt.system?.slice(0, 100),
        user: truncatedPrompt,
        truncated: call.prompt.user.length > this.config.maxPromptLength,
        tokenEstimate: call.prompt.tokenEstimate,
      },
      response: truncatedResponse
        ? {
            content: truncatedResponse,
            truncated: (call.response?.content.length || 0) > this.config.maxPromptLength,
            tokenEstimate: call.response?.tokenEstimate,
            finishReason: call.response?.finishReason,
          }
        : undefined,
      metrics: call.metrics,
      toolCallCount: call.toolCalls?.length || 0,
    })
  }

  logToolCall(
    tool: string,
    input: unknown,
    output: unknown,
    duration?: number
  ): void {
    const inputStr = JSON.stringify(input)
    const outputStr = JSON.stringify(output)

    this.log('info', `Tool call: ${tool}`, {
      tool,
      input: inputStr.length > 200 ? inputStr.slice(0, 200) + '...' : input,
      output: outputStr.length > 200 ? outputStr.slice(0, 200) + '...' : output,
      inputTruncated: inputStr.length > 200,
      outputTruncated: outputStr.length > 200,
      duration,
    })
  }

  getLogs(filter: LogFilter): AILog[] {
    return this.storage.query(filter)
  }

  getTrace(correlationId: string): AILog[] {
    return this.storage.getTrace(correlationId)
  }

  getErrors(since: Date): AILog[] {
    return this.storage.getErrors(since)
  }

  child(name: string): AILogger {
    const childName = this.name ? `${this.name}:${name}` : name
    return new AILoggerImpl(
      childName,
      this.storage,
      this.config,
      this.context,
      this.correlationId
    )
  }
}

// =============================================================================
// FACTORY AND EXPORTS
// =============================================================================

let globalStorage: LogStorage | null = null
let globalConfig: AILoggerConfig | null = null

/**
 * Create or get the global AI logger
 */
export function createAILogger(customConfig?: Partial<AILoggerConfig>): AILogger {
  const finalConfig: AILoggerConfig = {
    ...DEFAULT_CONFIG,
    minLevel: (config.LOG_LEVEL as AILogLevel) || DEFAULT_CONFIG.minLevel,
    ...customConfig,
  }

  if (!globalStorage) {
    globalStorage = new LogStorage(finalConfig.logDir)
  }

  if (!globalConfig) {
    globalConfig = finalConfig
  }

  return new AILoggerImpl('', globalStorage, finalConfig)
}

/**
 * Get a named child logger from the global instance
 */
export function getLogger(name: string): AILogger {
  if (!globalStorage) {
    createAILogger()
  }
  return new AILoggerImpl(name, globalStorage!, globalConfig!)
}

// Default export for convenience
export const aiLogger = createAILogger()
