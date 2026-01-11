import { logger } from '../../logger'
import { memoryStore } from './store'
import { memoryGraph } from './graph'
import type { Memory, MemorySearchResult, AgentType, MemoryType } from './types'

const log = logger.child('agent-memory')

export interface AgentMemorySpace {
  agentType: AgentType
  memories: Memory[]
  patterns: Map<string, number>
  lastUpdated: string
}

const agentSpaces: Map<AgentType, AgentMemorySpace> = new Map()

export async function getAgentMemorySpace(agentType: AgentType): Promise<AgentMemorySpace> {
  if (agentSpaces.has(agentType)) {
    return agentSpaces.get(agentType)!
  }

  const allMemories = await memoryStore.getAll()
  const agentMemories = allMemories.filter(m => m.metadata.agentType === agentType)

  const patterns = new Map<string, number>()
  for (const memory of agentMemories) {
    for (const tag of memory.metadata.tags) {
      patterns.set(tag, (patterns.get(tag) ?? 0) + 1)
    }
  }

  const space: AgentMemorySpace = {
    agentType,
    memories: agentMemories,
    patterns,
    lastUpdated: new Date().toISOString()
  }

  agentSpaces.set(agentType, space)
  return space
}

export async function addAgentMemory(
  agentType: AgentType,
  content: string,
  type: MemoryType,
  options: {
    sessionId?: string
    tags?: string[]
    embedding?: number[]
    initialConfidence?: number
  } = {}
): Promise<Memory> {
  const memory = await memoryStore.add(content, type, 'interaction', {
    ...options,
    agentType
  })

  const space = await getAgentMemorySpace(agentType)
  space.memories.push(memory)
  space.lastUpdated = new Date().toISOString()

  for (const tag of memory.metadata.tags) {
    space.patterns.set(tag, (space.patterns.get(tag) ?? 0) + 1)
  }

  log.info('Added agent memory', { agentType, memoryId: memory.id })
  return memory
}

export async function searchAgentMemories(
  agentType: AgentType,
  query: string,
  options: { limit?: number; minConfidence?: number } = {}
): Promise<MemorySearchResult[]> {
  const space = await getAgentMemorySpace(agentType)

  const queryLower = query.toLowerCase()
  const results: MemorySearchResult[] = []

  for (const memory of space.memories) {
    if (options.minConfidence && memory.confidence.current < options.minConfidence) continue

    const contentLower = memory.content.toLowerCase()
    if (contentLower.includes(queryLower)) {
      const similarity = calculateTextMatch(queryLower, contentLower)
      results.push({
        memory,
        similarity,
        relevanceScore: similarity * memory.confidence.current
      })
    }
  }

  results.sort((a, b) => b.relevanceScore - a.relevanceScore)
  return results.slice(0, options.limit ?? 5)
}

function calculateTextMatch(query: string, content: string): number {
  const queryWords = query.split(/\s+/).filter(w => w.length > 2)
  const contentWords = new Set(content.split(/\s+/))

  let matches = 0
  for (const word of queryWords) {
    if (contentWords.has(word)) matches++
  }

  return queryWords.length > 0 ? matches / queryWords.length : 0
}

export async function getAgentPatterns(agentType: AgentType): Promise<{ pattern: string; count: number }[]> {
  const space = await getAgentMemorySpace(agentType)

  const patterns = Array.from(space.patterns.entries())
    .map(([pattern, count]) => ({ pattern, count }))
    .sort((a, b) => b.count - a.count)

  return patterns
}

export async function transferMemory(
  memoryId: string,
  fromAgent: AgentType,
  toAgent: AgentType
): Promise<Memory | null> {
  const memory = await memoryStore.get(memoryId)
  if (!memory) return null

  const updated = await memoryStore.update(memoryId, {
    metadata: {
      ...memory.metadata,
      agentType: toAgent
    }
  })

  if (updated) {
    const fromSpace = agentSpaces.get(fromAgent)
    if (fromSpace) {
      fromSpace.memories = fromSpace.memories.filter(m => m.id !== memoryId)
    }

    const toSpace = await getAgentMemorySpace(toAgent)
    toSpace.memories.push(updated)

    await memoryGraph.addEdge(memoryId, memoryId, 'related', 0.5)

    log.info('Transferred memory', { memoryId, fromAgent, toAgent })
  }

  return updated
}

export async function getAgentInsights(agentType: AgentType): Promise<{
  totalMemories: number
  avgConfidence: number
  topPatterns: { pattern: string; count: number }[]
  recentActivity: Memory[]
}> {
  const space = await getAgentMemorySpace(agentType)

  let totalConfidence = 0
  for (const memory of space.memories) {
    totalConfidence += memory.confidence.current
  }

  const sortedByDate = [...space.memories].sort((a, b) => {
    return new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime()
  })

  return {
    totalMemories: space.memories.length,
    avgConfidence: space.memories.length > 0 ? totalConfidence / space.memories.length : 0,
    topPatterns: await getAgentPatterns(agentType),
    recentActivity: sortedByDate.slice(0, 5)
  }
}

export function clearAgentCache(agentType?: AgentType): void {
  if (agentType) {
    agentSpaces.delete(agentType)
  } else {
    agentSpaces.clear()
  }
  log.info('Cleared agent memory cache', { agentType: agentType ?? 'all' })
}
