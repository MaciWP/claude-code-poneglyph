import { logger } from '../../logger'
import { memoryStore } from './store'
import { generateEmbedding } from './vector'
import { cosineSimilarity } from './vector'
import { extractSurpriseMemories, extractFromText } from './extractor'
import {
  getLatestTranscripts,
  watchTranscripts,
  type ParsedSession,
  type TranscriptWatcher
} from './transcript-parser'
import type { MemoryLaneType } from './types'

const log = logger.child('memory-catcher')

export interface CatcherConfig {
  intervalMs: number
  deduplicationThreshold: number
  minConfidence: number
  generateEmbeddings: boolean
  maxEntriesPerSession: number
}

export const DEFAULT_CATCHER_CONFIG: CatcherConfig = {
  intervalMs: 15 * 60 * 1000,
  deduplicationThreshold: 0.9,
  minConfidence: 0.5,
  generateEmbeddings: true,
  maxEntriesPerSession: 1000
}

interface CatcherStats {
  sessionsProcessed: number
  memoriesExtracted: number
  memoriesDeduplicated: number
  lastRun: Date | null
  errors: number
}

export class MemoryCatcher {
  private interval: ReturnType<typeof setInterval> | null = null
  private watcher: TranscriptWatcher | null = null
  private lastProcessedTimestamp: Date | null = null
  private config: CatcherConfig
  private stats: CatcherStats = {
    sessionsProcessed: 0,
    memoriesExtracted: 0,
    memoriesDeduplicated: 0,
    lastRun: null,
    errors: 0
  }

  constructor(config: Partial<CatcherConfig> = {}) {
    this.config = { ...DEFAULT_CATCHER_CONFIG, ...config }
  }

  start(): void {
    if (this.interval) {
      log.warn('Memory catcher already running')
      return
    }

    log.info('Starting memory catcher', { intervalMs: this.config.intervalMs })

    this.catchMemories().catch(err => {
      log.error('Initial memory catch failed', { error: err })
    })

    this.interval = setInterval(() => {
      this.catchMemories().catch(err => {
        log.error('Memory catch failed', { error: err })
        this.stats.errors++
      })
    }, this.config.intervalMs)
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
      log.info('Memory catcher stopped')
    }

