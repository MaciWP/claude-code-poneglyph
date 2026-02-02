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
import { setAgentSpawner } from './services/workflow-executor'
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
  logsRoutes,
  stopCleanupInterval,
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
  const { deleted, failed } = await sessions.cleanupOldSessions(30)
  if (deleted > 0 || failed > 0) {
    logger.info('startup', `Session cleanup: ${deleted} deleted, ${failed} failed (>30 days)`)
  }
} catch (err) {
  logger.warn('startup', `Session cleanup failed: ${err}`)
}

// Initialize Lead Orchestrator components
const initializeOrchestrator = async () => {
  const experts = await expertStore.list()
  const classifier = new PromptClassifier({}, experts.map(e => e.id))
  const spawner = new AgentSpawner(claude)
  
  // Configure workflow executor with agent spawner
  setAgentSpawner(spawner)
  
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
  .use(logsRoutes)
  .use(createWebSocketRoutes(claude, codex, gemini, sessions, orchestrator, agentRegistry, leadOrchestrator))
  .get('/', () => ({
    name: 'Claude Code UI API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      sessions: '/api/sessions',
      sessionsExport: '/api/sessions/:id/export',
      sessionsImport: '/api/sessions/import',
      sessionsSummarize: '/api/sessions/:id/summarize',
      execute: '/api/execute',
      executeCli: '/api/execute-cli',
      agents: '/api/agents',
      metrics: '/api/metrics',
      experts: '/api/experts',
      learning: '/api/learning',
      multiExpert: '/api/multi-expert',
      memory: '/api/memory',
      logs: '/api/logs',
      websocket: '/ws',
    },
  }))
  .listen({ port: config.PORT, hostname: config.HOST })

logger.info('startup', `Server running at http://${config.HOST}:${app.server?.port}`, {
  env: config.NODE_ENV,
  logLevel: config.LOG_LEVEL,
})

// Graceful shutdown
const shutdown = () => {
  logger.info('shutdown', 'Received shutdown signal, cleaning up...')
  stopCleanupInterval()
  app.stop()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
