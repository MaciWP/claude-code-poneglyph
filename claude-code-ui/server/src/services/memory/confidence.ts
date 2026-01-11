import type { ConfidenceMetrics } from './types'

const DEFAULT_DECAY_RATE = 30
const MIN_CONFIDENCE = 0.1
const MAX_CONFIDENCE = 1.0

export function createConfidenceMetrics(
  initialConfidence: number = 0.5,
  decayRate: number = DEFAULT_DECAY_RATE
): ConfidenceMetrics {
  const now = new Date().toISOString()
  return {
    initial: Math.max(MIN_CONFIDENCE, Math.min(MAX_CONFIDENCE, initialConfidence)),
    current: Math.max(MIN_CONFIDENCE, Math.min(MAX_CONFIDENCE, initialConfidence)),
    decayRate,
    reinforcements: 0,
    contradictions: 0,
    lastAccessed: now
  }
}

export function calculateDecay(metrics: ConfidenceMetrics): number {
  const now = new Date()
  const lastAccessed = new Date(metrics.lastAccessed)
  const daysSinceAccess = (now.getTime() - lastAccessed.getTime()) / (1000 * 60 * 60 * 24)

  const halfLife = metrics.decayRate
  const decayFactor = Math.pow(0.5, daysSinceAccess / halfLife)

  return Math.max(MIN_CONFIDENCE, metrics.current * decayFactor)
}

export function applyReinforcement(metrics: ConfidenceMetrics): ConfidenceMetrics {
  const reinforcementBoost = 0.1 * Math.pow(0.9, metrics.reinforcements)
  const newConfidence = Math.min(MAX_CONFIDENCE, metrics.current + reinforcementBoost)

  return {
    ...metrics,
    current: newConfidence,
    reinforcements: metrics.reinforcements + 1,
    lastAccessed: new Date().toISOString()
  }
}

export function applyContradiction(metrics: ConfidenceMetrics): ConfidenceMetrics {
  const contradictionPenalty = 0.2 + (0.05 * metrics.contradictions)
  const newConfidence = Math.max(MIN_CONFIDENCE, metrics.current - contradictionPenalty)

  return {
    ...metrics,
    current: newConfidence,
    contradictions: metrics.contradictions + 1,
    lastAccessed: new Date().toISOString()
  }
}

export function calculateReliabilityScore(metrics: ConfidenceMetrics): number {
  const totalInteractions = metrics.reinforcements + metrics.contradictions
  if (totalInteractions === 0) return metrics.current

  const reinforcementRatio = metrics.reinforcements / totalInteractions
  const interactionWeight = Math.min(1, totalInteractions / 10)

  return (metrics.current * (1 - interactionWeight)) + (reinforcementRatio * interactionWeight)
}

export function shouldTriggerValidation(metrics: ConfidenceMetrics): boolean {
  const decayedConfidence = calculateDecay(metrics)
  const hasContradictions = metrics.contradictions > 0

  return decayedConfidence < 0.4 || (hasContradictions && decayedConfidence < 0.6)
}

export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.7) return 'high'
  if (confidence >= 0.4) return 'medium'
  return 'low'
}

export function mergeConfidence(a: ConfidenceMetrics, b: ConfidenceMetrics): ConfidenceMetrics {
  const avgCurrent = (a.current + b.current) / 2
  const maxInitial = Math.max(a.initial, b.initial)

  return {
    initial: maxInitial,
    current: avgCurrent,
    decayRate: Math.min(a.decayRate, b.decayRate),
    reinforcements: a.reinforcements + b.reinforcements,
    contradictions: a.contradictions + b.contradictions,
    lastAccessed: new Date().toISOString()
  }
}

export function refreshAccess(metrics: ConfidenceMetrics): ConfidenceMetrics {
  return {
    ...metrics,
    lastAccessed: new Date().toISOString()
  }
}
