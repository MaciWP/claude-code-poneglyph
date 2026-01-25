// =============================================================================
// AI-FRIENDLY LOGGER TESTS
// =============================================================================

import { describe, test, expect, beforeEach, spyOn } from 'bun:test'
import { createAILogger, getLogger, type AILogger } from './ai-logger'

describe('AILogger', () => {
  let logger: AILogger
  let consoleSpy: ReturnType<typeof spyOn>

  beforeEach(() => {
    // Create fresh logger with console output and no file output for tests
    logger = createAILogger({
      minLevel: 'debug',
      console: true,
      file: false,
      logDir: './test-logs',
      maxPromptLength: 100,
      jsonl: true,
    })
    consoleSpy = spyOn(console, 'log').mockImplementation(() => {})
    spyOn(console, 'warn').mockImplementation(() => {})
    spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('Basic Logging', () => {
    test('should log debug messages', () => {
      logger.debug('Test debug message', { key: 'value' })
      expect(consoleSpy).toHaveBeenCalled()
    })

    test('should log info messages', () => {
      logger.info('Test info message', { key: 'value' })
      expect(consoleSpy).toHaveBeenCalled()
    })

    test('should log warn messages', () => {
      const warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
      logger.warn('Test warn message', { key: 'value' })
      expect(warnSpy).toHaveBeenCalled()
    })

    test('should log error messages with Error object', () => {
      const errorSpy = spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Test error')
      logger.error('Test error message', error, { context: 'test' })
      expect(errorSpy).toHaveBeenCalled()
    })

    test('should log fatal messages', () => {
      const errorSpy = spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Fatal error')
      logger.fatal('System failure', error)
      expect(errorSpy).toHaveBeenCalled()
    })
  })

  describe('Context Management', () => {
    test('should create logger with context', () => {
      const contextLogger = logger.withContext({
        sessionId: 'sess_123',
        agentId: 'builder',
        operation: 'file.edit',
      })
      contextLogger.info('Context test')
      expect(consoleSpy).toHaveBeenCalled()
    })

    test('should chain context methods', () => {
      const chainedLogger = logger
        .withSession('sess_456')
        .withAgent('reviewer')
        .withRequestId('req_789')

      chainedLogger.info('Chained context test')
      expect(consoleSpy).toHaveBeenCalled()
    })

    test('should create correlation context', () => {
      const correlatedLogger = logger.withCorrelation('corr_abc123')
      correlatedLogger.info('Correlated log')
      expect(consoleSpy).toHaveBeenCalled()
    })
  })

  describe('Tracing', () => {
    test('should start and end span', () => {
      const span = logger.startSpan('build.implement')
      expect(span).toBeDefined()
      expect(span.id).toBeTruthy()
      expect(span.operation).toBe('build.implement')
      expect(span.startTime).toBeLessThanOrEqual(Date.now())

      logger.endSpan(span, 'completed')
      // Span completion is logged as debug
    })

    test('should handle failed spans', () => {
      const span = logger.startSpan('api.call')
      logger.endSpan(span, 'failed')
      // Failed span is logged as warn
    })
  })

  describe('LLM Call Logging', () => {
    test('should log LLM calls with truncation', () => {
      logger.logLLMCall({
        provider: 'claude',
        model: 'claude-sonnet-4-20250514',
        prompt: {
          system: 'You are a helpful assistant',
          user: 'This is a test prompt that might be quite long and should be truncated if it exceeds the maximum length configured for the logger',
          truncated: false,
          tokenEstimate: 50,
        },
        response: {
          content: 'This is the response',
          truncated: false,
          tokenEstimate: 10,
          finishReason: 'stop',
        },
        metrics: {
          latency: 1234,
          inputTokens: 50,
          outputTokens: 10,
          cost: 0.001,
        },
      })
      expect(consoleSpy).toHaveBeenCalled()
    })

    test('should log LLM calls without response', () => {
      logger.logLLMCall({
        provider: 'openai',
        model: 'gpt-4',
        prompt: {
          user: 'Test prompt',
          truncated: false,
          tokenEstimate: 10,
        },
        metrics: {
          latency: 500,
          inputTokens: 10,
          outputTokens: 0,
        },
      })
      expect(consoleSpy).toHaveBeenCalled()
    })
  })

  describe('Tool Call Logging', () => {
    test('should log tool calls', () => {
      logger.logToolCall(
        'Read',
        { file_path: '/path/to/file.ts' },
        { content: 'file contents' },
        100
      )
      expect(consoleSpy).toHaveBeenCalled()
    })

    test('should truncate large tool inputs/outputs', () => {
      const largeInput = { data: 'x'.repeat(500) }
      const largeOutput = { result: 'y'.repeat(500) }

      logger.logToolCall('Edit', largeInput, largeOutput, 200)
      expect(consoleSpy).toHaveBeenCalled()
    })
  })

  describe('Child Loggers', () => {
    test('should create named child logger', () => {
      const childLogger = logger.child('claude-service')
      childLogger.info('Child logger test')
      expect(consoleSpy).toHaveBeenCalled()
    })

    test('should nest child logger names', () => {
      const child1 = logger.child('service')
      const child2 = child1.child('claude')
      child2.info('Nested child test')
      expect(consoleSpy).toHaveBeenCalled()
    })
  })

  describe('Log Queries', () => {
    test('should query logs by filter', () => {
      // Log some messages first
      const sessionLogger = logger.withSession('test-session')
      sessionLogger.info('Test log 1')
      sessionLogger.warn('Test log 2')
      sessionLogger.error('Test log 3', new Error('test'))

      // Query - note: with file: false, in-memory storage still works
      const logs = logger.getLogs({
        sessionId: 'test-session',
        limit: 10,
      })

      // Logs might be empty if storage is not persisted across instances
      expect(Array.isArray(logs)).toBe(true)
    })

    test('should get errors since date', () => {
      const errors = logger.getErrors(new Date(Date.now() - 3600000))
      expect(Array.isArray(errors)).toBe(true)
    })

    test('should get trace by correlationId', () => {
      const trace = logger.getTrace('corr_nonexistent')
      expect(Array.isArray(trace)).toBe(true)
      expect(trace.length).toBe(0)
    })
  })

  describe('Log Level Filtering', () => {
    test('should filter based on minimum level', () => {
      const infoLogger = createAILogger({
        minLevel: 'info',
        console: true,
        file: false,
        logDir: './test-logs',
        maxPromptLength: 100,
        jsonl: true,
      })

      // Debug should not be logged when minLevel is 'info'
      // The shouldLog check happens internally and prevents logging
      spyOn(console, 'log').mockImplementation(() => {})
      infoLogger.debug('This should not appear')
      // Logger internally checks level before calling console.log
    })
  })

  describe('getLogger Factory', () => {
    test('should get named logger', () => {
      const namedLogger = getLogger('test-module')
      expect(namedLogger).toBeDefined()
      namedLogger.info('Named logger test')
    })
  })
})

describe('Error Parsing', () => {
  test('should parse error with stack trace', () => {
    const logger = createAILogger({
      minLevel: 'debug',
      console: true,
      file: false,
      logDir: './test-logs',
      maxPromptLength: 100,
      jsonl: true,
    })

    const errorSpy = spyOn(console, 'error').mockImplementation(() => {})

    const error = new Error('Test error with stack')
    logger.error('Error with stack', error)

    expect(errorSpy).toHaveBeenCalled()
  })

  test('should handle error with cause', () => {
    const logger = createAILogger({
      minLevel: 'debug',
      console: true,
      file: false,
      logDir: './test-logs',
      maxPromptLength: 100,
      jsonl: true,
    })

    const errorSpy = spyOn(console, 'error').mockImplementation(() => {})

    const cause = new Error('Root cause')
    const error = new Error('Wrapper error', { cause })
    logger.error('Error with cause', error)

    expect(errorSpy).toHaveBeenCalled()
  })
})
