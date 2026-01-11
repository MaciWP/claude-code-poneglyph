import { logger } from '../logger'
import type { ExpertResult, ConsensusResult, ConflictInfo } from './parallel-executor'

const log = logger.child('result-comparator')

export interface ComparisonConfig {
  similarityThreshold: number
  weightByConfidence: boolean
  detectConflicts: boolean
  extractKeyPoints: boolean
}

export interface KeyPoint {
  content: string
  source: string[]
  confidence: number
  category: 'recommendation' | 'finding' | 'warning' | 'action'
}

export interface DetailedComparison {
  similarity: number
  keyPoints: KeyPoint[]
  conflicts: DetailedConflict[]
  recommendations: MergedRecommendation[]
  confidenceWeightedScore: number
}

export interface DetailedConflict {
  id: string
  topic: string
  experts: ExpertPosition[]
  severity: 'low' | 'medium' | 'high'
  resolution?: string
}

export interface ExpertPosition {
  expertId: string
  position: string
  confidence: number
  evidence?: string
}

export interface MergedRecommendation {
  action: string
  priority: 'high' | 'medium' | 'low'
  supportingExperts: string[]
  confidence: number
  rationale: string
}

export interface ValidationResult {
  isValid: boolean
  score: number
  issues: ValidationIssue[]
  suggestions: string[]
}

export interface ValidationIssue {
  type: 'inconsistency' | 'low_confidence' | 'missing_info' | 'conflict'
  severity: 'error' | 'warning' | 'info'
  message: string
  affectedExperts: string[]
}

const DEFAULT_CONFIG: ComparisonConfig = {
  similarityThreshold: 0.6,
  weightByConfidence: true,
  detectConflicts: true,
  extractKeyPoints: true,
}

export class ResultComparator {
  private config: ComparisonConfig

  constructor(config?: Partial<ComparisonConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  compare(results: ExpertResult[]): DetailedComparison {
    log.debug('Comparing results', { expertCount: results.length })

    const similarity = this.calculateOverallSimilarity(results)
    const keyPoints = this.config.extractKeyPoints ? this.extractKeyPoints(results) : []
    const conflicts = this.config.detectConflicts ? this.detectConflicts(results) : []
    const recommendations = this.mergeRecommendations(results)
    const confidenceWeightedScore = this.calculateWeightedScore(results, similarity)

    log.info('Comparison complete', {
      similarity,
      keyPointsCount: keyPoints.length,
      conflictsCount: conflicts.length,
      recommendationsCount: recommendations.length,
    })

    return {
      similarity,
      keyPoints,
      conflicts,
      recommendations,
      confidenceWeightedScore,
    }
  }

  merge(results: ExpertResult[]): string {
    if (results.length === 0) return ''
    if (results.length === 1) return results[0].output

    const comparison = this.compare(results)
    const sortedResults = this.sortByConfidence(results)

    let merged = `# Multi-Expert Analysis\n\n`
    merged += `**Experts consulted**: ${results.map(r => r.expertId).join(', ')}\n`
    merged += `**Overall agreement**: ${(comparison.similarity * 100).toFixed(1)}%\n`
    merged += `**Confidence-weighted score**: ${(comparison.confidenceWeightedScore * 100).toFixed(1)}%\n\n`

    if (comparison.keyPoints.length > 0) {
      merged += `## Key Findings\n\n`
      const groupedPoints = this.groupKeyPoints(comparison.keyPoints)

      for (const [category, points] of Object.entries(groupedPoints)) {
        merged += `### ${this.formatCategory(category)}\n`
        for (const point of points) {
          const sources = point.source.length > 1 ? ` (${point.source.length} experts agree)` : ''
          merged += `- ${point.content}${sources}\n`
        }
        merged += '\n'
      }
    }

    if (comparison.recommendations.length > 0) {
      merged += `## Recommendations\n\n`
      const sortedRecs = [...comparison.recommendations].sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      })

      for (const rec of sortedRecs) {
        const priorityEmoji = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢'
        merged += `${priorityEmoji} **${rec.action}**\n`
        merged += `   - Confidence: ${(rec.confidence * 100).toFixed(0)}%\n`
        merged += `   - Supported by: ${rec.supportingExperts.join(', ')}\n`
        merged += `   - Rationale: ${rec.rationale}\n\n`
      }
    }

    if (comparison.conflicts.length > 0) {
      merged += `## ⚠️ Points of Disagreement\n\n`
      for (const conflict of comparison.conflicts) {
        merged += `### ${conflict.topic}\n`
        for (const position of conflict.experts) {
          merged += `- **${position.expertId}**: ${position.position}\n`
        }
        if (conflict.resolution) {
          merged += `\n**Suggested resolution**: ${conflict.resolution}\n`
        }
        merged += '\n'
      }
    }

    merged += `## Individual Expert Summaries\n\n`
    for (const result of sortedResults) {
      merged += `### ${result.expertId} (${(result.confidence * 100).toFixed(0)}% confidence)\n`
      merged += `${this.summarizeOutput(result.output)}\n\n`
    }

