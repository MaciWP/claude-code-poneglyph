import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { mkdir } from 'fs/promises'
import { join } from 'path'
import { ClaudeService } from './services/claude'
import { CodexService } from './services/codex'
import { GeminiService } from './services/gemini'
import { SessionStore } from './services/sessions'
import { orchestrator } from './services/orchestrator'
import { agentRegistry } from './services/agent-registry'
import { PromptClassifier } from './services/prompt-classifier'
import { AgentSpawner } from './services/agent-spawner'
import { createOrchestratorAgent } from './services/orchestrator-agent'
import { expertStore } from './services/expert-store'
import { config } from './config'
import { logger } from './logger'
import {
  healthRoutes,
  createSessionRoutes,
  createAgentRoutes,
  memoryRoutes,
  claudeConfigRoutes,
  createClaudeExecuteRoutes,
  createWebSocketRoutes,
  metricsRoutes,
  expertsRoutes,
  learningRoutes,
  multiExpertRoutes,
} from './routes'

const storageDir = join(import.meta.dir, '../storage')
await mkdir(storageDir, { recursive: true })
logger.debug('startup', `Storage directory ensured: ${storageDir}`)

const claude = new ClaudeService()
const codex = new CodexService()
const gemini = new GeminiService()
const sessions = new SessionStore(config.SESSIONS_DIR)

// Cleanup old sessions on startup
try {
  const cleaned = await sessions.cleanupOldSessions(30)
  if (cleaned > 0) {
    logger.info('startup', `Cleaned up ${cleaned} old sessions (>30 days)`)
  }
} catch (err) {
  logger.warn('startup', `Session cleanup failed: ${err}`)
}

// Initialize Lead Orchestrator components
const initializeOrchestrator = async () => {
  const experts = await expertStore.list()
  const classifier = new PromptClassifier({}, experts.map(e => e.id))
  const spawner = new AgentSpawner(claude)
  const leadOrchestrator = createOrchestratorAgent(classifier, spawner)

  // Update classifier with available experts
  leadOrchestrator.updateClassifierExperts(experts.map(e => e.id))

  logger.info('orchestrator', 'Lead Orchestrator initialized', {
    expertsLoaded: experts.length,
    experts: experts.map(e => e.id)
  })

  return leadOrchestrator
}

const leadOrchestrator = await initializeOrchestrator()

const app = new Elysia()
  .use(cors())
  .use(healthRoutes)
  .use(claudeConfigRoutes)
  .use(createSessionRoutes(sessions))
  .use(createClaudeExecuteRoutes(claude, codex, gemini, sessions, orchestrator))
  .use(createAgentRoutes(agentRegistry))
  .use(memoryRoutes)
  .use(metricsRoutes)
  .use(expertsRoutes)
  .use(learningRoutes)
  .use(multiExpertRoutes)
  .use(createWebSocketRoutes(claude, codex, gemini, sessions, orchestrator, agentRegistry, leadOrchestrator))
  .get('/', () => ({
    name: 'Claude Code UI API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      sessions: '/api/sessions',
      execute: '/api/execute',
      executeCli: '/api/execute-cli',
      agents: '/api/agents',
      metrics: '/api/metrics',
      experts: '/api/experts',
      learning: '/api/learning',
      multiExpert: '/api/multi-expert',
      memory: '/api/memory',
      websocket: '/ws',
    },
  }))
  .listen({ port: config.PORT, hostname: config.HOST })

logger.info('startup', `Server running at http://${config.HOST}:${app.server?.port}`, {
  env: config.NODE_ENV,
  logLevel: config.LOG_LEVEL,
})
