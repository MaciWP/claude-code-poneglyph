export * from './types'
export { memoryStore } from './store'
export { generateEmbedding, semanticSearch, cosineSimilarity, preloadModel, isModelLoaded } from './vector'
export * from './confidence'
export * from './temporal'
export { memoryGraph } from './graph'
export * from './agent-memory'
export * from './shared-knowledge'
export { extractFromConversation, extractFromText, extractTags, extractExplicitMemory } from './extractor'
export { runAbstraction, findSimilarMemories, abstractCluster, detectPatterns } from './abstractor'
export {
  checkForTriggers,
  processFeedback,
  handleActiveLearningResponse,
  resetSessionState,
  getSessionStats
} from './active-learning'
import { logger } from '../../logger'

const log = logger.child('Memory')

import { memoryStore } from './store'
import { memoryGraph } from './graph'
import { semanticSearch, generateEmbedding, preloadModel } from './vector'
import { checkForTriggers } from './active-learning'
import { extractFromConversation } from './extractor'
import { runAbstraction } from './abstractor'
import type { Memory, MemorySearchResult, ActiveLearningTrigger, AgentType } from './types'

export interface MemorySystemConfig {
  enableEmbeddings: boolean
  enableActiveLearning: boolean
  enableAutoExtraction: boolean
  preloadEmbeddingModel: boolean
}

const DEFAULT_CONFIG: MemorySystemConfig = {
  enableEmbeddings: true,
  enableActiveLearning: true,
  enableAutoExtraction: true,
  preloadEmbeddingModel: false
}

let systemConfig = { ...DEFAULT_CONFIG }
let initialized = false

export async function initMemorySystem(config: Partial<MemorySystemConfig> = {}): Promise<void> {
  if (initialized) return

  systemConfig = { ...DEFAULT_CONFIG, ...config }

  await memoryStore.init()
  await memoryGraph.init()

  if (systemConfig.preloadEmbeddingModel && systemConfig.enableEmbeddings) {
    try {
      await preloadModel()
    } catch (error) {
      log.warn('Failed to preload embedding model', { error })
    }
  }

  initialized = true
}

export async function searchRelevantMemories(
  query: string,
  options: {
    limit?: number
    agentType?: AgentType
    useSemanticSearch?: boolean
  } = {}
): Promise<MemorySearchResult[]> {
  await initMemorySystem()

  const { limit = 5, useSemanticSearch = systemConfig.enableEmbeddings } = options

  if (useSemanticSearch) {
    try {
      const allMemories = await memoryStore.getAll()
      const filtered = options.agentType
        ? allMemories.filter(m => !m.metadata.agentType || m.metadata.agentType === options.agentType)
        : allMemories

      return await semanticSearch(query, filtered, { limit })
    } catch (error) {
      log.warn('Semantic search failed, falling back to text search', { error })
    }
  }

  return memoryStore.search(query, { limit })
}

export async function extractMemoriesFromConversation(
  turns: Array<{ role: 'user' | 'assistant'; content: string }>,
  options: { sessionId?: string; agentType?: AgentType } = {}
): Promise<Memory[]> {
  if (!systemConfig.enableAutoExtraction) return []

  await initMemorySystem()

  const memories = await extractFromConversation(turns, {
    ...options,
    generateEmbeddings: systemConfig.enableEmbeddings
  })

  return memories
}

export function getMemorySystemStats(): {
  initialized: boolean
  config: MemorySystemConfig
  storeStats: ReturnType<typeof memoryStore.getStats>
  graphStats: ReturnType<typeof memoryGraph.getStats>
} {
  return {
    initialized,
    config: systemConfig,
    storeStats: memoryStore.getStats(),
    graphStats: memoryGraph.getStats()
  }
}
