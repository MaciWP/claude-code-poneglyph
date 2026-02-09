import {
  DOMAIN_KEYWORDS,
  COMPLEXITY_INDICATORS,
  TRIVIAL_INDICATORS,
} from '../config/domain-keywords'
import { logger } from '../logger'

const log = logger.child('prompt-classifier')

export interface ClassificationResult {
  complexityScore: number
  domains: string[]
  estimatedToolCalls: number
  requiresDelegation: boolean
  suggestedExperts: string[]
  suggestedAgents: string[]
  reasoning: string
}

export interface ClassifierConfig {
  trivialThreshold: number
  complexThreshold: number
  domainKeywords: Record<string, string[]>
}

const DEFAULT_CONFIG: ClassifierConfig = {
  trivialThreshold: 50, // Subido de 30 para evitar delegación excesiva
  complexThreshold: 70, // Subido de 60 para mejor gradación
  domainKeywords: DOMAIN_KEYWORDS,
}

export class PromptClassifier {
  private config: ClassifierConfig
  private availableExperts: string[]

  constructor(config: Partial<ClassifierConfig> = {}, availableExperts: string[] = []) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.availableExperts = availableExperts
  }

  classify(prompt: string, sessionContext?: string): ClassificationResult {
    const domains = this.detectDomains(prompt)
    let complexityScore = this.calculateComplexity(prompt, domains)

    const isFollowUp = sessionContext ? this.isFollowUpPrompt(prompt) : false
    if (isFollowUp && complexityScore > 40) {
      const originalScore = complexityScore
      complexityScore = Math.max(30, complexityScore - 20)
      log.info(`Follow-up detected, reduced complexity: ${originalScore} → ${complexityScore}`)
    }

    const estimatedToolCalls = this.estimateToolCalls(complexityScore, domains)
    const requiresDelegation = complexityScore > this.config.trivialThreshold
    const suggestedExperts = this.matchExperts(domains)
    const suggestedAgents = this.suggestAgents(complexityScore, domains)
    const followUpInfo = isFollowUp ? ' [FOLLOW-UP: complexity reduced]' : ''
    const reasoning =
      this.generateReasoning(prompt, complexityScore, domains, requiresDelegation) + followUpInfo

    log.debug('Classified prompt', {
      complexityScore,
      domains,
      requiresDelegation,
      suggestedExperts,
      suggestedAgents,
    })

    return {
      complexityScore,
      domains,
      estimatedToolCalls,
      requiresDelegation,
      suggestedExperts,
      suggestedAgents,
      reasoning,
    }
  }

  private detectDomains(prompt: string): string[] {
    const detected: string[] = []
    const lowerPrompt = prompt.toLowerCase()

    for (const [domain, keywords] of Object.entries(this.config.domainKeywords)) {
      if (keywords.some((kw) => lowerPrompt.includes(kw.toLowerCase()))) {
        detected.push(domain)
      }
    }

    return detected
  }

  private calculateComplexity(prompt: string, domains: string[]): number {
    let score = 0

    if (this.isTrivial(prompt)) {
      return 15
    }

    if (COMPLEXITY_INDICATORS.multiFile.test(prompt)) score += 20
    if (COMPLEXITY_INDICATORS.newFeature.test(prompt)) score += 15
    if (COMPLEXITY_INDICATORS.refactor.test(prompt)) score += 25
    if (COMPLEXITY_INDICATORS.debugging.test(prompt)) score += 10
    if (COMPLEXITY_INDICATORS.integration.test(prompt)) score += 20
    if (COMPLEXITY_INDICATORS.analysis.test(prompt)) score += 10

    score += Math.max(0, (domains.length - 1) * 10)

    const wordCount = prompt.split(/\s+/).length
    if (wordCount > 50) score += 10
    if (wordCount > 100) score += 10

    return Math.min(100, score)
  }

  private isTrivial(prompt: string): boolean {
    // Solo considerar trivial por longitud o keywords simples
    // NO bloquear preguntas "what/how/where" - pueden requerir exploración
    return TRIVIAL_INDICATORS.simple.test(prompt) || prompt.length < 30
  }

  private isFollowUpPrompt(prompt: string): boolean {
    const followUpPatterns =
      /^(fix|update|change|also|now|next|then|continue|ejecuta|sigue|hazlo|aplica|ahora|tambien|además|modifica|cambia|corrige|arregla|haz|do it|go ahead|proceed|make it|apply)/i
    return followUpPatterns.test(prompt.trim())
  }

  private estimateToolCalls(complexity: number, domains: string[]): number {
    const base = 3
    const complexityFactor = Math.floor(complexity / 10) * 2
    const domainFactor = Math.max(0, domains.length - 1) * 3

    return base + complexityFactor + domainFactor
  }

  private matchExperts(domains: string[]): string[] {
    return this.availableExperts.filter((expert) => {
      const expertLower = expert.toLowerCase()
      return domains.some((domain) => {
        const domainLower = domain.toLowerCase()
        return (
          expertLower === domainLower ||
          expertLower === `${domainLower}-expert` ||
          expertLower.startsWith(`${domainLower}-`) ||
          expertLower.endsWith(`-${domainLower}`)
        )
      })
    })
  }

  private suggestAgents(complexity: number, _domains: string[]): string[] {
    const agents: string[] = []

    if (complexity > 40) {
      agents.push('scout')
    }

    if (complexity > 60) {
      agents.push('architect')
    }

    agents.push('builder')

    if (complexity > 50) {
      agents.push('reviewer')
    }

    return agents
  }

  private generateReasoning(
    _prompt: string,
    complexity: number,
    domains: string[],
    _requiresDelegation: boolean
  ): string {
    const domainStr = domains.length > 0 ? domains.join(', ') : 'general'

    if (complexity > 60) {
      return `High complexity (${complexity}/100). Domains: [${domainStr}]. Requires delegation to specialized agents.`
    } else if (complexity > 30) {
      return `Medium complexity (${complexity}/100). Domains: [${domainStr}]. Delegation recommended.`
    } else {
      return `Low complexity (${complexity}/100). Can be handled directly.`
    }
  }

  setAvailableExperts(experts: string[]): void {
    this.availableExperts = experts
  }
}

export const promptClassifier = new PromptClassifier()