    if (this.watcher) {
      this.watcher.stop()
      this.watcher = null
    }
  }

  startWatching(): void {
    if (this.watcher) {
      log.warn('Transcript watcher already running')
      return
    }

    log.info('Starting transcript watcher')

    this.watcher = watchTranscripts(async (sessionId, entries, projectPath) => {
      try {
        await this.processSession({
          sessionId,
          projectPath,
          entries,
          lastModified: new Date()
        })
      } catch (error) {
        log.error('Failed to process watched session', { sessionId, error })
        this.stats.errors++
      }
    })
  }

  async catchMemories(): Promise<void> {
    const startTime = Date.now()
    log.info('Starting memory catch', { since: this.lastProcessedTimestamp?.toISOString() })

    try {
      const sessions = await getLatestTranscripts(this.lastProcessedTimestamp ?? undefined)

      for (const session of sessions) {
        await this.processSession(session)
      }

      this.lastProcessedTimestamp = new Date()
      this.stats.lastRun = this.lastProcessedTimestamp

      const duration = Date.now() - startTime
      log.info('Memory catch complete', {
        sessionsProcessed: sessions.length,
        durationMs: duration,
        totalExtracted: this.stats.memoriesExtracted,
        totalDeduplicated: this.stats.memoriesDeduplicated
      })
    } catch (error) {
      log.error('Memory catch failed', { error })
      this.stats.errors++
      throw error
    }
  }

  private async processSession(session: ParsedSession): Promise<void> {
    const { sessionId, entries } = session

    if (entries.length === 0) {
      return
    }

    const limitedEntries = entries.slice(-this.config.maxEntriesPerSession)

    log.debug('Processing session', {
      sessionId,
      entriesCount: limitedEntries.length,
      originalCount: entries.length
    })

    const extractedMemories: Array<{
      content: string
      type: 'semantic' | 'episodic' | 'procedural'
      laneType?: MemoryLaneType
      confidence: number
      tags: string[]
      reason: string
      title?: string
      sourceChunk?: string
    }> = []

    for (let i = 0; i < limitedEntries.length; i++) {
      const entry = limitedEntries[i]

      if (entry.type === 'tool_use' || entry.type === 'tool_result') {
        continue
      }

      const role = entry.type === 'user' ? 'user' : 'assistant'
      const previousEntry = i > 0 ? limitedEntries[i - 1] : null
      const previousContent = previousEntry?.content

      const surpriseResults = extractSurpriseMemories(entry.content, role, previousContent)
      for (const result of surpriseResults) {
        extractedMemories.push({
          content: result.content,
          type: result.type,
          laneType: result.laneType,
          confidence: result.confidence,
          tags: result.tags,
          reason: result.reason,
          title: result.title,
          sourceChunk: result.sourceChunk
        })
      }

      const basicResults = extractFromText(entry.content, role, previousContent)
      for (const result of basicResults) {
        extractedMemories.push({
          content: result.content,
          type: result.type,
          laneType: result.laneType,
          confidence: result.confidence,
          tags: result.tags,
          reason: result.reason,
          title: result.title,
          sourceChunk: result.sourceChunk
        })
      }
    }

    if (extractedMemories.length === 0) {
      return
    }

    const filtered = extractedMemories.filter(m => m.confidence >= this.config.minConfidence)

    log.debug('Extracted memories before deduplication', {
      sessionId,
      total: extractedMemories.length,
      afterConfidenceFilter: filtered.length
    })

    for (const extracted of filtered) {
      const isDuplicate = await this.isDuplicateMemory(extracted.content)

      if (isDuplicate) {
        this.stats.memoriesDeduplicated++
        continue
      }

      let embedding: number[] | undefined
      if (this.config.generateEmbeddings) {
        try {
          embedding = await generateEmbedding(extracted.content)
        } catch (error) {
          log.warn('Failed to generate embedding', { error })
        }
      }

      await memoryStore.add(
        extracted.content,
        extracted.type,
        'inferred',
        {
          embedding,
          tags: [...extracted.tags, 'auto-extracted', `session:${sessionId}`],
          sessionId,
          initialConfidence: extracted.confidence,
          laneType: extracted.laneType,
          title: extracted.title,
          sourceChunk: extracted.sourceChunk,
          reasoning: extracted.reason
        }
      )

      this.stats.memoriesExtracted++
    }

    this.stats.sessionsProcessed++
  }

  private async isDuplicateMemory(content: string): Promise<boolean> {
    const allMemories = await memoryStore.getAll()

    if (allMemories.length === 0) {
      return false
    }

    let embedding: number[]
    try {
      embedding = await generateEmbedding(content)
    } catch {
      // Embedding generation failed, fall back to exact string matching
      const normalizedContent = content.toLowerCase().trim()
      return allMemories.some(m =>
        m.content.toLowerCase().trim() === normalizedContent
      )
    }

    for (const memory of allMemories) {
      if (!memory.embedding) continue

      const similarity = cosineSimilarity(embedding, memory.embedding)
      if (similarity >= this.config.deduplicationThreshold) {
        log.debug('Found duplicate memory', {
          similarity,
          existingId: memory.id,
          newContentPreview: content.slice(0, 50)
        })
        return true
      }
    }

    return false
  }

  getStats(): CatcherStats {
    return { ...this.stats }
  }

  resetStats(): void {
    this.stats = {
      sessionsProcessed: 0,
      memoriesExtracted: 0,
      memoriesDeduplicated: 0,
      lastRun: null,
      errors: 0
    }
  }

  isRunning(): boolean {
    return this.interval !== null
  }

  isWatching(): boolean {
    return this.watcher !== null
  }
}

export const memoryCatcher = new MemoryCatcher()
