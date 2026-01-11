import { config } from './config'
import { LOGGER_DEDUP_WINDOW_MS } from './constants'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const LOG_ICONS: Record<LogLevel, string> = {
  debug: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
}

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m',
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
}

const RESET = '\x1b[0m'

const recentLogs = new Map<string, number>()

function cleanupRecentLogs(): void {
  const now = Date.now()
  for (const [key, timestamp] of recentLogs.entries()) {
    if (now - timestamp > LOGGER_DEDUP_WINDOW_MS * 2) {
      recentLogs.delete(key)
    }
  }
}

function shouldDedupe(key: string): boolean {
  const now = Date.now()
  const lastTime = recentLogs.get(key)
  if (lastTime && now - lastTime < LOGGER_DEDUP_WINDOW_MS) {
    return true
  }
  recentLogs.set(key, now)
  if (recentLogs.size > 100) {
    cleanupRecentLogs()
  }
  return false
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[config.LOG_LEVEL]
}

function formatTimestamp(): string {
  return new Date().toISOString().slice(11, 23)
}

function compactStringify(data: unknown): string {
  if (data === undefined || data === null) return ''
  if (typeof data !== 'object') return String(data)
  try {
    const str = JSON.stringify(data)
    return str.length > 200 ? str.slice(0, 200) + '...' : str
  } catch {
    return '[object]'
  }
}

function formatMessage(level: LogLevel, context: string, message: string, data?: unknown): string {
  const timestamp = formatTimestamp()
  const color = LOG_COLORS[level]
  const icon = LOG_ICONS[level]

  let output = `${color}${timestamp} ${icon} [${context}]${RESET} ${message}`

  if (data !== undefined) {
    output += ` ${compactStringify(data)}`
  }

  return output
}

export interface Logger {
  debug(context: string, message: string, data?: unknown): void
  info(context: string, message: string, data?: unknown): void
  warn(context: string, message: string, data?: unknown): void
  error(context: string, message: string, data?: unknown): void
  child(context: string): ContextLogger
}

export interface ContextLogger {
  debug(message: string, data?: unknown): void
  info(message: string, data?: unknown): void
  warn(message: string, data?: unknown): void
  error(message: string, data?: unknown): void
}

function createContextLogger(context: string): ContextLogger {
  return {
    debug: (message: string, data?: unknown) => logger.debug(context, message, data),
    info: (message: string, data?: unknown) => logger.info(context, message, data),
    warn: (message: string, data?: unknown) => logger.warn(context, message, data),
    error: (message: string, data?: unknown) => logger.error(context, message, data),
  }
}

export const logger: Logger = {
  debug(context: string, message: string, data?: unknown) {
    if (!shouldLog('debug')) return
    const dedupKey = `debug:${context}:${message}`
    if (shouldDedupe(dedupKey)) return
    console.log(formatMessage('debug', context, message, data))
  },

  info(context: string, message: string, data?: unknown) {
    if (!shouldLog('info')) return
    const dedupKey = `info:${context}:${message}`
    if (shouldDedupe(dedupKey)) return
    console.log(formatMessage('info', context, message, data))
  },

  warn(context: string, message: string, data?: unknown) {
    if (!shouldLog('warn')) return
    const dedupKey = `warn:${context}:${message}`
    if (shouldDedupe(dedupKey)) return
    console.warn(formatMessage('warn', context, message, data))
  },

  error(context: string, message: string, data?: unknown) {
    if (!shouldLog('error')) return
    console.error(formatMessage('error', context, message, data))
  },

  child(context: string): ContextLogger {
    return createContextLogger(context)
  },
}
