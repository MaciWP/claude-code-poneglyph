import { readFile } from 'fs/promises'
import { join } from 'path'
import { parse as parseYaml } from 'yaml'
import { logger } from '../logger'
import { agentRegistry } from './agent-registry'
import { searchRelevantMemories } from './memory'
import type { MemorySearchResult } from './memory/types'
import { promptClassifier } from './prompt-classifier'

const log = logger.child('orchestrator')

interface Intent {
  name: string
  keywords: string[]
  agent: string
  workflow?: string[]
  description: string
}

interface IntentsConfig {
  version: string
  intents: Intent[]
}

interface ClassifiedIntent {
  primary: string
  confidence: number
  matchedKeywords: string[]
  suggestedAgent: string
  workflow: string[]
}

interface EnrichedPrompt {
  systemContext: string
  delegationHints: string
  originalPrompt: string
  metadata: {
    intent: ClassifiedIntent
    orchestrationMode: boolean
    promptEngineerActive?: boolean
    complexityScore: number
    detectedDomains: string[]
  }
}

let cachedRules: string | null = null
let cachedIntents: IntentsConfig | null = null
let cachedPromptEngineerSkill: string | null = null

async function loadPromptEngineerSkill(): Promise<string> {
  if (cachedPromptEngineerSkill) return cachedPromptEngineerSkill

  const skillPath = join(process.cwd(), '../../.claude/skills/prompt-engineer/SKILL.md')
  try {
    const file = Bun.file(skillPath)
    if (await file.exists()) {
      cachedPromptEngineerSkill = await file.text()
      log.info('Loaded prompt-engineer skill')
      return cachedPromptEngineerSkill
    }
    log.debug('prompt-engineer skill not found', { path: skillPath })
  } catch (error) {
    log.warn('Failed to load prompt-engineer skill', { error: String(error) })
  }
  return ''
}

const VAGUE_WORDS = [
  'somehow', 'maybe', 'various', 'some', 'stuff', 'things',
  'better', 'improve', 'optimize', 'fix', 'arregla', 'mejora',
  'algo', 'eso', 'esto', 'make it work', 'hazlo funcionar'
]

function requiresDelegation(intent: ClassifiedIntent, prompt: string): boolean {
  // Condition 1: Workflow with more than 1 agent
  if (intent.workflow && intent.workflow.length > 1) {
    return true
  }

  // Condition 2: Prompt contains vague words
  const promptLower = prompt.toLowerCase()
  const hasVagueWords = VAGUE_WORDS.some(word => promptLower.includes(word))

  // Condition 3: Prompt too short (< 30 chars) for implementation tasks
  const isTooShort = prompt.length < 30 &&
    ['implementation', 'debugging', 'refactoring'].includes(intent.primary)

  return hasVagueWords || isTooShort
}

function buildPromptEngineerContext(skillContent: string): string {
  return `
## Active Skill: prompt-engineer

**IMPORTANT**: Before invoking any Task() tool, apply the patterns from this skill to improve the prompt you send to the agent.

${skillContent}

### Quick Checklist Before Task() Invocation:
1. ✅ Clear action verb (find, implement, analyze, review)
2. ✅ Specific target (files, components, functions)
3. ✅ Expected output format
4. ✅ Success criteria
`
}

async function loadOrchestrationRules(): Promise<string> {
  if (cachedRules) return cachedRules

  const rulesPath = join(import.meta.dir, '../../expertise/orchestration-rules.md')
  try {
    cachedRules = await readFile(rulesPath, 'utf-8')
    log.info('Loaded orchestration rules')
    return cachedRules
  } catch (error) {
    log.warn('Failed to load orchestration rules, using defaults')
    return getDefaultRules()
  }
}

async function loadIntents(): Promise<IntentsConfig> {
  if (cachedIntents) return cachedIntents

  const intentsPath = join(import.meta.dir, '../../expertise/intents.yaml')
  try {
    const content = await readFile(intentsPath, 'utf-8')
    cachedIntents = parseYaml(content) as IntentsConfig
    log.info('Loaded intents config')
    return cachedIntents
  } catch (error) {
    log.warn('Failed to load intents, using defaults')
    return getDefaultIntents()
  }
}

function getDefaultRules(): string {
  return `
## ORCHESTRATION MODE

You are an ORCHESTRATOR. Your job is to coordinate agents, not do work directly.

RULES:
1. Use Task tool for ALL code-related work
2. Delegate to Explore agent before any file operations
3. Never use Read/Edit/Write directly

Available agents:
- Explore: Scout codebase
- Plan: Design approach
- general-purpose: Implement
- code-quality: Review
`
}

function getDefaultIntents(): IntentsConfig {
  return {
    version: '1.0',
    intents: [
      {
        name: 'implementation',
        keywords: ['implement', 'create', 'add', 'build', 'make'],
        agent: 'general-purpose',
        workflow: ['Explore', 'general-purpose'],
        description: 'Creating new features'
      },
      {
        name: 'exploration',
        keywords: ['find', 'search', 'where', 'how', 'what'],
        agent: 'Explore',
        description: 'Understanding codebase'
      }
    ]
  }
}

