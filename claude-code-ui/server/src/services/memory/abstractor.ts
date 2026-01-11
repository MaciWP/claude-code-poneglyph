import { logger } from '../../logger'
import { memoryStore } from './store'
import { memoryGraph } from './graph'
import { generateEmbedding, cosineSimilarity } from './vector'
import type { Memory, MemoryPattern } from './types'

const log = logger.child('memory-abstractor')

export interface AbstractionResult {
  abstractMemory: Memory
  sourceMemories: string[]
  patternType: string
  confidence: number
}

const MIN_CLUSTER_SIZE = 3
const SIMILARITY_THRESHOLD = 0.75

export async function findSimilarMemories(
  memories: Memory[],
  threshold: number = SIMILARITY_THRESHOLD
): Promise<Memory[][]> {
  const clusters: Memory[][] = []
  const assigned = new Set<string>()

  const memoriesWithEmbeddings = memories.filter(m => m.embedding && m.embedding.length > 0)

  for (const memory of memoriesWithEmbeddings) {
    if (assigned.has(memory.id)) continue

    const cluster: Memory[] = [memory]
    assigned.add(memory.id)

    for (const other of memoriesWithEmbeddings) {
      if (assigned.has(other.id)) continue

      const similarity = cosineSimilarity(memory.embedding!, other.embedding!)
      if (similarity >= threshold) {
        cluster.push(other)
        assigned.add(other.id)
      }
    }

    if (cluster.length >= MIN_CLUSTER_SIZE) {
      clusters.push(cluster)
    }
  }

  return clusters
}

export async function abstractCluster(
  cluster: Memory[]
): Promise<AbstractionResult | null> {
  if (cluster.length < MIN_CLUSTER_SIZE) return null

  const commonTags = findCommonTags(cluster)
  const avgConfidence = cluster.reduce((sum, m) => sum + m.confidence.current, 0) / cluster.length

  const sortedByConfidence = [...cluster].sort(
    (a, b) => b.confidence.current - a.confidence.current
  )
  const representative = sortedByConfidence[0]

  const abstractContent = generateAbstractContent(cluster, commonTags)

  let embedding: number[] | undefined
  try {
    embedding = await generateEmbedding(abstractContent)
  } catch (error) {
    log.warn('Failed to generate embedding for abstract memory')
  }

  const abstractMemory = await memoryStore.add(
    abstractContent,
    'semantic',
    'inferred',
    {
      embedding,
      tags: ['abstracted', ...commonTags],
      initialConfidence: avgConfidence * 0.9
    }
  )

  for (const memory of cluster) {
    await memoryGraph.addEdge(abstractMemory.id, memory.id, 'supersedes', 0.9)
  }

  log.info('Created abstract memory', {
    id: abstractMemory.id,
    sourceCount: cluster.length,
    commonTags
  })

  return {
    abstractMemory,
    sourceMemories: cluster.map(m => m.id),
    patternType: commonTags[0] || 'general',
    confidence: avgConfidence
  }
}

function findCommonTags(memories: Memory[]): string[] {
  if (memories.length === 0) return []

  const tagCounts: Map<string, number> = new Map()

  for (const memory of memories) {
    for (const tag of memory.metadata.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
    }
  }

  const threshold = Math.ceil(memories.length * 0.5)

  return Array.from(tagCounts.entries())
    .filter(([_, count]) => count >= threshold)
    .map(([tag]) => tag)
    .sort()
}

function generateAbstractContent(memories: Memory[], tags: string[]): string {
  const firstMemory = memories[0]

  if (tags.includes('preference')) {
    return `User preference pattern: ${extractCommonPhrase(memories)}`
  }

  if (tags.includes('code')) {
    const language = tags.find(t => ['typescript', 'javascript', 'python'].includes(t))
    return `Recurring ${language || 'code'} pattern across ${memories.length} instances`
  }

  if (tags.includes('knowledge')) {
    return `Project knowledge: ${extractCommonPhrase(memories)}`
  }

  return `Pattern from ${memories.length} similar memories: ${firstMemory.content.slice(0, 100)}`
}

function extractCommonPhrase(memories: Memory[]): string {
  const words: Map<string, number> = new Map()

  for (const memory of memories) {
    const memoryWords = memory.content.toLowerCase().split(/\s+/)
    for (const word of memoryWords) {
      if (word.length > 3) {
        words.set(word, (words.get(word) ?? 0) + 1)
      }
    }
  }

  const threshold = Math.ceil(memories.length * 0.6)
  const commonWords = Array.from(words.entries())
    .filter(([_, count]) => count >= threshold)
    .map(([word]) => word)

  return commonWords.slice(0, 10).join(' ') || memories[0].content.slice(0, 50)
}

export async function runAbstraction(): Promise<AbstractionResult[]> {
  const allMemories = await memoryStore.getAll()

  const episodicMemories = allMemories.filter(m =>
    m.type === 'episodic' &&
    m.confidence.current > 0.4 &&
    !m.metadata.tags.includes('abstracted')
  )

  if (episodicMemories.length < MIN_CLUSTER_SIZE) {
    log.debug('Not enough memories for abstraction')
    return []
  }

  const clusters = await findSimilarMemories(episodicMemories)
  const results: AbstractionResult[] = []

  for (const cluster of clusters) {
    const result = await abstractCluster(cluster)
    if (result) {
      results.push(result)
    }
  }

  log.info('Abstraction run complete', {
    processed: episodicMemories.length,
    clusters: clusters.length,
    abstractions: results.length
  })

  return results
}

export async function detectPatterns(memories: Memory[]): Promise<MemoryPattern[]> {
  const tagGroups: Map<string, Memory[]> = new Map()

  for (const memory of memories) {
    for (const tag of memory.metadata.tags) {
      if (!tagGroups.has(tag)) {
        tagGroups.set(tag, [])
      }
      tagGroups.get(tag)!.push(memory)
    }
  }

  const patterns: MemoryPattern[] = []

  for (const [tag, tagMemories] of tagGroups) {
    if (tagMemories.length >= 3) {
      const avgConfidence = tagMemories.reduce((s, m) => s + m.confidence.current, 0) / tagMemories.length

      patterns.push({
        id: `pattern_${tag}_${Date.now()}`,
        pattern: tag,
        frequency: tagMemories.length,
        memories: tagMemories.map(m => m.id),
        confidence: avgConfidence,
        abstracted: false
      })
    }
  }

  return patterns.sort((a, b) => b.frequency - a.frequency)
}
