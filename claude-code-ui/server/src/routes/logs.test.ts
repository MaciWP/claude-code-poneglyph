import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'
import { Elysia } from 'elysia'

// =============================================================================
// MOCK LOGGER
// =============================================================================

const mockLogs = [
  {
    id: 'log-1',
    timestamp: '2024-01-01T00:00:00.000Z',
    level: 'info',
    source: 'system',
    message: 'Test log 1',
  },
  {
    id: 'log-2',
    timestamp: '2024-01-01T00:01:00.000Z',
    level: 'error',
    source: 'agent',
    message: 'Test log 2',
  },
  {
    id: 'log-3',
    timestamp: '2024-01-01T00:02:00.000Z',
    level: 'warn',
    source: 'orchestrator',
    message: 'Test log 3',
  },
]

let currentMockLogs = [...mockLogs]

const mockLogger = {
  getLogs: mock((filters?: Record<string, unknown>) => {
    let result = [...currentMockLogs]

    if (filters?.level) {
      const levelPriority: Record<string, number> = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
      }
      const minPriority = levelPriority[filters.level as string]
      result = result.filter(
        (entry) => levelPriority[entry.level] >= minPriority
      )
    }

    if (filters?.source) {
      result = result.filter((entry) => entry.source === filters.source)
    }

    if (filters?.offset && typeof filters.offset === 'number') {
      result = result.slice(filters.offset)
    }

    if (filters?.limit && typeof filters.limit === 'number') {
      result = result.slice(0, filters.limit)
    }

    return result
  }),
  getLogCount: mock(() => currentMockLogs.length),
  clear: mock(() => {
    currentMockLogs = []
  }),
  exportLogs: mock((format: 'json' | 'text') => {
    if (format === 'json') {
      return JSON.stringify(currentMockLogs, null, 2)
    }
    return currentMockLogs
      .map(
        (entry) =>
          `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.source}] ${entry.message}`
      )
      .join('\n')
  }),
}

mock.module('../services/logger', () => ({
  logger: mockLogger,
}))

// Import after mocking
const { logsRoutes } = require('./logs')

// =============================================================================
// TEST UTILITIES
// =============================================================================

function createTestApp() {
  return new Elysia().use(logsRoutes)
}

// =============================================================================
// TESTS
// =============================================================================