    return merged
  }

  validate(results: ExpertResult[]): ValidationResult {
    const issues: ValidationIssue[] = []
    const suggestions: string[] = []
    let score = 1.0

    if (results.length === 0) {
      return {
        isValid: false,
        score: 0,
        issues: [{ type: 'missing_info', severity: 'error', message: 'No results to validate', affectedExperts: [] }],
        suggestions: ['Ensure at least one expert provides results'],
      }
    }

    const successfulResults = results.filter(r => r.success)
    if (successfulResults.length === 0) {
      issues.push({
        type: 'missing_info',
        severity: 'error',
        message: 'All experts failed',
        affectedExperts: results.map(r => r.expertId),
      })
      score = 0
    }

    const lowConfidenceExperts = results.filter(r => r.confidence < 0.5)
    if (lowConfidenceExperts.length > 0) {
      issues.push({
        type: 'low_confidence',
        severity: 'warning',
        message: `${lowConfidenceExperts.length} expert(s) have low confidence`,
        affectedExperts: lowConfidenceExperts.map(r => r.expertId),
      })
      score -= 0.1 * lowConfidenceExperts.length
      suggestions.push('Consider re-validating expertise files for low-confidence experts')
    }

    if (successfulResults.length >= 2) {
      const comparison = this.compare(successfulResults)

      if (comparison.similarity < this.config.similarityThreshold) {
        issues.push({
          type: 'inconsistency',
          severity: 'warning',
          message: `Low agreement between experts (${(comparison.similarity * 100).toFixed(1)}%)`,
          affectedExperts: successfulResults.map(r => r.expertId),
        })
        score -= 0.2
        suggestions.push('Review conflicting opinions and consider manual verification')
      }

      if (comparison.conflicts.length > 0) {
        for (const conflict of comparison.conflicts) {
          issues.push({
            type: 'conflict',
            severity: conflict.severity === 'high' ? 'error' : 'warning',
            message: `Conflict on "${conflict.topic}"`,
            affectedExperts: conflict.experts.map(e => e.expertId),
          })
        }
        score -= 0.05 * comparison.conflicts.length
      }
    }

    if (successfulResults.length === 1) {
      suggestions.push('Consider using multiple experts for cross-validation')
    }

    return {
      isValid: score >= 0.5 && !issues.some(i => i.severity === 'error'),
      score: Math.max(0, Math.min(1, score)),
      issues,
      suggestions,
    }
  }

  buildConsensus(results: ExpertResult[]): ConsensusResult {
    const successfulResults = results.filter(r => r.success)

    if (successfulResults.length === 0) {
      return {
        achieved: false,
        score: 0,
        agreementLevel: 'none',
        mergedOutput: 'No successful results to build consensus',
        conflicts: [],
      }
    }

    const comparison = this.compare(successfulResults)

    let agreementLevel: ConsensusResult['agreementLevel']
    if (comparison.similarity >= 0.9) agreementLevel = 'full'
    else if (comparison.similarity >= 0.7) agreementLevel = 'majority'
    else if (comparison.similarity >= 0.4) agreementLevel = 'partial'
    else agreementLevel = 'none'

    const conflicts: ConflictInfo[] = comparison.conflicts.map(c => ({
      topic: c.topic,
      experts: c.experts.map(e => e.expertId),
      positions: c.experts.map(e => e.position),
    }))

    return {
      achieved: comparison.similarity >= this.config.similarityThreshold,
      score: comparison.confidenceWeightedScore,
      agreementLevel,
      mergedOutput: this.merge(successfulResults),
      conflicts,
    }
  }

  private calculateOverallSimilarity(results: ExpertResult[]): number {
    if (results.length < 2) return 1

    let totalSimilarity = 0
    let comparisons = 0

    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        totalSimilarity += this.calculateTextSimilarity(results[i].output, results[j].output)
        comparisons++
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    const normalize = (text: string) => text.toLowerCase().replace(/[^\w\s]/g, '')

    const words1 = new Set(normalize(text1).split(/\s+/).filter(w => w.length > 3))
    const words2 = new Set(normalize(text2).split(/\s+/).filter(w => w.length > 3))

    if (words1.size === 0 && words2.size === 0) return 1
    if (words1.size === 0 || words2.size === 0) return 0

    const intersection = [...words1].filter(w => words2.has(w)).length
    const union = new Set([...words1, ...words2]).size

    return intersection / union
  }

  private calculateWeightedScore(results: ExpertResult[], baseSimilarity: number): number {
    if (!this.config.weightByConfidence || results.length === 0) {
      return baseSimilarity
    }

    const totalWeight = results.reduce((sum, r) => sum + r.confidence, 0)
    if (totalWeight === 0) return baseSimilarity

    const weightedSum = results.reduce((sum, r) => sum + (r.success ? r.confidence : 0), 0)
    const successWeight = weightedSum / totalWeight

    return baseSimilarity * 0.5 + successWeight * 0.5
  }

  private extractKeyPoints(results: ExpertResult[]): KeyPoint[] {
    const keyPoints: KeyPoint[] = []
    const patterns = {
      recommendation: /(?:recommend|suggest|should|advise|propose)[:\s]+([^.!?]+[.!?])/gi,
      finding: /(?:found|discovered|identified|detected|noticed)[:\s]+([^.!?]+[.!?])/gi,
      warning: /(?:warning|caution|careful|risk|danger|issue)[:\s]+([^.!?]+[.!?])/gi,
      action: /(?:action|step|task|todo|must|need to)[:\s]+([^.!?]+[.!?])/gi,
    }

    for (const result of results) {
      for (const [category, pattern] of Object.entries(patterns)) {
        const matches = result.output.matchAll(pattern)
        for (const match of matches) {
          const content = match[1].trim()
          const existing = keyPoints.find(kp =>
            kp.category === category &&
            this.calculateTextSimilarity(kp.content, content) > 0.7
          )

          if (existing) {
            if (!existing.source.includes(result.expertId)) {
              existing.source.push(result.expertId)
              existing.confidence = Math.max(existing.confidence, result.confidence)
            }
          } else {
            keyPoints.push({
              content,
              source: [result.expertId],
              confidence: result.confidence,
              category: category as KeyPoint['category'],
            })
          }
        }
      }
    }

    return keyPoints.sort((a, b) => b.source.length - a.source.length)
  }

  private detectConflicts(results: ExpertResult[]): DetailedConflict[] {
    const conflicts: DetailedConflict[] = []

    const contradictionPatterns = [
      { positive: /should|recommend|must/i, negative: /should not|shouldn't|avoid|don't/i },
      { positive: /safe|secure/i, negative: /unsafe|insecure|vulnerable/i },
      { positive: /correct|right|proper/i, negative: /wrong|incorrect|improper/i },
    ]

    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const r1 = results[i]
        const r2 = results[j]

        for (const pattern of contradictionPatterns) {
          const r1HasPositive = pattern.positive.test(r1.output)
          const r1HasNegative = pattern.negative.test(r1.output)
          const r2HasPositive = pattern.positive.test(r2.output)
          const r2HasNegative = pattern.negative.test(r2.output)

          if ((r1HasPositive && r2HasNegative) || (r1HasNegative && r2HasPositive)) {
            conflicts.push({
              id: `conflict-${conflicts.length + 1}`,
              topic: 'Approach recommendation',
              experts: [
                { expertId: r1.expertId, position: 'One approach', confidence: r1.confidence },
                { expertId: r2.expertId, position: 'Different approach', confidence: r2.confidence },
              ],
              severity: Math.abs(r1.confidence - r2.confidence) < 0.2 ? 'high' : 'medium',
              resolution: r1.confidence > r2.confidence
                ? `Consider ${r1.expertId}'s recommendation (higher confidence)`
                : `Consider ${r2.expertId}'s recommendation (higher confidence)`,
            })
          }
        }
      }
    }

    return conflicts
  }

  private mergeRecommendations(results: ExpertResult[]): MergedRecommendation[] {
    const recommendations: MergedRecommendation[] = []
    const recommendationPattern = /(?:recommend|suggest|should)[:\s]+([^.!?]+[.!?])/gi

    for (const result of results) {
      const matches = result.output.matchAll(recommendationPattern)
      for (const match of matches) {
        const action = match[1].trim()

        const existing = recommendations.find(r =>
          this.calculateTextSimilarity(r.action, action) > 0.6
        )

        if (existing) {
          if (!existing.supportingExperts.includes(result.expertId)) {
            existing.supportingExperts.push(result.expertId)
            existing.confidence = Math.max(existing.confidence, result.confidence)
          }
        } else {
          recommendations.push({
            action,
            priority: result.confidence > 0.8 ? 'high' : result.confidence > 0.5 ? 'medium' : 'low',
            supportingExperts: [result.expertId],
            confidence: result.confidence,
            rationale: `Identified by ${result.expertId} expert`,
          })
        }
      }
    }

    return recommendations.sort((a, b) => b.supportingExperts.length - a.supportingExperts.length)
  }

  private sortByConfidence(results: ExpertResult[]): ExpertResult[] {
    return [...results].sort((a, b) => b.confidence - a.confidence)
  }

  private groupKeyPoints(points: KeyPoint[]): Record<string, KeyPoint[]> {
    return points.reduce((acc, point) => {
      acc[point.category] = acc[point.category] || []
      acc[point.category].push(point)
      return acc
    }, {} as Record<string, KeyPoint[]>)
  }

  private formatCategory(category: string): string {
    const titles: Record<string, string> = {
      recommendation: '💡 Recommendations',
      finding: '🔍 Findings',
      warning: '⚠️ Warnings',
      action: '✅ Actions Required',
    }
    return titles[category] || category
  }

  private summarizeOutput(output: string, maxLength: number = 300): string {
    if (output.length <= maxLength) return output

    const sentences = output.split(/[.!?]+/)
    let summary = ''

    for (const sentence of sentences) {
      if ((summary + sentence).length > maxLength) break
      summary += sentence.trim() + '. '
    }

    return summary.trim() || output.slice(0, maxLength) + '...'
  }
}

export const resultComparator = new ResultComparator()
