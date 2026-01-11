import type { Memory } from './types'
import { calculateDecay } from './confidence'

export interface TemporalConfig {
  defaultHalfLife: number
  minHalfLife: number
  maxHalfLife: number
  cleanupThreshold: number
  accessBoostDays: number
}

const DEFAULT_CONFIG: TemporalConfig = {
  defaultHalfLife: 30,
  minHalfLife: 7,
  maxHalfLife: 365,
  cleanupThreshold: 0.15,
  accessBoostDays: 7
}

export function applyTemporalDecay(
  memory: Memory,
  _config: TemporalConfig = DEFAULT_CONFIG
): Memory {
  const decayedConfidence = calculateDecay(memory.confidence)

  return {
    ...memory,
    confidence: {
      ...memory.confidence,
      current: decayedConfidence
    }
  }
}

export function shouldCleanup(
  memory: Memory,
  config: TemporalConfig = DEFAULT_CONFIG
): boolean {
  const decayedConfidence = calculateDecay(memory.confidence)
  const hasNoReinforcements = memory.confidence.reinforcements === 0
  const isBelowThreshold = decayedConfidence < config.cleanupThreshold

  return isBelowThreshold && hasNoReinforcements
}

export function calculateOptimalHalfLife(memory: Memory): number {
  const { reinforcements, contradictions } = memory.confidence

  if (reinforcements > 5 && contradictions === 0) {
    return 180
  }
  if (reinforcements > contradictions * 2) {
    return 90
  }
  if (contradictions > reinforcements) {
    return 14
  }

  return DEFAULT_CONFIG.defaultHalfLife
}

export function adjustHalfLife(
  memory: Memory,
  config: TemporalConfig = DEFAULT_CONFIG
): Memory {
  const optimalHalfLife = calculateOptimalHalfLife(memory)
  const clampedHalfLife = Math.max(
    config.minHalfLife,
    Math.min(config.maxHalfLife, optimalHalfLife)
  )

  return {
    ...memory,
    confidence: {
      ...memory.confidence,
      decayRate: clampedHalfLife
    }
  }
}

export function getMemoryAge(memory: Memory): number {
  const created = new Date(memory.metadata.createdAt)
  const now = new Date()
  return (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
}

export function getDaysSinceAccess(memory: Memory): number {
  const lastAccessed = new Date(memory.confidence.lastAccessed)
  const now = new Date()
  return (now.getTime() - lastAccessed.getTime()) / (1000 * 60 * 60 * 24)
}

export function isStale(
  memory: Memory,
  staleDays: number = 90
): boolean {
  return getDaysSinceAccess(memory) > staleDays
}

export function sortByRecency(memories: Memory[]): Memory[] {
  return [...memories].sort((a, b) => {
    const aDate = new Date(a.confidence.lastAccessed)
    const bDate = new Date(b.confidence.lastAccessed)
    return bDate.getTime() - aDate.getTime()
  })
}

export function filterByTimeRange(
  memories: Memory[],
  startDate: Date,
  endDate: Date = new Date()
): Memory[] {
  return memories.filter(memory => {
    const created = new Date(memory.metadata.createdAt)
    return created >= startDate && created <= endDate
  })
}

export function getLifecycleStage(memory: Memory): 'new' | 'active' | 'stable' | 'fading' | 'expired' {
  const age = getMemoryAge(memory)
  const daysSinceAccess = getDaysSinceAccess(memory)
  const confidence = memory.confidence.current

  if (age < 1) return 'new'
  if (confidence >= 0.7 && daysSinceAccess < 7) return 'active'
  if (confidence >= 0.5 && memory.confidence.reinforcements > 2) return 'stable'
  if (confidence < 0.3) return 'expired'
  return 'fading'
}
