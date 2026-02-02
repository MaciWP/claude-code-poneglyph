import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { logger } from '../../logger'
import type { Memory, MemorySearchResult, MemoryType, MemorySource, AgentType, MemoryLaneType } from './types'

const log = logger.child('memory-store')

const DATA_DIR = join(import.meta.dir, '../../../storage/memories')
const INDEX_FILE = join(DATA_DIR, 'index.json')
const MAX_CACHE_SIZE = 1000 // Max memories in RAM

interface MemoryIndex {
  version: string
  totalMemories: number
  lastUpdated: string
  memoryIds: string[]
}

class MemoryStore {
  private cache: Map<string, Memory> = new Map()
  private memoryIds: Set<string> = new Set()
  private initialized = false
  private initPromise: Promise<void> | null = null

  async init(): Promise<void> {
    if (this.initialized) return
    if (this.initPromise) return this.initPromise

    this.initPromise = this._doInit()
    return this.initPromise
  }

  private async _doInit(): Promise<void> {
    await mkdir(DATA_DIR, { recursive: true })
    log.info('Ensured memories data directory exists')

    await this.loadIndex()
    this.initialized = true
    log.info('MemoryStore initialized', { indexedCount: this.memoryIds.size, cachedCount: this.cache.size })
  }

  private async loadIndex(): Promise<void> {
    try {
      const indexContent = await readFile(INDEX_FILE, 'utf-8')
      const index: MemoryIndex = JSON.parse(indexContent)
      this.memoryIds = new Set(index.memoryIds)
    } catch (error) {
      // If file doesn't exist, create new index
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await this.saveIndex()
        return
      }
      log.error('Failed to load memory index', { error })
    }
  }

  private async loadMemoryFromDisk(id: string): Promise<Memory | null> {
    const memoryPath = join(DATA_DIR, `${id}.json`)

    try {
      const content = await readFile(memoryPath, 'utf-8')
      const memory: Memory = JSON.parse(content)
      this.addToCache(id, memory)
      return memory
    } catch (error) {
      // Return null if file doesn't exist
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null
      }
      log.error('Failed to load memory from disk', { id, error })
      return null
    }
  }

  private addToCache(id: string, memory: Memory): void {
    // LRU eviction: Map maintains insertion order, first key is least recently used
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const lruKey = this.cache.keys().next().value
      if (lruKey) {
        this.cache.delete(lruKey)
      }
    }
    this.cache.set(id, memory)
  }

  private async saveIndex(): Promise<void> {
    const index: MemoryIndex = {
      version: '1.0',
      totalMemories: this.memoryIds.size,
      lastUpdated: new Date().toISOString(),
      memoryIds: Array.from(this.memoryIds)
    }
    await writeFile(INDEX_FILE, JSON.stringify(index, null, 2))
  }

  private async saveMemory(memory: Memory): Promise<void> {
    const memoryPath = join(DATA_DIR, `${memory.id}.json`)
    await writeFile(memoryPath, JSON.stringify(memory, null, 2))
  }

  generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }

  async add(
    content: string,
    type: MemoryType,
    source: MemorySource,
    options: {
      embedding?: number[]
      tags?: string[]
      sessionId?: string
      agentType?: AgentType
      initialConfidence?: number
      laneType?: MemoryLaneType
      title?: string
      sourceChunk?: string
      reasoning?: string
    } = {}
  ): Promise<Memory> {
    await this.init()

    const id = this.generateId()
    const now = new Date().toISOString()

    const memory: Memory = {
      id,
      type,
      content,
      embedding: options.embedding,
      confidence: {
        initial: options.initialConfidence ?? 0.5,
        current: options.initialConfidence ?? 0.5,
        decayRate: 30,
        reinforcements: 0,
        contradictions: 0,
        lastAccessed: now
      },
      metadata: {
        source,
        sessionId: options.sessionId,
        agentType: options.agentType,
        tags: options.tags ?? [],
        createdAt: now,
        updatedAt: now
      },
      laneType: options.laneType,
      title: options.title,
      sourceChunk: options.sourceChunk,
      reasoning: options.reasoning,
      observationCount: 0
    }

    this.memoryIds.add(id)
    this.addToCache(id, memory)
    await this.saveMemory(memory)
    await this.saveIndex()

    log.info('Added memory', { id, type, source })
    return memory
  }

  async get(id: string): Promise<Memory | null> {
    await this.init()

    const cached = this.cache.get(id)
    if (cached) {
      // LRU: Move to end (most recently used) by re-inserting
      this.cache.delete(id)
      this.cache.set(id, cached)
      return cached
    }

    if (this.memoryIds.has(id)) {
      return this.loadMemoryFromDisk(id)
    }

    return null
  }

  async update(id: string, updates: Partial<Memory>): Promise<Memory | null> {
    await this.init()

    const existing = await this.get(id)
    if (!existing) return null

    const updated: Memory = {
      ...existing,
      ...updates,
      metadata: {
        ...existing.metadata,
        ...updates.metadata,
        updatedAt: new Date().toISOString()
      }
    }

    this.addToCache(id, updated)
    await this.saveMemory(updated)

    log.debug('Updated memory', { id })
    return updated
  }

  async delete(id: string): Promise<boolean> {
    await this.init()

    if (!this.memoryIds.has(id)) return false

    this.memoryIds.delete(id)
    this.cache.delete(id)
    await this.saveIndex()

    log.info('Deleted memory', { id })
    return true
  }

  async getAll(): Promise<Memory[]> {
    await this.init()

    const results = await Promise.all(
      Array.from(this.memoryIds).map(id => this.get(id))
    )

    return results.filter((m): m is Memory => m !== null)
  }

  async search(
    query: string,
    options: {
      limit?: number
      type?: MemoryType
      minConfidence?: number
      tags?: string[]
    } = {}
  ): Promise<MemorySearchResult[]> {
    await this.init()

    const queryLower = query.toLowerCase()

    // Load all memories in parallel
    const allMemories = await Promise.all(
      Array.from(this.memoryIds).map(id => this.get(id))
    )

    // Filter and score
    const results: MemorySearchResult[] = allMemories
      .filter((m): m is Memory => m !== null)
      .filter(memory => {
        if (options.type && memory.type !== options.type) return false
        if (options.minConfidence && memory.confidence.current < options.minConfidence) return false
        if (options.tags?.length && !options.tags.some(t => memory.metadata.tags.includes(t))) return false
        return memory.content.toLowerCase().includes(queryLower)
      })
      .map(memory => {
        const contentLower = memory.content.toLowerCase()
        const similarity = this.calculateTextSimilarity(queryLower, contentLower)
        return {
          memory,
          similarity,
          relevanceScore: similarity * memory.confidence.current
        }
      })

    results.sort((a, b) => b.relevanceScore - a.relevanceScore)
    return results.slice(0, options.limit ?? 10)
  }

  private calculateTextSimilarity(query: string, content: string): number {
    const queryWords = new Set(query.split(/\s+/))
    const contentWords = new Set(content.split(/\s+/))
    const intersection = [...queryWords].filter(w => contentWords.has(w))
    return intersection.length / Math.max(queryWords.size, 1)
  }

  async reinforce(id: string): Promise<void> {
    const memory = await this.get(id)
    if (!memory) return

    memory.confidence.reinforcements++
    memory.confidence.current = Math.min(1, memory.confidence.current * 1.1)
    memory.confidence.lastAccessed = new Date().toISOString()

    await this.saveMemory(memory)
  }

  async contradict(id: string): Promise<void> {
    const memory = await this.get(id)
    if (!memory) return

    memory.confidence.contradictions++
    memory.confidence.current = Math.max(0.1, memory.confidence.current * 0.7)
    memory.confidence.lastAccessed = new Date().toISOString()

    await this.saveMemory(memory)
  }

  getStats(): { total: number; cached: number; byType: Record<string, number>; avgConfidence: number } {
    const byType: Record<string, number> = {}
    let totalConfidence = 0

    for (const memory of this.cache.values()) {
      byType[memory.type] = (byType[memory.type] ?? 0) + 1
      totalConfidence += memory.confidence.current
    }

    return {
      total: this.memoryIds.size,
      cached: this.cache.size,
      byType,
      avgConfidence: this.cache.size > 0 ? totalConfidence / this.cache.size : 0
    }
  }

  async cleanupStaleMemories(options: {
    maxAgeDays?: number
    minConfidence?: number
  } = {}): Promise<{ deletedIds: string[]; deletedCount: number }> {
    await this.init()

    const { maxAgeDays = 90, minConfidence = 0.1 } = options
    const now = Date.now()
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000
    const deletedIds: string[] = []

    for (const id of Array.from(this.memoryIds)) {
      const memory = await this.get(id)
      if (!memory) {
        this.memoryIds.delete(id)
        deletedIds.push(id)
        continue
      }

      const lastAccessed = new Date(memory.confidence.lastAccessed).getTime()
      const age = now - lastAccessed
      const daysSinceAccess = age / (24 * 60 * 60 * 1000)
      const decayedConfidence = memory.confidence.current * Math.pow(0.99, daysSinceAccess / memory.confidence.decayRate)

      const isStale = age > maxAgeMs
      const isLowConfidence = decayedConfidence < minConfidence

      if (isStale || isLowConfidence) {
        await this.delete(id)
        deletedIds.push(id)
        log.info('Cleaned up memory', { id, reason: isStale ? 'stale' : 'low_confidence', age: daysSinceAccess.toFixed(1) + ' days', confidence: decayedConfidence.toFixed(3) })
      }
    }

    return { deletedIds, deletedCount: deletedIds.length }
  }

  getAllIds(): string[] {
    return Array.from(this.memoryIds)
  }

  clearCache(): number {
    const cacheSize = this.cache.size
    this.cache.clear()
    log.info('Cache cleared', { previousSize: cacheSize })
    return cacheSize
  }
}

export const memoryStore = new MemoryStore()
