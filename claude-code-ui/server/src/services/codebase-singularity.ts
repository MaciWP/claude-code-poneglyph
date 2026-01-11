/**
 * Codebase Singularity Metrics - Agentic Layer Fase C
 *
 * "El momento en que confías en tus agentes para operar tu codebase mejor que tú mismo."
 *
 * Métricas de autonomía y confianza para evaluar la madurez del sistema agentic.
 */

import { logger } from '../logger'
import { metricsStore } from './metrics-store'
import { getActiveRuns } from './workflow-executor'

const log = logger.child('singularity-metrics')

export interface SingularityMetrics {
  // Core metrics
  autonomyRate: number // % tareas completadas sin intervención humana
  firstPassSuccess: number // % código que pasa review sin fixes
  workflowCompletion: number // % workflows E2E exitosos
  trustScore: number // Evaluación agregada (1-10)

  // Detail metrics
  totalTasks: number
  autonomousTasks: number
  reviewedTasks: number
  fixedOnFirstPass: number
  totalWorkflows: number
  successfulWorkflows: number

  // Trend indicators
  autonomyTrend: 'improving' | 'stable' | 'declining'
  successTrend: 'improving' | 'stable' | 'declining'

  // Time metrics
  avgTaskDuration: number
  avgWorkflowDuration: number

  // Last calculated
  calculatedAt: Date
}

export interface SingularityThresholds {
  autonomyTarget: number // Default: 0.8 (80%)
  firstPassTarget: number // Default: 0.7 (70%)
  workflowTarget: number // Default: 0.9 (90%)
  trustTarget: number // Default: 8
}

const DEFAULT_THRESHOLDS: SingularityThresholds = {
  autonomyTarget: 0.8,
  firstPassTarget: 0.7,
  workflowTarget: 0.9,
  trustTarget: 8,
}

// Store for historical metrics
interface MetricsHistory {
  timestamp: Date
  metrics: SingularityMetrics
}

const metricsHistory: MetricsHistory[] = []
const MAX_HISTORY = 100

/**
 * Calcula métricas actuales de Codebase Singularity
 */
export async function calculateSingularityMetrics(): Promise<SingularityMetrics> {
  const now = new Date()

  // Get execution metrics from metrics store
  const recentMetrics = await metricsStore.getMetrics(24 * 60 * 60 * 1000) // Last 24h

  // Count tasks by type
  let totalTasks = 0
  let autonomousTasks = 0
  let reviewedTasks = 0
  let fixedOnFirstPass = 0
  let totalDuration = 0

  for (const metric of recentMetrics) {
    totalTasks++
    totalDuration += metric.durationMs || 0

    // Consider autonomous if no user intervention was needed
    if (!metric.requiredUserIntervention) {
      autonomousTasks++
    }

    // Check if reviewed
    if (metric.wasReviewed) {
      reviewedTasks++
      if (metric.passedOnFirstReview) {
        fixedOnFirstPass++
      }
    }
  }

  // Get workflow stats
  const activeRuns = getActiveRuns()
  let totalWorkflows = activeRuns.length
  let successfulWorkflows = 0

  for (const run of activeRuns) {
    if (run.status === 'completed') {
      successfulWorkflows++
    }
  }

  // Calculate rates
  const autonomyRate = totalTasks > 0 ? autonomousTasks / totalTasks : 0
  const firstPassSuccess = reviewedTasks > 0 ? fixedOnFirstPass / reviewedTasks : 0
  const workflowCompletion = totalWorkflows > 0 ? successfulWorkflows / totalWorkflows : 1

  // Calculate trust score (weighted average)
  const trustScore = calculateTrustScore(autonomyRate, firstPassSuccess, workflowCompletion)

  // Calculate trends
  const previousMetrics = metricsHistory.length > 0
    ? metricsHistory[metricsHistory.length - 1].metrics
    : null

  const autonomyTrend = calculateTrend(
    previousMetrics?.autonomyRate,
    autonomyRate
  )
  const successTrend = calculateTrend(
    previousMetrics?.firstPassSuccess,
    firstPassSuccess
  )

  const metrics: SingularityMetrics = {
    autonomyRate,
    firstPassSuccess,
    workflowCompletion,
    trustScore,
    totalTasks,
    autonomousTasks,
    reviewedTasks,
    fixedOnFirstPass,
    totalWorkflows,
    successfulWorkflows,
    autonomyTrend,
    successTrend,
    avgTaskDuration: totalTasks > 0 ? totalDuration / totalTasks : 0,
    avgWorkflowDuration: 0, // TODO: Calculate from workflow runs
    calculatedAt: now,
  }

  // Store in history
  metricsHistory.push({ timestamp: now, metrics })
  if (metricsHistory.length > MAX_HISTORY) {
    metricsHistory.shift()
  }

  log.info('Singularity metrics calculated', {
    autonomyRate: (autonomyRate * 100).toFixed(1) + '%',
    firstPassSuccess: (firstPassSuccess * 100).toFixed(1) + '%',
    trustScore: trustScore.toFixed(1),
  })

  return metrics
}

/**
 * Calcula trust score basado en métricas ponderadas
 */
