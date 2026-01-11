import { logger } from '../../logger'
import { memoryStore } from './store'
import { semanticSearch, generateEmbedding, isModelLoaded, preloadModel } from './vector'
import { rankMemories, getAdaptiveSimilarityFloor, type RankedMemory } from './ranker'
import type { Memory, MemorySearchResult, MemoryLaneType } from './types'

const log = logger.child('memory-injection')

export interface InjectionConfig {
  maxMemories: number
  minSimilarity: number
  maxTokens: number
  timeout: number
}

export const DEFAULT_INJECTION_CONFIG: InjectionConfig = {
  maxMemories: 5,
  minSimilarity: 0.2,
  maxTokens: 2000,
  timeout: 15000
}

export interface InjectionResult {
  memories: RankedMemory[]
  context: string
  metadata: {
    queryTimeMs: number
    memoriesConsidered: number
    memoriesInjected: number
    modelLoaded: boolean
  }
}

interface FeedbackEntry {
  memoryId: string
  sessionId: string
  queryContext: string
  isPositive: boolean
  timestamp: string
}

const feedbackHistory: Map<string, number> = new Map()
const feedbackLog: FeedbackEntry[] = []

export function recordFeedback(
  memoryId: string,
  sessionId: string,
  queryContext: string,
  isPositive: boolean
): void {
  const current = feedbackHistory.get(memoryId) || 0
  feedbackHistory.set(memoryId, current + (isPositive ? 1 : -1))

  feedbackLog.push({
    memoryId,
    sessionId,
    queryContext,
    isPositive,
    timestamp: new Date().toISOString()
  })

  log.debug('Recorded feedback', { memoryId, isPositive, total: feedbackHistory.get(memoryId) })
}

export function getFeedbackHistory(): Map<string, number> {
  return new Map(feedbackHistory)
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function formatMemoryForContext(memory: Memory, similarity: number): string {
  const typeLabel = memory.laneType || memory.type
  const confidencePercent = Math.round(memory.confidence.current * 100)
  const similarityPercent = Math.round(similarity * 100)

  let header = `[${typeLabel.toUpperCase()}] (${similarityPercent}% match, ${confidencePercent}% confidence)`

  if (memory.title) {
    header += `\n${memory.title}`
  }

  const content = memory.content.length > 500
    ? memory.content.substring(0, 500) + '...'
    : memory.content

  return `${header}\n${content}`
}

function buildContextString(memories: RankedMemory[], maxTokens: number): string {
  if (memories.length === 0) return ''

  const lines: string[] = ['<relevant-memories>']
  let totalTokens = estimateTokens(lines[0])

  for (const ranked of memories) {
    const formatted = formatMemoryForContext(ranked.memory, ranked.similarity)
    const tokens = estimateTokens(formatted)

    if (totalTokens + tokens > maxTokens - 30) {
      break
    }

    lines.push('')
    lines.push(formatted)
    totalTokens += tokens + 2
  }

  lines.push('')
  lines.push('</relevant-memories>')

  return lines.join('\n')
}

async function incrementObservation(memoryId: string): Promise<void> {
  const memory = await memoryStore.get(memoryId)
  if (!memory) return

  await memoryStore.update(memoryId, {
    observationCount: (memory.observationCount || 0) + 1,
    lastObserved: new Date().toISOString()
  })
}

export async function injectMemories(
  prompt: string,
  sessionId?: string,
  config: Partial<InjectionConfig> = {}
): Promise<InjectionResult> {
  const cfg = {
    ...DEFAULT_INJECTION_CONFIG,
    ...Object.fromEntries(Object.entries(config).filter(([, v]) => v !== undefined))
  }
  const startTime = Date.now()

  const emptyResult: InjectionResult = {
    memories: [],
    context: '',
    metadata: {
      queryTimeMs: 0,
      memoriesConsidered: 0,
      memoriesInjected: 0,
      modelLoaded: isModelLoaded()
    }
  }

  try {
    if (!prompt || prompt.trim().length < 3) {
      return emptyResult
    }

    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), cfg.timeout)
    )

    const searchPromise = (async () => {
      const allMemories = await memoryStore.getAll()
      if (allMemories.length === 0) {
        return { candidates: [] as MemorySearchResult[], memoriesConsidered: 0 }
      }

      const memoriesWithEmbeddings = allMemories.filter(m => m.embedding && m.embedding.length > 0)

      if (memoriesWithEmbeddings.length === 0) {
        const textResults = await memoryStore.search(prompt, {
          limit: cfg.maxMemories * 2,
          minConfidence: 0.3
        })
        return { candidates: textResults, memoriesConsidered: allMemories.length }
      }

      const similarityFloor = getAdaptiveSimilarityFloor(false, false)
      const candidates = await semanticSearch(prompt, memoriesWithEmbeddings, {
        limit: cfg.maxMemories * 3,
        minSimilarity: Math.min(cfg.minSimilarity, similarityFloor)
      })

      return { candidates, memoriesConsidered: memoriesWithEmbeddings.length }
    })()

    const searchResult = await Promise.race([searchPromise, timeoutPromise])

    if (!searchResult) {
      log.warn('Memory injection timed out', { timeout: cfg.timeout, prompt: prompt.substring(0, 50) })
      emptyResult.metadata.queryTimeMs = Date.now() - startTime
      return emptyResult
    }

    const { candidates, memoriesConsidered } = searchResult

    if (candidates.length === 0) {
      emptyResult.metadata.queryTimeMs = Date.now() - startTime
      emptyResult.metadata.memoriesConsidered = memoriesConsidered
      return emptyResult
    }

    const ranked = await rankMemories(prompt, candidates, feedbackHistory)

    const topMemories = ranked.slice(0, cfg.maxMemories)

    const context = buildContextString(topMemories, cfg.maxTokens)

    for (const mem of topMemories) {
      incrementObservation(mem.memory.id).catch(err =>
        log.error('Failed to increment observation', { error: err })
      )
    }

    const queryTimeMs = Date.now() - startTime

    log.info('Memory injection complete', {
      prompt: prompt.substring(0, 50),
      memoriesConsidered,
      memoriesInjected: topMemories.length,
      queryTimeMs,
      topSimilarity: topMemories[0]?.similarity
    })

    return {
      memories: topMemories,
      context,
      metadata: {
        queryTimeMs,
        memoriesConsidered,
        memoriesInjected: topMemories.length,
        modelLoaded: isModelLoaded()
      }
    }
  } catch (error) {
    log.error('Memory injection failed', { error, prompt: prompt.substring(0, 50) })
    emptyResult.metadata.queryTimeMs = Date.now() - startTime
    return emptyResult
  }
}

export async function warmUp(): Promise<void> {
  log.info('Warming up memory injection service...')
  try {
    await preloadModel()
    await memoryStore.getAll()
    log.info('Memory injection service warmed up')
  } catch (error) {
    log.error('Failed to warm up memory injection service', { error })
  }
}
