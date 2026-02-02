import { describe, it, expect, beforeEach } from 'bun:test'
import { StructuredLogger, LogEntry } from './logger'

describe('StructuredLogger', () => {
  let logger: StructuredLogger

  beforeEach(() => {
    logger = new StructuredLogger()
  })

  // ===========================================================================
  // CREATION OF LOGS
  // ===========================================================================

  describe('log creation', () => {
    it('debug() creates entry with correct level', () => {
      logger.debug('system', 'Debug message')
      const logs = logger.getLogs()

      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe('debug')
      expect(logs[0].source).toBe('system')
      expect(logs[0].message).toBe('Debug message')
    })

    it('info() creates entry with correct level', () => {
      logger.info('orchestrator', 'Info message')
      const logs = logger.getLogs()

      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe('info')
      expect(logs[0].source).toBe('orchestrator')
      expect(logs[0].message).toBe('Info message')
    })

    it('warn() creates entry with correct level', () => {
      logger.warn('agent', 'Warning message')
      const logs = logger.getLogs()

      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe('warn')
      expect(logs[0].source).toBe('agent')
      expect(logs[0].message).toBe('Warning message')
    })

    it('error() creates entry with correct level', () => {
      logger.error('learning', 'Error message')
      const logs = logger.getLogs()

      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe('error')
      expect(logs[0].source).toBe('learning')
      expect(logs[0].message).toBe('Error message')
    })

    it('attaches metadata correctly', () => {
      const metadata = { userId: '123', action: 'login', count: 42 }
      logger.info('system', 'With metadata', metadata)
      const logs = logger.getLogs()

      expect(logs[0].metadata).toEqual(metadata)
    })

    it('extracts sessionId from metadata', () => {
      logger.info('agent', 'Session log', { sessionId: 'session-123', extra: 'data' })
      const logs = logger.getLogs()

      expect(logs[0].sessionId).toBe('session-123')
    })

    it('extracts agentId from metadata', () => {
      logger.info('agent', 'Agent log', { agentId: 'agent-456', task: 'build' })
      const logs = logger.getLogs()

      expect(logs[0].agentId).toBe('agent-456')
    })

    it('generates unique id for each entry', () => {
      logger.info('system', 'First')
      logger.info('system', 'Second')
      const logs = logger.getLogs()

      expect(logs[0].id).not.toBe(logs[1].id)
      expect(logs[0].id).toMatch(/^log-\d+-[a-z0-9]+$/)
    })

    it('includes ISO timestamp', () => {
      logger.info('system', 'Timestamp test')
      const logs = logger.getLogs()

      expect(logs[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })

  // ===========================================================================
  // MAX LOG ENTRIES LIMIT
  // ===========================================================================

  describe('max log entries limit', () => {
    it('enforces MAX_LOG_ENTRIES limit (1000)', () => {
      // Create 1050 logs
      for (let i = 0; i < 1050; i++) {
        logger.info('system', `Log ${i}`)
      }

      expect(logger.getLogCount()).toBe(1000)
    })

    it('removes oldest entries when limit exceeded', () => {
      // Create 1050 logs
      for (let i = 0; i < 1050; i++) {
        logger.info('system', `Log ${i}`)
      }

      const logs = logger.getLogs()

      // First log should be Log 50 (0-49 were removed)
      expect(logs[0].message).toBe('Log 50')
      // Last log should be Log 1049
      expect(logs[logs.length - 1].message).toBe('Log 1049')
    })
  })

  // ===========================================================================
  // FILTERS IN getLogs
  // ===========================================================================

  describe('getLogs filters', () => {
    beforeEach(() => {
      // Create diverse log entries for filtering tests
      logger.debug('system', 'Debug system', { sessionId: 'sess-1' })
      logger.info('orchestrator', 'Info orchestrator', { sessionId: 'sess-1', agentId: 'agent-1' })
      logger.warn('agent', 'Warn agent', { sessionId: 'sess-2', agentId: 'agent-1' })
      logger.error('learning', 'Error learning', { sessionId: 'sess-2', agentId: 'agent-2' })
      logger.info('expert', 'Info expert', { sessionId: 'sess-3' })
    })

    describe('level filter', () => {
      it('filters by exact level and above', () => {
        const warnAndAbove = logger.getLogs({ level: 'warn' })

        expect(warnAndAbove).toHaveLength(2)
        expect(warnAndAbove.every(l => l.level === 'warn' || l.level === 'error')).toBe(true)
      })

      it('includes all logs when filtering by debug', () => {
        const allLogs = logger.getLogs({ level: 'debug' })
        expect(allLogs).toHaveLength(5)
      })

      it('returns only error logs when filtering by error', () => {
        const errorLogs = logger.getLogs({ level: 'error' })

        expect(errorLogs).toHaveLength(1)
        expect(errorLogs[0].level).toBe('error')
      })
    })

    describe('source filter', () => {
      it('filters by source', () => {
        const agentLogs = logger.getLogs({ source: 'agent' })

        expect(agentLogs).toHaveLength(1)
        expect(agentLogs[0].source).toBe('agent')
      })

      it('returns empty array for non-existent source', () => {
        // Create new logger to have clean state
        const freshLogger = new StructuredLogger()
        freshLogger.info('system', 'Only system')

        const learningLogs = freshLogger.getLogs({ source: 'learning' })
        expect(learningLogs).toHaveLength(0)
      })
    })

    describe('sessionId filter', () => {
      it('filters by sessionId', () => {
        const sess1Logs = logger.getLogs({ sessionId: 'sess-1' })

        expect(sess1Logs).toHaveLength(2)
        expect(sess1Logs.every(l => l.sessionId === 'sess-1')).toBe(true)
      })

      it('returns empty for non-existent sessionId', () => {
        const noLogs = logger.getLogs({ sessionId: 'non-existent' })
        expect(noLogs).toHaveLength(0)
      })
    })

    describe('agentId filter', () => {
      it('filters by agentId', () => {
        const agent1Logs = logger.getLogs({ agentId: 'agent-1' })

        expect(agent1Logs).toHaveLength(2)
        expect(agent1Logs.every(l => l.agentId === 'agent-1')).toBe(true)
      })

      it('returns empty for non-existent agentId', () => {
        const noLogs = logger.getLogs({ agentId: 'non-existent' })
        expect(noLogs).toHaveLength(0)
      })
    })

    describe('limit and offset', () => {
      it('applies limit correctly', () => {
        const limited = logger.getLogs({ limit: 2 })

        expect(limited).toHaveLength(2)
        expect(limited[0].message).toBe('Debug system')
        expect(limited[1].message).toBe('Info orchestrator')
      })

      it('applies offset correctly', () => {
        const offset = logger.getLogs({ offset: 2 })

        expect(offset).toHaveLength(3)
        expect(offset[0].message).toBe('Warn agent')
      })

      it('applies limit and offset together', () => {
        const paginated = logger.getLogs({ offset: 1, limit: 2 })

        expect(paginated).toHaveLength(2)
        expect(paginated[0].message).toBe('Info orchestrator')
        expect(paginated[1].message).toBe('Warn agent')
      })

      it('returns empty when offset exceeds log count', () => {
        const noLogs = logger.getLogs({ offset: 100 })
        expect(noLogs).toHaveLength(0)
      })
    })

    describe('combined filters', () => {
      it('applies multiple filters together', () => {
        const filtered = logger.getLogs({
          sessionId: 'sess-2',
          level: 'warn',
        })

        expect(filtered).toHaveLength(2)
        expect(filtered.every(l => l.sessionId === 'sess-2')).toBe(true)
      })
    })
  })

  // ===========================================================================
  // SUBSCRIPTIONS
  // ===========================================================================

  describe('subscriptions', () => {
    it('subscribe() receives new logs', () => {
      const received: LogEntry[] = []
      const callback = (entry: LogEntry) => received.push(entry)

      logger.subscribe(callback)
      logger.info('system', 'Subscribed message')

      expect(received).toHaveLength(1)
      expect(received[0].message).toBe('Subscribed message')
    })

    it('unsubscribe() stops receiving logs', () => {
      const received: LogEntry[] = []
      const callback = (entry: LogEntry) => received.push(entry)

      logger.subscribe(callback)
      logger.info('system', 'First message')

      logger.unsubscribe(callback)
      logger.info('system', 'Second message')

      expect(received).toHaveLength(1)
      expect(received[0].message).toBe('First message')
    })

    it('multiple subscribers receive logs independently', () => {
      const received1: LogEntry[] = []
      const received2: LogEntry[] = []

      logger.subscribe((entry) => received1.push(entry))
      logger.subscribe((entry) => received2.push(entry))

      logger.info('system', 'Broadcast')

      expect(received1).toHaveLength(1)
      expect(received2).toHaveLength(1)
    })

    it('handles subscriber errors gracefully', () => {
      const received: LogEntry[] = []
      const goodCallback = (entry: LogEntry) => received.push(entry)
      const badCallback = () => {
        throw new Error('Subscriber error')
      }

      logger.subscribe(badCallback)
      logger.subscribe(goodCallback)

      // Should not throw
      expect(() => logger.info('system', 'Test')).not.toThrow()
      expect(received).toHaveLength(1)
    })

    it('emits log event via EventEmitter', () => {
      const received: LogEntry[] = []

      logger.on('log', (entry: LogEntry) => received.push(entry))
      logger.info('system', 'Event emitter test')

      expect(received).toHaveLength(1)
    })
  })

  // ===========================================================================
  // EXPORT
  // ===========================================================================

  describe('export', () => {
    beforeEach(() => {
      logger.info('system', 'Test message', { key: 'value' })
      logger.error('agent', 'Error message', { sessionId: 'sess-1', agentId: 'agent-1' })
    })

    describe('JSON format', () => {
      it('exports valid JSON', () => {
        const exported = logger.exportLogs('json')

        expect(() => JSON.parse(exported)).not.toThrow()
      })

      it('JSON contains all log entries', () => {
        const exported = logger.exportLogs('json')
        const parsed = JSON.parse(exported) as LogEntry[]

        expect(parsed).toHaveLength(2)
        expect(parsed[0].message).toBe('Test message')
        expect(parsed[1].message).toBe('Error message')
      })

      it('JSON preserves metadata', () => {
        const exported = logger.exportLogs('json')
        const parsed = JSON.parse(exported) as LogEntry[]

        expect(parsed[0].metadata).toEqual({ key: 'value' })
      })
    })

    describe('text format', () => {
      it('includes timestamps in text format', () => {
        const exported = logger.exportLogs('text')

        // Check for ISO timestamp pattern
        expect(exported).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      })

      it('includes level in uppercase', () => {
        const exported = logger.exportLogs('text')

        expect(exported).toContain('[INFO]')
        expect(exported).toContain('[ERROR]')
      })

      it('includes source', () => {
        const exported = logger.exportLogs('text')

        expect(exported).toContain('[system]')
        expect(exported).toContain('[agent]')
      })

      it('includes sessionId and agentId when present', () => {
        const exported = logger.exportLogs('text')

        expect(exported).toContain('[session:sess-1]')
        expect(exported).toContain('[agent:agent-1]')
      })

      it('includes metadata as JSON', () => {
        const exported = logger.exportLogs('text')

        expect(exported).toContain('{"key":"value"}')
      })

      it('separates entries with newlines', () => {
        const exported = logger.exportLogs('text')
        const lines = exported.split('\n')

        expect(lines).toHaveLength(2)
      })
    })
  })

  // ===========================================================================
  // CLEAR
  // ===========================================================================

  describe('clear', () => {
    it('removes all logs', () => {
      logger.info('system', 'First')
      logger.info('system', 'Second')
      logger.info('system', 'Third')

      expect(logger.getLogCount()).toBe(3)

      logger.clear()

      expect(logger.getLogs()).toHaveLength(0)
    })

    it('getLogCount() returns 0 after clear', () => {
      logger.info('system', 'Message')
      logger.clear()

      expect(logger.getLogCount()).toBe(0)
    })

    it('emits cleared event', () => {
      let cleared = false
      logger.on('cleared', () => {
        cleared = true
      })

      logger.clear()

      expect(cleared).toBe(true)
    })

    it('allows adding new logs after clear', () => {
      logger.info('system', 'Before')
      logger.clear()
      logger.info('system', 'After')

      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].message).toBe('After')
    })
  })

  // ===========================================================================
  // getLogCount
  // ===========================================================================

  describe('getLogCount', () => {
    it('returns 0 for empty logger', () => {
      expect(logger.getLogCount()).toBe(0)
    })

    it('returns correct count after adding logs', () => {
      logger.info('system', 'One')
      logger.info('system', 'Two')
      logger.info('system', 'Three')

      expect(logger.getLogCount()).toBe(3)
    })
  })
})
