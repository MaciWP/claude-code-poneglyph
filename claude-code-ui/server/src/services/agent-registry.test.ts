import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import {
  agentRegistry,
  type Agent,
  type AgentType,
  type AgentMetrics,
} from './agent-registry'

describe('AgentRegistry', () => {
  beforeEach(() => {
    agentRegistry.stopCleanup()
    agentRegistry.clearAll()
  })

  afterEach(() => {
    agentRegistry.stopCleanup()
    agentRegistry.clearAll()
    agentRegistry.removeAllListeners()
  })

  describe('createAgent()', () => {
    test('creates agent with pending status', () => {
      const agent = agentRegistry.createAgent({
        type: 'scout',
        sessionId: 'session-1',
        task: 'Explore codebase',
      })

      expect(agent.id).toMatch(/^agent-\d+-[a-z0-9]+$/)
      expect(agent.type).toBe('scout')
      expect(agent.sessionId).toBe('session-1')
      expect(agent.status).toBe('pending')
      expect(agent.task).toBe('Explore codebase')
      expect(agent.createdAt).toBeInstanceOf(Date)
    })

    test('creates agent with parentAgentId for delegation', () => {
      const parentAgent = agentRegistry.createAgent({
        type: 'architect',
        sessionId: 'session-1',
        task: 'Design system',
      })

      const childAgent = agentRegistry.createAgent({
        type: 'builder',
        sessionId: 'session-1',
        task: 'Implement module',
        parentAgentId: parentAgent.id,
      })

      expect(childAgent.parentAgentId).toBe(parentAgent.id)
    })

    test('emits agent:created event', () => {
      let emittedAgent: Agent | null = null
      agentRegistry.on('agent:created', (agent: Agent) => {
        emittedAgent = agent
      })

      const agent = agentRegistry.createAgent({
        type: 'reviewer',
        sessionId: 'session-1',
        task: 'Review code',
      })

      expect(emittedAgent).toBeDefined()
      expect(emittedAgent!.id).toBe(agent.id)
    })

    test('registers agent in session map', () => {
      agentRegistry.createAgent({
        type: 'scout',
        sessionId: 'session-1',
        task: 'Task 1',
      })

      const sessionAgents = agentRegistry.getSessionAgents('session-1')
      expect(sessionAgents.length).toBe(1)
    })
  })

  describe('startAgent()', () => {
    test('sets agent to active status with startedAt timestamp', () => {
      const agent = agentRegistry.createAgent({
        type: 'builder',
        sessionId: 'session-1',
        task: 'Build feature',
      })

      const startedAgent = agentRegistry.startAgent(agent.id)

      expect(startedAgent).toBeDefined()
      expect(startedAgent!.status).toBe('active')
      expect(startedAgent!.startedAt).toBeInstanceOf(Date)
    })

    test('returns null for non-existent agent', () => {
      const result = agentRegistry.startAgent('non-existent-id')
      expect(result).toBeNull()
    })

    test('emits agent:started event', () => {
      let emittedAgent: Agent | null = null
      agentRegistry.on('agent:started', (agent: Agent) => {
        emittedAgent = agent
      })

      const agent = agentRegistry.createAgent({
        type: 'scout',
        sessionId: 'session-1',
        task: 'Explore',
      })
      agentRegistry.startAgent(agent.id)

      expect(emittedAgent).toBeDefined()
      expect(emittedAgent!.status).toBe('active')
    })
  })

  describe('completeAgent()', () => {
    test('sets agent to completed status with result', () => {
      const agent = agentRegistry.createAgent({
        type: 'scout',
        sessionId: 'session-1',
        task: 'Analyze code',
      })
      agentRegistry.startAgent(agent.id)

      const completedAgent = agentRegistry.completeAgent(agent.id, 'Analysis complete', 1500)

      expect(completedAgent).toBeDefined()
      expect(completedAgent!.status).toBe('completed')
      expect(completedAgent!.result).toBe('Analysis complete')
      expect(completedAgent!.tokensUsed).toBe(1500)
      expect(completedAgent!.completedAt).toBeInstanceOf(Date)
    })

    test('returns null for non-existent agent', () => {
      const result = agentRegistry.completeAgent('non-existent-id', 'result')
      expect(result).toBeNull()
    })

    test('emits agent:completed event', () => {
      let emittedAgent: Agent | null = null
      agentRegistry.on('agent:completed', (agent: Agent) => {
        emittedAgent = agent
      })

      const agent = agentRegistry.createAgent({
        type: 'builder',
        sessionId: 'session-1',
        task: 'Build',
      })
      agentRegistry.startAgent(agent.id)
      agentRegistry.completeAgent(agent.id, 'Done')

      expect(emittedAgent).toBeDefined()
      expect(emittedAgent!.status).toBe('completed')
    })
  })

  describe('failAgent()', () => {
    test('sets agent to failed status with error', () => {
      const agent = agentRegistry.createAgent({
        type: 'builder',
        sessionId: 'session-1',
        task: 'Build feature',
      })
      agentRegistry.startAgent(agent.id)

      const failedAgent = agentRegistry.failAgent(agent.id, 'Compilation error')

      expect(failedAgent).toBeDefined()
      expect(failedAgent!.status).toBe('failed')
      expect(failedAgent!.error).toBe('Compilation error')
      expect(failedAgent!.completedAt).toBeInstanceOf(Date)
    })

    test('returns null for non-existent agent', () => {
      const result = agentRegistry.failAgent('non-existent-id', 'error')
      expect(result).toBeNull()
    })

    test('emits agent:failed event', () => {
      let emittedAgent: Agent | null = null
      agentRegistry.on('agent:failed', (agent: Agent) => {
        emittedAgent = agent
      })

      const agent = agentRegistry.createAgent({
        type: 'reviewer',
        sessionId: 'session-1',
        task: 'Review',
      })
      agentRegistry.startAgent(agent.id)
      agentRegistry.failAgent(agent.id, 'Failed')

      expect(emittedAgent).toBeDefined()
      expect(emittedAgent!.status).toBe('failed')
    })
  })

  describe('deleteAgent()', () => {
    test('sets agent status to deleted', () => {
      const agent = agentRegistry.createAgent({
        type: 'scout',
        sessionId: 'session-1',
        task: 'Explore',
      })

      const result = agentRegistry.deleteAgent(agent.id)

      expect(result).toBe(true)
      expect(agentRegistry.getAgent(agent.id)!.status).toBe('deleted')
    })

    test('returns false for non-existent agent', () => {
      const result = agentRegistry.deleteAgent('non-existent-id')
      expect(result).toBe(false)
    })

    test('emits agent:deleted event', () => {
      let emittedAgent: Agent | null = null
      agentRegistry.on('agent:deleted', (agent: Agent) => {
        emittedAgent = agent
      })

      const agent = agentRegistry.createAgent({
        type: 'scout',
        sessionId: 'session-1',
        task: 'Explore',
      })
      agentRegistry.deleteAgent(agent.id)

      expect(emittedAgent).toBeDefined()
      expect(emittedAgent!.status).toBe('deleted')
    })

    test('deleted agents are excluded from getAllAgents', () => {
      const agent1 = agentRegistry.createAgent({
        type: 'scout',
        sessionId: 'session-1',
        task: 'Task 1',
      })
      agentRegistry.createAgent({
        type: 'builder',
        sessionId: 'session-1',
        task: 'Task 2',
      })

      agentRegistry.deleteAgent(agent1.id)

      const allAgents = agentRegistry.getAllAgents()
      expect(allAgents.length).toBe(1)
      expect(allAgents.find(a => a.id === agent1.id)).toBeUndefined()
    })
  })

  describe('getAgent()', () => {
    test('returns agent by id', () => {
      const created = agentRegistry.createAgent({
        type: 'architect',
        sessionId: 'session-1',
        task: 'Design',
      })

      const retrieved = agentRegistry.getAgent(created.id)

      expect(retrieved).toBeDefined()
      expect(retrieved!.id).toBe(created.id)
    })

    test('returns null for non-existent agent', () => {
      const result = agentRegistry.getAgent('non-existent-id')
      expect(result).toBeNull()
    })
  })

  describe('getSessionAgents()', () => {
    test('returns all non-deleted agents for session', () => {
      agentRegistry.createAgent({
        type: 'scout',
        sessionId: 'session-1',
        task: 'Task 1',
      })
      agentRegistry.createAgent({
        type: 'builder',
        sessionId: 'session-1',
        task: 'Task 2',
      })
      agentRegistry.createAgent({
        type: 'reviewer',
        sessionId: 'session-2',
        task: 'Task 3',
      })

      const session1Agents = agentRegistry.getSessionAgents('session-1')
      const session2Agents = agentRegistry.getSessionAgents('session-2')

      expect(session1Agents.length).toBe(2)
      expect(session2Agents.length).toBe(1)
    })

    test('returns empty array for non-existent session', () => {
      const agents = agentRegistry.getSessionAgents('non-existent-session')
      expect(agents).toEqual([])
    })

    test('excludes deleted agents', () => {
      const agent1 = agentRegistry.createAgent({
        type: 'scout',
        sessionId: 'session-1',
        task: 'Task 1',
      })
      agentRegistry.createAgent({
        type: 'builder',
        sessionId: 'session-1',
        task: 'Task 2',
      })

      agentRegistry.deleteAgent(agent1.id)

      const sessionAgents = agentRegistry.getSessionAgents('session-1')
      expect(sessionAgents.length).toBe(1)
    })
  })

  describe('getActiveAgents()', () => {
    test('returns only active agents globally', () => {
      const agent1 = agentRegistry.createAgent({
        type: 'scout',
        sessionId: 'session-1',
        task: 'Task 1',
      })
      const agent2 = agentRegistry.createAgent({
        type: 'builder',
        sessionId: 'session-1',
        task: 'Task 2',
      })
      agentRegistry.createAgent({
        type: 'reviewer',
        sessionId: 'session-1',
        task: 'Task 3',
      })

      agentRegistry.startAgent(agent1.id)
      agentRegistry.startAgent(agent2.id)

      const activeAgents = agentRegistry.getActiveAgents()
      expect(activeAgents.length).toBe(2)
      expect(activeAgents.every(a => a.status === 'active')).toBe(true)
    })

    test('returns only active agents for specific session', () => {
      const agent1 = agentRegistry.createAgent({
        type: 'scout',
        sessionId: 'session-1',
        task: 'Task 1',
      })
      const agent2 = agentRegistry.createAgent({
        type: 'builder',
        sessionId: 'session-2',
        task: 'Task 2',
      })

      agentRegistry.startAgent(agent1.id)
      agentRegistry.startAgent(agent2.id)

      const session1Active = agentRegistry.getActiveAgents('session-1')
      expect(session1Active.length).toBe(1)
      expect(session1Active[0].sessionId).toBe('session-1')
    })
  })

  describe('getAllAgents()', () => {
    test('returns all non-deleted agents', () => {
      agentRegistry.createAgent({
        type: 'scout',
        sessionId: 'session-1',
        task: 'Task 1',
      })
      agentRegistry.createAgent({
        type: 'builder',
        sessionId: 'session-2',
        task: 'Task 2',
      })

      const allAgents = agentRegistry.getAllAgents()
      expect(allAgents.length).toBe(2)
    })

    test('returns empty array when no agents exist', () => {
      const allAgents = agentRegistry.getAllAgents()
      expect(allAgents).toEqual([])
    })
  })

  describe('getMetrics()', () => {
    test('calculates global metrics correctly', () => {
      const agent1 = agentRegistry.createAgent({
        type: 'scout',
        sessionId: 'session-1',
        task: 'Task 1',
      })
      const agent2 = agentRegistry.createAgent({
        type: 'builder',
        sessionId: 'session-1',
        task: 'Task 2',
      })
      const agent3 = agentRegistry.createAgent({
        type: 'reviewer',
        sessionId: 'session-1',
        task: 'Task 3',
      })

      agentRegistry.startAgent(agent1.id)
      agentRegistry.startAgent(agent2.id)
      agentRegistry.startAgent(agent3.id)

      agentRegistry.completeAgent(agent1.id, 'Done', 1000)
      agentRegistry.failAgent(agent2.id, 'Error')

      const metrics = agentRegistry.getMetrics()

      expect(metrics.totalAgents).toBe(3)
      expect(metrics.activeAgents).toBe(1)
      expect(metrics.completedAgents).toBe(1)
      expect(metrics.failedAgents).toBe(1)
      expect(metrics.totalTokens).toBe(1000)
    })

    test('calculates session-specific metrics', () => {
      const agent1 = agentRegistry.createAgent({
        type: 'scout',
        sessionId: 'session-1',
        task: 'Task 1',
      })
      agentRegistry.createAgent({
        type: 'builder',
        sessionId: 'session-2',
        task: 'Task 2',
      })

      agentRegistry.startAgent(agent1.id)
      agentRegistry.completeAgent(agent1.id, 'Done', 500)

      const session1Metrics = agentRegistry.getMetrics('session-1')
      const session2Metrics = agentRegistry.getMetrics('session-2')

      expect(session1Metrics.completedAgents).toBe(1)
      expect(session1Metrics.totalTokens).toBe(500)
      expect(session2Metrics.completedAgents).toBe(0)
    })

    test('calculates delegation rate', () => {
      const parent = agentRegistry.createAgent({
        type: 'architect',
        sessionId: 'session-1',
        task: 'Design',
      })
      agentRegistry.createAgent({
        type: 'builder',
        sessionId: 'session-1',
        task: 'Build 1',
        parentAgentId: parent.id,
      })
      agentRegistry.createAgent({
        type: 'builder',
        sessionId: 'session-1',
        task: 'Build 2',
        parentAgentId: parent.id,
      })

      const metrics = agentRegistry.getMetrics()

      expect(metrics.delegationRate).toBeCloseTo(66.67, 1)
    })

    test('calculates average duration', async () => {
      const agent = agentRegistry.createAgent({
        type: 'scout',
        sessionId: 'session-1',
        task: 'Quick task',
      })
      agentRegistry.startAgent(agent.id)

      await new Promise(resolve => setTimeout(resolve, 50))

      agentRegistry.completeAgent(agent.id, 'Done')

      const metrics = agentRegistry.getMetrics()
      expect(metrics.avgDurationMs).toBeGreaterThanOrEqual(50)
    })

    test('returns zero metrics for empty registry', () => {
      const metrics = agentRegistry.getMetrics()

      expect(metrics.totalAgents).toBe(0)
      expect(metrics.activeAgents).toBe(0)
      expect(metrics.completedAgents).toBe(0)
      expect(metrics.failedAgents).toBe(0)
      expect(metrics.delegationRate).toBe(0)
      expect(metrics.avgDurationMs).toBe(0)
      expect(metrics.totalTokens).toBe(0)
    })
  })

  describe('getSessionStats()', () => {
    test('returns session stats with agents and metrics', () => {
      const agent = agentRegistry.createAgent({
        type: 'scout',
        sessionId: 'session-1',
        task: 'Explore',
      })
      agentRegistry.startAgent(agent.id)
      agentRegistry.completeAgent(agent.id, 'Found code', 800)

      const stats = agentRegistry.getSessionStats('session-1')

      expect(stats.sessionId).toBe('session-1')
      expect(stats.agents.length).toBe(1)
      expect(stats.metrics.completedAgents).toBe(1)
      expect(stats.metrics.totalTokens).toBe(800)
    })
  })

  describe('clearSession()', () => {
    test('marks all session agents as deleted', () => {
      agentRegistry.createAgent({
        type: 'scout',
        sessionId: 'session-1',
        task: 'Task 1',
      })
      agentRegistry.createAgent({
        type: 'builder',
        sessionId: 'session-1',
        task: 'Task 2',
      })
      agentRegistry.createAgent({
        type: 'reviewer',
        sessionId: 'session-2',
        task: 'Task 3',
      })

      const cleared = agentRegistry.clearSession('session-1')

      expect(cleared).toBe(2)
      expect(agentRegistry.getSessionAgents('session-1').length).toBe(0)
      expect(agentRegistry.getSessionAgents('session-2').length).toBe(1)
    })

    test('returns 0 for non-existent session', () => {
      const cleared = agentRegistry.clearSession('non-existent-session')
      expect(cleared).toBe(0)
    })

    test('emits session:cleared event', () => {
      let emittedSessionId = ''
      agentRegistry.on('session:cleared', (sessionId: string) => {
        emittedSessionId = sessionId
      })

      agentRegistry.createAgent({
        type: 'scout',
        sessionId: 'session-1',
        task: 'Task',
      })
      agentRegistry.clearSession('session-1')

      expect(emittedSessionId).toBe('session-1')
    })
  })

  describe('clearAll()', () => {
    test('clears all agents and returns count', () => {
      agentRegistry.createAgent({
        type: 'scout',
        sessionId: 'session-1',
        task: 'Task 1',
      })
      agentRegistry.createAgent({
        type: 'builder',
        sessionId: 'session-2',
        task: 'Task 2',
      })

      const cleared = agentRegistry.clearAll()

      expect(cleared).toBe(2)
      expect(agentRegistry.getAllAgents().length).toBe(0)
    })

    test('emits registry:cleared event', () => {
      let eventEmitted = false
      agentRegistry.on('registry:cleared', () => {
        eventEmitted = true
      })

      agentRegistry.createAgent({
        type: 'scout',
        sessionId: 'session-1',
        task: 'Task',
      })
      agentRegistry.clearAll()

      expect(eventEmitted).toBe(true)
    })
  })

  describe('cleanup', () => {
    test('startCleanup prevents multiple intervals', () => {
      agentRegistry.startCleanup()
      agentRegistry.startCleanup()
      agentRegistry.stopCleanup()
    })

    test('stopCleanup clears interval', () => {
      agentRegistry.startCleanup()
      agentRegistry.stopCleanup()
      agentRegistry.stopCleanup()
    })
  })
})
