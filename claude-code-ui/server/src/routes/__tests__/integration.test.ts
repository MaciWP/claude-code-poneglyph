import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test'
import { Elysia } from 'elysia'
import { tmpdir } from 'os'
import { join } from 'path'
import { existsSync, rmSync } from 'fs'

import { healthRoutes } from '../health'
import { createSessionRoutes } from '../sessions'
import { createAgentRoutes } from '../agents'
import { claudeConfigRoutes } from '../claude-config'
import { memoryRoutes } from '../memory'
import { SessionStore } from '../../services/sessions'
import { agentRegistry } from '../../services/agent-registry'
import { toErrorResponse, getStatusCode } from '../../errors'

const createTempDir = (): string => {
  return join(tmpdir(), `integration-test-${crypto.randomUUID()}`)
}

// Helper type para Elysia app con rutas
type AppWithRoutes = ReturnType<typeof createTestApp>

function createTestApp(sessionStore: SessionStore) {
  return new Elysia()
    .onError(({ error, set }) => {
      const statusCode = getStatusCode(error)
      set.status = statusCode
      return toErrorResponse(error)
    })
    .use(healthRoutes)
    .use(claudeConfigRoutes)
    .use(createSessionRoutes(sessionStore))
    .use(createAgentRoutes(agentRegistry))
    .use(memoryRoutes)
}