export function classifyIntent(prompt: string): ClassifiedIntent {
  const config = cachedIntents || getDefaultIntents()
  const promptLower = prompt.toLowerCase()

  let bestMatch: Intent | null = null
  let bestScore = 0
  let matchedKeywords: string[] = []

  for (const intent of config.intents) {
    const matches = intent.keywords.filter((kw) =>
      promptLower.includes(kw.toLowerCase())
    )

    if (matches.length > bestScore) {
      bestScore = matches.length
      bestMatch = intent
      matchedKeywords = matches
    }
  }

  if (!bestMatch) {
    return {
      primary: 'general',
      confidence: 0.3,
      matchedKeywords: [],
      suggestedAgent: 'general-purpose',
      workflow: ['Explore', 'general-purpose']
    }
  }

  const confidence = Math.min(0.9, 0.5 + bestScore * 0.15)

  return {
    primary: bestMatch.name,
    confidence,
    matchedKeywords,
    suggestedAgent: bestMatch.agent,
    workflow: bestMatch.workflow || [bestMatch.agent]
  }
}

function buildDelegationHints(intent: ClassifiedIntent): string {
  const agentDescriptions: Record<string, string> = {
    'Explore': 'Use Task(subagent_type="Explore") to scout the codebase first',
    'Plan': 'Use Task(subagent_type="Plan") to design the approach',
    'general-purpose': 'Use Task(subagent_type="general-purpose") to implement',
    'code-quality': 'Use Task(subagent_type="code-quality") to review',
    'refactor-agent': 'Use Task(subagent_type="refactor-agent") to refactor'
  }

  const steps = intent.workflow.map((agent, i) => {
    const desc = agentDescriptions[agent] || `Use ${agent} agent`
    return `${i + 1}. ${desc}`
  })

  return `
## Delegation Plan for this request

Intent detected: **${intent.primary}** (confidence: ${(intent.confidence * 100).toFixed(0)}%)

Recommended workflow:
${steps.join('\n')}

REMEMBER: Do NOT do the work yourself. Delegate to agents.
`
}

/**
 * Generate proactive hints based on complexity level
 * These hints encourage Claude to delegate work to specialized agents
 */
function getProactiveHints(complexity: number, domains: string[]): string {
  if (complexity < 40) return ''

  const level = complexity >= 70 ? 'aggressive' : 'proactive'
  const domainHints = domains.length > 0
    ? domains.map(d => `- ${d}: Consider specialized agent`).join('\n')
    : '- general: Use appropriate agent based on task type'

  return `
[Orchestration Hints - Level: ${level}]
Task complexity: ${complexity}/100

PROACTIVE DELEGATION GUIDANCE:
${level === 'aggressive' ? 'You SHOULD delegate subtasks to specialized agents. ' : 'Consider delegating when the task involves multiple steps or files. '}

Detected domains:
${domainHints}

RECOMMENDED WORKFLOW:
1. For exploration/understanding: Task tool with subagent_type="scout" or "Explore"
2. For planning multi-step work: Task tool with subagent_type="architect" or "Plan"
3. For implementation: Task tool with subagent_type="builder" or "general-purpose"
4. For validation: Task tool with subagent_type="reviewer" or "code-quality"

${level === 'aggressive' ? 'IMPORTANT: Complex tasks benefit from delegation. Do not try to handle everything directly - use the Task tool proactively.' : ''}
---
`
}

export async function enrichPrompt(
  userPrompt: string,
  options: { forceOrchestration?: boolean } = {}
): Promise<EnrichedPrompt> {
  await loadIntents()
  const rules = await loadOrchestrationRules()
  const intent = classifyIntent(userPrompt)
  const delegationHints = buildDelegationHints(intent)

  // Use classifier for complexity scoring
  const classification = promptClassifier.classify(userPrompt)
  const complexityScore = classification.complexityScore
  const detectedDomains = classification.domains

  // Generate proactive hints based on complexity
  const proactiveHints = getProactiveHints(complexityScore, detectedDomains)

  // Search for relevant memories to provide context
  let memoryContext = ''
  try {
    const memories = await searchRelevantMemories(userPrompt, { limit: 3, useSemanticSearch: true })
    if (memories.length > 0) {
      memoryContext = `
## Relevant Context from Memory

${memories.map((m: MemorySearchResult) => `- ${m.memory.content}`).join('\n')}
`
      log.debug('Found relevant memories', { count: memories.length })
    }
  } catch (error) {
    log.debug('Memory search skipped', { error: String(error) })
  }

  // Check if prompt-engineer skill should be activated
  const shouldEnhance = requiresDelegation(intent, userPrompt)
  let promptEngineerContext = ''

  if (shouldEnhance) {
    const skillContent = await loadPromptEngineerSkill()
    if (skillContent) {
      promptEngineerContext = buildPromptEngineerContext(skillContent)
      log.debug('Activated prompt-engineer skill')
    }
  }

  const systemContext = `
${rules}
${proactiveHints}
${promptEngineerContext ? `\n---\n${promptEngineerContext}` : ''}
---

${delegationHints}
${memoryContext}
`

  log.debug('Enriched prompt', {
    intent: intent.primary,
    confidence: intent.confidence,
    workflow: intent.workflow,
    complexityScore,
    detectedDomains,
    hasMemories: memoryContext.length > 0,
    promptEngineerActive: shouldEnhance
  })

  return {
    systemContext,
    delegationHints,
    originalPrompt: userPrompt,
    metadata: {
      intent,
      orchestrationMode: options.forceOrchestration ?? true,
      promptEngineerActive: shouldEnhance,
      complexityScore,
      detectedDomains
    }
  }
}

export function formatEnrichedPrompt(enriched: EnrichedPrompt): string {
  return `
${enriched.systemContext}

---

## User Request:

${enriched.originalPrompt}
`
}

export function clearCache(): void {
  cachedRules = null
  cachedIntents = null
  cachedPromptEngineerSkill = null
  log.info('Cleared orchestrator cache')
}

export const orchestrator = {
  enrichPrompt,
  classifyIntent,
  formatEnrichedPrompt,
  clearCache,
  registry: agentRegistry,
}
