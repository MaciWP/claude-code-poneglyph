import { EventEmitter } from 'events'

// =============================================================================
// TYPES
// =============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogSource = 'orchestrator' | 'agent' | 'learning' | 'expert' | 'system'

export interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  source: LogSource
  message: string
  metadata?: Record<string, unknown>
  sessionId?: string
  agentId?: string
}

export interface LogFilters {
  level?: LogLevel
  source?: LogSource
  sessionId?: string
  agentId?: string
  limit?: number
  offset?: number
  startTime?: string
  endTime?: string
}

export type LogCallback = (entry: LogEntry) => void

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_LOG_ENTRIES = 1000
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// =============================================================================
// STRUCTURED LOGGER
// =============================================================================

export class StructuredLogger extends EventEmitter {
  private logs: LogEntry[] = []
  private subscribers: Set<LogCallback> = new Set()

  constructor() {
    super()
  }

  // ---------------------------------------------------------------------------
  // LOGGING METHODS
  // ---------------------------------------------------------------------------

  debug(source: LogSource, message: string, metadata?: Record<string, unknown>): void {
    this.log('debug', source, message, metadata)
  }

  info(source: LogSource, message: string, metadata?: Record<string, unknown>): void {
    this.log('info', source, message, metadata)
  }

  warn(source: LogSource, message: string, metadata?: Record<string, unknown>): void {
    this.log('warn', source, message, metadata)
  }

  error(source: LogSource, message: string, metadata?: Record<string, unknown>): void {
    this.log('error', source, message, metadata)
  }

  // ---------------------------------------------------------------------------
  // CORE LOG METHOD
  // ---------------------------------------------------------------------------

  private log(
    level: LogLevel,
    source: LogSource,
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      metadata,
      sessionId: metadata?.sessionId as string | undefined,
      agentId: metadata?.agentId as string | undefined,
    }

    // Add to internal storage
    this.logs.push(entry)

    // Enforce max limit
    if (this.logs.length > MAX_LOG_ENTRIES) {
      this.logs = this.logs.slice(-MAX_LOG_ENTRIES)
    }

    // Emit for real-time streaming
    this.emit('log', entry)

    // Notify subscribers
    this.subscribers.forEach((callback) => {
      try {
        callback(entry)
      } catch {
        // Ignore subscriber errors
      }
    })
  }

  // ---------------------------------------------------------------------------
  // RETRIEVAL METHODS
  // ---------------------------------------------------------------------------

  getLogs(filters?: LogFilters): LogEntry[] {
    let result = [...this.logs]

    if (filters) {
      // Filter by level (include this level and above)
      if (filters.level) {
        const minPriority = LOG_LEVEL_PRIORITY[filters.level]
        result = result.filter(
          (entry) => LOG_LEVEL_PRIORITY[entry.level] >= minPriority
        )
      }

      // Filter by source
      if (filters.source) {
        result = result.filter((entry) => entry.source === filters.source)
      }

      // Filter by sessionId
      if (filters.sessionId) {
        result = result.filter((entry) => entry.sessionId === filters.sessionId)
      }

      // Filter by agentId
      if (filters.agentId) {
        result = result.filter((entry) => entry.agentId === filters.agentId)
      }

      // Filter by time range
      if (filters.startTime) {
        result = result.filter((entry) => entry.timestamp >= filters.startTime!)
      }

      if (filters.endTime) {
        result = result.filter((entry) => entry.timestamp <= filters.endTime!)
      }

      // Apply offset
      if (filters.offset && filters.offset > 0) {
        result = result.slice(filters.offset)
      }

      // Apply limit
      if (filters.limit && filters.limit > 0) {
        result = result.slice(0, filters.limit)
      }
    }

    return result
  }

  getLogCount(): number {
    return this.logs.length
  }

  // ---------------------------------------------------------------------------
  // SUBSCRIPTION METHODS
  // ---------------------------------------------------------------------------

  subscribe(callback: LogCallback): void {
    this.subscribers.add(callback)
  }

  unsubscribe(callback: LogCallback): void {
    this.subscribers.delete(callback)
  }

  // ---------------------------------------------------------------------------
  // MANAGEMENT METHODS
  // ---------------------------------------------------------------------------

  clear(): void {
    this.logs = []
    this.emit('cleared')
  }

  // ---------------------------------------------------------------------------
  // EXPORT METHODS
  // ---------------------------------------------------------------------------

  exportLogs(format: 'json' | 'text'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2)
    }

    // Text format
    return this.logs
      .map((entry) => {
        const meta = entry.metadata
          ? ` ${JSON.stringify(entry.metadata)}`
          : ''
        const session = entry.sessionId ? ` [session:${entry.sessionId}]` : ''
        const agent = entry.agentId ? ` [agent:${entry.agentId}]` : ''
        return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.source}]${session}${agent} ${entry.message}${meta}`
      })
      .join('\n')
  }

  // ---------------------------------------------------------------------------
  // UTILITY METHODS
  // ---------------------------------------------------------------------------

  private generateId(): string {
    return `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const logger = new StructuredLogger()