describe('API Integration Tests', () => {
  let app: AppWithRoutes
  let sessionsDir: string
  let sessionStore: SessionStore

  beforeAll(() => {
    sessionsDir = createTempDir()
    sessionStore = new SessionStore(sessionsDir)
    app = createTestApp(sessionStore)
  })

  afterAll(() => {
    if (existsSync(sessionsDir)) {
      rmSync(sessionsDir, { recursive: true })
    }
  })

  describe('GET /api/health', () => {
    test('returns 200 with status ok', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/health')
      )

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.status).toBe('ok')
      expect(data.timestamp).toBeDefined()
    })

    test('timestamp is valid ISO string', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/health')
      )

      const data = await response.json()
      const parsed = new Date(data.timestamp)
      expect(parsed.toISOString()).toBe(data.timestamp)
    })
  })

  describe('Sessions API', () => {
    describe('GET /api/sessions', () => {
      test('returns empty array initially', async () => {
        const response = await app.handle(
          new Request('http://localhost/api/sessions')
        )

        expect(response.status).toBe(200)

        const data = await response.json()
        expect(Array.isArray(data)).toBe(true)
      })
    })

    describe('POST /api/sessions', () => {
      test('creates session with default values', async () => {
        const response = await app.handle(
          new Request('http://localhost/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          })
        )

        expect(response.status).toBe(200)

        const session = await response.json()
        expect(session.id).toBeDefined()
        expect(session.id.length).toBe(36)
        expect(session.messages).toEqual([])
        expect(session.createdAt).toBeDefined()
        expect(session.updatedAt).toBeDefined()
      })

      test('creates session with custom name', async () => {
        const response = await app.handle(
          new Request('http://localhost/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Test Session' })
          })
        )

        expect(response.status).toBe(200)

        const session = await response.json()
        expect(session.name).toBe('Test Session')
      })

      test('creates session with custom workDir', async () => {
        const response = await app.handle(
          new Request('http://localhost/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Work Dir Test', workDir: '/custom/path' })
          })
        )

        expect(response.status).toBe(200)

        const session = await response.json()
        expect(session.workDir).toBe('/custom/path')
      })
    })

    describe('GET /api/sessions/:id', () => {
      test('returns session by ID', async () => {
        const createResponse = await app.handle(
          new Request('http://localhost/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Retrievable Session' })
          })
        )
        const created = await createResponse.json()

        const response = await app.handle(
          new Request(`http://localhost/api/sessions/${created.id}`)
        )

        expect(response.status).toBe(200)

        const session = await response.json()
        expect(session.id).toBe(created.id)
        expect(session.name).toBe('Retrievable Session')
      })

      test('returns 404 for non-existent session', async () => {
        const response = await app.handle(
          new Request('http://localhost/api/sessions/non-existent-id')
        )

        expect(response.status).toBe(404)
      })
    })

    describe('DELETE /api/sessions/:id', () => {
      test('deletes session successfully', async () => {
        const createResponse = await app.handle(
          new Request('http://localhost/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'To Delete' })
          })
        )
        const created = await createResponse.json()

        const deleteResponse = await app.handle(
          new Request(`http://localhost/api/sessions/${created.id}`, {
            method: 'DELETE'
          })
        )

        expect(deleteResponse.status).toBe(200)

        const result = await deleteResponse.json()
        expect(result.ok).toBe(true)

        const getResponse = await app.handle(
          new Request(`http://localhost/api/sessions/${created.id}`)
        )
        expect(getResponse.status).toBe(404)
      })
    })

    describe('DELETE /api/sessions', () => {
      test('deletes all sessions', async () => {
        await app.handle(
          new Request('http://localhost/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Batch Delete 1' })
          })
        )
        await app.handle(
          new Request('http://localhost/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Batch Delete 2' })
          })
        )

        const deleteResponse = await app.handle(
          new Request('http://localhost/api/sessions', {
            method: 'DELETE'
          })
        )

        expect(deleteResponse.status).toBe(200)

        const result = await deleteResponse.json()
        expect(result.ok).toBe(true)
        expect(result.deleted).toBeGreaterThanOrEqual(2)

        const listResponse = await app.handle(
          new Request('http://localhost/api/sessions')
        )
        const sessions = await listResponse.json()
        expect(sessions).toEqual([])
      })
    })
  })

  describe('Agents API', () => {
    beforeEach(() => {
      agentRegistry.clearAll()
    })

    describe('GET /api/agents', () => {
      test('returns agents list with metrics', async () => {
        const response = await app.handle(
          new Request('http://localhost/api/agents')
        )

        expect(response.status).toBe(200)

        const data = await response.json()
        expect(data.agents).toBeDefined()
        expect(Array.isArray(data.agents)).toBe(true)
        expect(data.metrics).toBeDefined()
      })

      test('returns registered agents', async () => {
        const agent = agentRegistry.createAgent({
          type: 'scout',
          sessionId: 'session-1',
          task: 'Explore codebase'
        })
        agentRegistry.startAgent(agent.id)

        const response = await app.handle(
          new Request('http://localhost/api/agents')
        )

        const data = await response.json()
        expect(data.agents.length).toBe(1)
        expect(data.agents[0].type).toBe('scout')
      })
    })

    describe('GET /api/agents/active', () => {
      test('returns only active agents', async () => {
        const activeAgent = agentRegistry.createAgent({
          type: 'builder',
          sessionId: 'session-1',
          task: 'Build feature'
        })
        agentRegistry.startAgent(activeAgent.id)

        const completedAgent = agentRegistry.createAgent({
          type: 'reviewer',
          sessionId: 'session-1',
          task: 'Review code'
        })
        agentRegistry.startAgent(completedAgent.id)
        agentRegistry.completeAgent(completedAgent.id, 'Review done')

        const response = await app.handle(
          new Request('http://localhost/api/agents/active')
        )

        expect(response.status).toBe(200)

        const agents = await response.json()
        expect(agents.length).toBe(1)
        expect(agents[0].id).toBe(activeAgent.id)
      })
    })

    describe('GET /api/agents/session/:sessionId', () => {
      test('returns session stats', async () => {
        const agent = agentRegistry.createAgent({
          type: 'architect',
          sessionId: 'test-session',
          task: 'Design system'
        })
        agentRegistry.startAgent(agent.id)
        agentRegistry.completeAgent(agent.id, 'Design done')

        const response = await app.handle(
          new Request('http://localhost/api/agents/session/test-session')
        )

        expect(response.status).toBe(200)

        const stats = await response.json()
        expect(stats.sessionId).toBe('test-session')
        expect(stats.agents).toBeDefined()
        expect(stats.metrics).toBeDefined()
      })
    })

    describe('GET /api/agents/:id', () => {
      test('returns agent by ID', async () => {
        const agent = agentRegistry.createAgent({
          type: 'scout',
          sessionId: 'session-1',
          task: 'Document bug'
        })
        agentRegistry.startAgent(agent.id)

        const response = await app.handle(
          new Request(`http://localhost/api/agents/${agent.id}`)
        )

        expect(response.status).toBe(200)

        const returnedAgent = await response.json()
        expect(returnedAgent.id).toBe(agent.id)
        expect(returnedAgent.type).toBe('scout')
      })

      test('returns 404 for non-existent agent', async () => {
        const response = await app.handle(
          new Request('http://localhost/api/agents/non-existent')
        )

        expect(response.status).toBe(404)
      })
    })

    describe('POST /api/agents/:id/complete', () => {
      test('marks agent as completed', async () => {
        const agent = agentRegistry.createAgent({
          type: 'refactor-agent',
          sessionId: 'session-1',
          task: 'Refactor code'
        })
        agentRegistry.startAgent(agent.id)

        const response = await app.handle(
          new Request(`http://localhost/api/agents/${agent.id}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              result: 'Refactoring completed',
              tokensUsed: 1500
            })
          })
        )

        expect(response.status).toBe(200)

        const returnedAgent = await response.json()
        expect(returnedAgent.status).toBe('completed')
        expect(returnedAgent.result).toBe('Refactoring completed')
        expect(returnedAgent.tokensUsed).toBe(1500)
      })

      test('returns 404 for non-existent agent', async () => {
        const response = await app.handle(
          new Request('http://localhost/api/agents/non-existent/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ result: 'Done' })
          })
        )

        expect(response.status).toBe(404)
      })
    })

    describe('POST /api/agents/:id/fail', () => {
      test('marks agent as failed', async () => {
        const agent = agentRegistry.createAgent({
          type: 'code-quality',
          sessionId: 'session-1',
          task: 'Check quality'
        })
        agentRegistry.startAgent(agent.id)

        const response = await app.handle(
          new Request(`http://localhost/api/agents/${agent.id}/fail`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Connection timeout' })
          })
        )

        expect(response.status).toBe(200)

        const returnedAgent = await response.json()
        expect(returnedAgent.status).toBe('failed')
        expect(returnedAgent.error).toBe('Connection timeout')
      })
    })

    describe('DELETE /api/agents/:id', () => {
      test('deletes agent and marks status as deleted', async () => {
        const agent = agentRegistry.createAgent({
          type: 'scout',
          sessionId: 'session-1',
          task: 'Decompose task'
        })
        agentRegistry.startAgent(agent.id)
        agentRegistry.completeAgent(agent.id, 'Done')

        const response = await app.handle(
          new Request(`http://localhost/api/agents/${agent.id}`, {
            method: 'DELETE'
          })
        )

        expect(response.status).toBe(200)

        const result = await response.json()
        expect(result.ok).toBe(true)

        const getResponse = await app.handle(
          new Request(`http://localhost/api/agents/${agent.id}`)
        )
        const deletedAgent = await getResponse.json()
        expect(deletedAgent.status).toBe('deleted')
      })

      test('returns 404 for non-existent agent', async () => {
        const response = await app.handle(
          new Request('http://localhost/api/agents/non-existent-id', {
            method: 'DELETE'
          })
        )

        expect(response.status).toBe(404)
      })
    })

    describe('DELETE /api/agents/session/:sessionId', () => {
      test('clears session agents', async () => {
        const agent1 = agentRegistry.createAgent({
          type: 'scout',
          sessionId: 'clear-session',
          task: 'Explore'
        })
        agentRegistry.startAgent(agent1.id)
        agentRegistry.completeAgent(agent1.id, 'Done')

        const agent2 = agentRegistry.createAgent({
          type: 'builder',
          sessionId: 'clear-session',
          task: 'Build'
        })
        agentRegistry.startAgent(agent2.id)
        agentRegistry.completeAgent(agent2.id, 'Done')

        const response = await app.handle(
          new Request('http://localhost/api/agents/session/clear-session', {
            method: 'DELETE'
          })
        )

        expect(response.status).toBe(200)

        const result = await response.json()
        expect(result.ok).toBe(true)
        expect(result.deleted).toBe(2)
      })
    })
  })

  describe('Claude Config API', () => {
    describe('GET /api/claude-config', () => {
      test('returns config with agents, skills, and commands', async () => {
        const response = await app.handle(
          new Request('http://localhost/api/claude-config')
        )

        expect(response.status).toBe(200)

        const config = await response.json()
        expect(config.agents).toBeDefined()
        expect(Array.isArray(config.agents)).toBe(true)
        expect(config.skills).toBeDefined()
        expect(Array.isArray(config.skills)).toBe(true)
        expect(config.commands).toBeDefined()
        expect(Array.isArray(config.commands)).toBe(true)
      })
    })
  })

  describe('Memory API', () => {
    describe('GET /api/memory', () => {
      test('returns memories with count', async () => {
        const response = await app.handle(
          new Request('http://localhost/api/memory')
        )

        expect(response.status).toBe(200)

        const data = await response.json()
        expect(data.memories).toBeDefined()
        expect(Array.isArray(data.memories)).toBe(true)
        expect(typeof data.count).toBe('number')
      })
    })

    describe('GET /api/memory/stats', () => {
      test('returns memory system stats', async () => {
        const response = await app.handle(
          new Request('http://localhost/api/memory/stats')
        )

        expect(response.status).toBe(200)

        const stats = await response.json()
        expect(stats).toBeDefined()
      })
    })

    describe('POST /api/memory/search', () => {
      test('searches memories with query', async () => {
        const response = await app.handle(
          new Request('http://localhost/api/memory/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: 'test query',
              limit: 5
            })
          })
        )

        expect(response.status).toBe(200)

        const data = await response.json()
        expect(data.results).toBeDefined()
        expect(Array.isArray(data.results)).toBe(true)
      })
    })

    describe('POST /api/memory/feedback', () => {
      test('accepts positive feedback', async () => {
        const response = await app.handle(
          new Request('http://localhost/api/memory/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              memoryId: 'test-memory-id',
              type: 'positive',
              context: 'helpful response',
              sessionId: 'test-session'
            })
          })
        )

        expect(response.status).toBe(200)

        const result = await response.json()
        expect(result.ok).toBe(true)
      })

      test('accepts negative feedback', async () => {
        const response = await app.handle(
          new Request('http://localhost/api/memory/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              memoryId: 'test-memory-id',
              type: 'negative'
            })
          })
        )

        expect(response.status).toBe(200)

        const result = await response.json()
        expect(result.ok).toBe(true)
      })
    })
  })
})