describe('Logs Routes', () => {
  let app: ReturnType<typeof createTestApp>
  let server: ReturnType<typeof app.listen> | null = null
  let baseUrl: string

  beforeEach(() => {
    // Reset mock logs
    currentMockLogs = [...mockLogs]

    // Reset all mocks
    mockLogger.getLogs.mockClear()
    mockLogger.getLogCount.mockClear()
    mockLogger.clear.mockClear()
    mockLogger.exportLogs.mockClear()

    app = createTestApp()
    server = app.listen({ port: 0 })
    baseUrl = `http://localhost:${server.server?.port}`
  })

  afterEach(() => {
    server?.stop()
    server = null
  })

  // ---------------------------------------------------------------------------
  // GET /api/logs
  // ---------------------------------------------------------------------------
  describe('GET /api/logs', () => {
    test('should return array of logs', async () => {
      const response = await fetch(`${baseUrl}/api/logs`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.logs).toBeInstanceOf(Array)
      expect(data.logs.length).toBe(3)
      expect(data.count).toBe(3)
      expect(mockLogger.getLogs).toHaveBeenCalled()
    })

    test('should accept level filter', async () => {
      const response = await fetch(`${baseUrl}/api/logs?level=error`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockLogger.getLogs).toHaveBeenCalled()
      // Filter should only return error level logs
      expect(data.logs.every((log: { level: string }) => log.level === 'error')).toBe(true)
    })

    test('should accept source filter', async () => {
      const response = await fetch(`${baseUrl}/api/logs?source=agent`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockLogger.getLogs).toHaveBeenCalled()
      expect(data.logs.every((log: { source: string }) => log.source === 'agent')).toBe(true)
    })

    test('should accept limit filter', async () => {
      const response = await fetch(`${baseUrl}/api/logs?limit=2`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.logs.length).toBe(2)
      expect(mockLogger.getLogs).toHaveBeenCalled()
    })

    test('should accept offset filter', async () => {
      const response = await fetch(`${baseUrl}/api/logs?offset=1`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.logs.length).toBe(2)
      expect(mockLogger.getLogs).toHaveBeenCalled()
    })

    test('should return empty array when no logs', async () => {
      currentMockLogs = []

      const response = await fetch(`${baseUrl}/api/logs`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.logs).toEqual([])
      expect(data.count).toBe(0)
    })

    test('should combine multiple filters', async () => {
      const response = await fetch(`${baseUrl}/api/logs?level=info&limit=1`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockLogger.getLogs).toHaveBeenCalled()
      expect(data.logs.length).toBeLessThanOrEqual(1)
    })

    test('should handle getLogs errors gracefully', async () => {
      mockLogger.getLogs.mockImplementationOnce(() => {
        throw new Error('Database error')
      })

      const response = await fetch(`${baseUrl}/api/logs`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.error).toBe('Failed to retrieve logs')
      expect(data.details).toBe('Database error')
    })
  })

  // ---------------------------------------------------------------------------
  // GET /api/logs/count
  // ---------------------------------------------------------------------------
  describe('GET /api/logs/count', () => {
    test('should return total count', async () => {
      const response = await fetch(`${baseUrl}/api/logs/count`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.count).toBe(3)
      expect(mockLogger.getLogCount).toHaveBeenCalled()
    })

    test('should return 0 when empty', async () => {
      mockLogger.getLogCount.mockReturnValueOnce(0)

      const response = await fetch(`${baseUrl}/api/logs/count`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.count).toBe(0)
    })

    test('should handle getLogCount errors gracefully', async () => {
      mockLogger.getLogCount.mockImplementationOnce(() => {
        throw new Error('Count error')
      })

      const response = await fetch(`${baseUrl}/api/logs/count`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.error).toBe('Failed to get log count')
      expect(data.details).toBe('Count error')
    })
  })

  // ---------------------------------------------------------------------------
  // POST /api/logs/clear
  // ---------------------------------------------------------------------------
  describe('POST /api/logs/clear', () => {
    test('should require confirm: true in body', async () => {
      const response = await fetch(`${baseUrl}/api/logs/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: false }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Confirmation required')
      expect(data.details).toContain('confirm: true')
      expect(mockLogger.clear).not.toHaveBeenCalled()
    })

    test('should fail with 422 if confirm is missing', async () => {
      const response = await fetch(`${baseUrl}/api/logs/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(422)
      expect(mockLogger.clear).not.toHaveBeenCalled()
    })

    test('should clear logs successfully with confirm: true', async () => {
      const response = await fetch(`${baseUrl}/api/logs/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(data.message).toContain('cleared')
      expect(mockLogger.clear).toHaveBeenCalled()
    })

    test('should handle clear errors gracefully', async () => {
      mockLogger.clear.mockImplementationOnce(() => {
        throw new Error('Clear failed')
      })

      const response = await fetch(`${baseUrl}/api/logs/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to clear logs')
      expect(data.details).toBe('Clear failed')
    })
  })

  // ---------------------------------------------------------------------------
  // GET /api/logs/export
  // ---------------------------------------------------------------------------
  describe('GET /api/logs/export', () => {
    test('should export as json by default', async () => {
      const response = await fetch(`${baseUrl}/api/logs/export`)

      expect(response.status).toBe(200)
      expect(mockLogger.exportLogs).toHaveBeenCalledWith('json')

      const contentType = response.headers.get('Content-Type')
      expect(contentType).toContain('application/json')

      const contentDisposition = response.headers.get('Content-Disposition')
      expect(contentDisposition).toContain('attachment')
      expect(contentDisposition).toContain('.json')
    })

    test('should export as json when format=json', async () => {
      const response = await fetch(`${baseUrl}/api/logs/export?format=json`)

      expect(response.status).toBe(200)
      expect(mockLogger.exportLogs).toHaveBeenCalledWith('json')

      const contentType = response.headers.get('Content-Type')
      expect(contentType).toContain('application/json')
    })

    test('should export as text when format=text', async () => {
      const response = await fetch(`${baseUrl}/api/logs/export?format=text`)

      expect(response.status).toBe(200)
      expect(mockLogger.exportLogs).toHaveBeenCalledWith('text')

      const contentType = response.headers.get('Content-Type')
      expect(contentType).toContain('text/plain')

      const contentDisposition = response.headers.get('Content-Disposition')
      expect(contentDisposition).toContain('.txt')
    })

    test('should have correct download headers', async () => {
      const response = await fetch(`${baseUrl}/api/logs/export`)

      const contentDisposition = response.headers.get('Content-Disposition')
      expect(contentDisposition).toContain('attachment')
      expect(contentDisposition).toContain('filename=')
      expect(contentDisposition).toContain('logs-')
    })

    test('should handle export errors gracefully', async () => {
      mockLogger.exportLogs.mockImplementationOnce(() => {
        throw new Error('Export failed')
      })

      const response = await fetch(`${baseUrl}/api/logs/export`)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to export logs')
      expect(data.details).toBe('Export failed')
    })

    test('should return proper content for json format', async () => {
      const response = await fetch(`${baseUrl}/api/logs/export?format=json`)
      const content = await response.text()

      expect(response.status).toBe(200)
      // Should be valid JSON
      expect(() => JSON.parse(content)).not.toThrow()
    })

    test('should return proper content for text format', async () => {
      const response = await fetch(`${baseUrl}/api/logs/export?format=text`)
      const content = await response.text()

      expect(response.status).toBe(200)
      // Should contain log format elements
      expect(content).toContain('[')
      expect(content).toContain(']')
    })
  })
})