function calculateTrustScore(
  autonomyRate: number,
  firstPassSuccess: number,
  workflowCompletion: number
): number {
  // Weights
  const weights = {
    autonomy: 0.4,
    firstPass: 0.35,
    workflow: 0.25,
  }

  // Calculate weighted average (0-1 scale)
  const weighted =
    autonomyRate * weights.autonomy +
    firstPassSuccess * weights.firstPass +
    workflowCompletion * weights.workflow

  // Convert to 1-10 scale
  return Math.round(weighted * 10 * 10) / 10
}

/**
 * Determina tendencia comparando valores
 */
function calculateTrend(
  previous: number | undefined,
  current: number
): 'improving' | 'stable' | 'declining' {
  if (previous === undefined) return 'stable'

  const diff = current - previous
  const threshold = 0.05 // 5% change threshold

  if (diff > threshold) return 'improving'
  if (diff < -threshold) return 'declining'
  return 'stable'
}

/**
 * Evalúa si se ha alcanzado el "Singularity Point"
 */
export function hasSingularityBeenReached(
  metrics: SingularityMetrics,
  thresholds: SingularityThresholds = DEFAULT_THRESHOLDS
): boolean {
  return (
    metrics.autonomyRate >= thresholds.autonomyTarget &&
    metrics.firstPassSuccess >= thresholds.firstPassTarget &&
    metrics.workflowCompletion >= thresholds.workflowTarget &&
    metrics.trustScore >= thresholds.trustTarget
  )
}

/**
 * Obtiene recomendaciones para mejorar métricas
 */
export function getSingularityRecommendations(
  metrics: SingularityMetrics,
  thresholds: SingularityThresholds = DEFAULT_THRESHOLDS
): string[] {
  const recommendations: string[] = []

  if (metrics.autonomyRate < thresholds.autonomyTarget) {
    recommendations.push(
      `Autonomy rate (${(metrics.autonomyRate * 100).toFixed(0)}%) below target (${thresholds.autonomyTarget * 100}%). ` +
      `Consider improving agent prompts and adding more domain experts.`
    )
  }

  if (metrics.firstPassSuccess < thresholds.firstPassTarget) {
    recommendations.push(
      `First-pass success (${(metrics.firstPassSuccess * 100).toFixed(0)}%) below target (${thresholds.firstPassTarget * 100}%). ` +
      `Add more code-quality checks and reviewer feedback loops.`
    )
  }

  if (metrics.workflowCompletion < thresholds.workflowTarget) {
    recommendations.push(
      `Workflow completion (${(metrics.workflowCompletion * 100).toFixed(0)}%) below target (${thresholds.workflowTarget * 100}%). ` +
      `Review workflow definitions and add recovery steps.`
    )
  }

  if (metrics.trustScore < thresholds.trustTarget) {
    recommendations.push(
      `Trust score (${metrics.trustScore.toFixed(1)}) below target (${thresholds.trustTarget}). ` +
      `Focus on improving the metrics above.`
    )
  }

  if (recommendations.length === 0) {
    recommendations.push('All metrics are at or above target levels. Continue monitoring.')
  }

  return recommendations
}

/**
 * Obtiene historial de métricas
 */
export function getMetricsHistory(count?: number): MetricsHistory[] {
  const historySlice = count ? metricsHistory.slice(-count) : metricsHistory
  return [...historySlice]
}

/**
 * Registra intervención del usuario (disminuye autonomía)
 */
export function recordUserIntervention(taskId: string, reason: string): void {
  log.info('User intervention recorded', { taskId, reason })
  // This would update the metrics store with the intervention flag
}

/**
 * Registra éxito de review en primer intento
 */
export function recordFirstPassSuccess(taskId: string): void {
  log.info('First-pass success recorded', { taskId })
  // This would update the metrics store
}

/**
 * Obtiene resumen para dashboard
 */
export function getSingularitySummary(
  metrics: SingularityMetrics,
  thresholds: SingularityThresholds = DEFAULT_THRESHOLDS
): {
  status: 'reached' | 'approaching' | 'developing'
  progress: number
  highlights: string[]
} {
  const reached = hasSingularityBeenReached(metrics, thresholds)

  // Calculate overall progress (0-100%)
  const progress = (
    (Math.min(metrics.autonomyRate / thresholds.autonomyTarget, 1) +
      Math.min(metrics.firstPassSuccess / thresholds.firstPassTarget, 1) +
      Math.min(metrics.workflowCompletion / thresholds.workflowTarget, 1) +
      Math.min(metrics.trustScore / thresholds.trustTarget, 1)) /
    4
  ) * 100

  let status: 'reached' | 'approaching' | 'developing'
  if (reached) {
    status = 'reached'
  } else if (progress >= 75) {
    status = 'approaching'
  } else {
    status = 'developing'
  }

  const highlights: string[] = []

  if (metrics.autonomyTrend === 'improving') {
    highlights.push('Autonomy is improving')
  }
  if (metrics.successTrend === 'improving') {
    highlights.push('Success rate is improving')
  }
  if (metrics.trustScore >= 8) {
    highlights.push('High trust score achieved')
  }
  if (metrics.workflowCompletion >= 0.9) {
    highlights.push('Excellent workflow completion')
  }

  return { status, progress, highlights }
}
