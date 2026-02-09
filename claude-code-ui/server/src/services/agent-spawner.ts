import { EventEmitter } from 'events'
import { ClaudeService, type CLIOptions } from './claude'
import { agentRegistry as defaultAgentRegistry, type AgentType } from './agent-registry'
import { expertStore as defaultExpertStore, type ExpertStore } from './expert-store'
import { logger } from '../logger'
import type { StreamChunk } from '@shared/types'

const log = logger.child('agent-spawner')

type AgentRegistry = typeof defaultAgentRegistry

export interface SpawnConfig {
  type: string
  prompt: string
  sessionId: string
  parentExecutionId?: string
  maxTokens?: number
  timeout?: number
  workDir?: string
  expertId?: string
  allowFullPC?: boolean
}

export interface SpawnResult {
  agentId: string
  output: string
  fullOutput?: string // Output completo si fue truncado
  success: boolean
  metrics: {
    toolCalls: number
    durationMs: number
    tokensUsed: number
  }
  extractedMeta?: {
    filesModified: string[]
    filesRead: string[]
    errors: string[]
  }
}

const MAX_OUTPUT_LENGTH = 50000
const TRUNCATE_MESSAGE = '\n\n[Output truncado - resultado completo disponible]'

interface ActiveSpawn {
  agentId: string
  abort: () => void
  startTime: number
  timeoutHandle?: ReturnType<typeof setTimeout>
}

export interface AgentSpawnerOptions {
  defaultTimeout?: number
  defaultMaxTokens?: number
  agentRegistry?: AgentRegistry
  expertStore?: ExpertStore
}

export class AgentSpawner extends EventEmitter {
  private claudeService: ClaudeService
  private agentRegistry: AgentRegistry
  private expertStore: ExpertStore
  private activeSpawns: Map<string, ActiveSpawn> = new Map()
  private defaultTimeout: number
  private defaultMaxTokens: number

  constructor(claudeService: ClaudeService, options?: AgentSpawnerOptions) {
    super()
    this.claudeService = claudeService
    this.agentRegistry = options?.agentRegistry ?? defaultAgentRegistry
    this.expertStore = options?.expertStore ?? defaultExpertStore
    this.defaultTimeout = options?.defaultTimeout ?? 5 * 60 * 1000 // 5 minutes
    this.defaultMaxTokens = options?.defaultMaxTokens ?? 500
  }

  async spawn(config: SpawnConfig): Promise<SpawnResult> {
    const startTime = Date.now()
    const timeout = config.timeout ?? this.defaultTimeout
    const maxTokens = config.maxTokens ?? this.defaultMaxTokens

    const agentType = this.normalizeAgentType(config.type)
    const agent = this.agentRegistry.createAgent({
      type: agentType,
      sessionId: config.sessionId,
      task: config.prompt.slice(0, 200),
      parentAgentId: config.parentExecutionId,
    })

    log.info('Spawning agent', {
      agentId: agent.id,
      type: config.type,
      sessionId: config.sessionId,
      timeout,
      hasExpert: !!config.expertId,
    })

    const enrichedPrompt = await this.buildEnrichedPrompt(config, maxTokens)

    const cliOptions: CLIOptions = {
      prompt: enrichedPrompt,
      sessionId: config.sessionId,
      workDir: config.workDir,
      outputFormat: 'stream-json',
      bypassPermissions: true,
      allowFullPC: config.allowFullPC ?? false,
    }

    const { stream, abort } = this.claudeService.streamCLIWithAbort(cliOptions)

    this.agentRegistry.startAgent(agent.id)
    this.emit('spawned', { agentId: agent.id, type: config.type })

    const timeoutHandle = setTimeout(() => {
      log.warn('Agent timeout', { agentId: agent.id, timeout })
      this.kill(agent.id)
    }, timeout)

    this.activeSpawns.set(agent.id, {
      agentId: agent.id,
      abort,
      startTime,
      timeoutHandle,
    })

    try {
      const result = await this.consumeStream(agent.id, stream)

      clearTimeout(timeoutHandle)
      this.activeSpawns.delete(agent.id)

      const durationMs = Date.now() - startTime

      this.agentRegistry.completeAgent(agent.id, result.output, {
        tokensUsed: result.tokensUsed,
        toolCalls: result.toolCalls,
        expertiseUsed: config.expertId,
      })

      this.emit('completed', {
        agentId: agent.id,
        success: true,
        toolCalls: result.toolCalls,
        durationMs,
      })

      log.info('Agent completed', {
        agentId: agent.id,
        toolCalls: result.toolCalls,
        durationMs,
        outputLength: result.output.length,
      })

      // Truncar output si es muy largo
      const truncatedOutput =
        result.output.length > MAX_OUTPUT_LENGTH
          ? result.output.substring(0, MAX_OUTPUT_LENGTH) + TRUNCATE_MESSAGE
          : result.output

      return {
        agentId: agent.id,
        output: truncatedOutput,
        fullOutput: result.output.length > MAX_OUTPUT_LENGTH ? result.output : undefined,
        success: true,
        metrics: {
          toolCalls: result.toolCalls,
          durationMs,
          tokensUsed: result.tokensUsed,
        },
        extractedMeta: result.extractedMeta,
      }
    } catch (error) {
      clearTimeout(timeoutHandle)
      this.activeSpawns.delete(agent.id)

      const errorMessage = error instanceof Error ? error.message : String(error)
      const durationMs = Date.now() - startTime

      this.agentRegistry.failAgent(agent.id, errorMessage)

      this.emit('error', { agentId: agent.id, error: errorMessage })

      log.error('Agent failed', { agentId: agent.id, error: errorMessage, durationMs })

      return {
        agentId: agent.id,
        output: '',
        success: false,
        metrics: {
          toolCalls: 0,
          durationMs,
          tokensUsed: 0,
        },
      }
    }
  }

  async kill(agentId: string, gracePeriodMs: number = 5000): Promise<boolean> {
    const spawn = this.activeSpawns.get(agentId)
    if (!spawn) {
      log.debug('No active spawn to kill', { agentId })
      return false
    }

    log.info('Killing agent with grace period', { agentId, gracePeriodMs })

    if (spawn.timeoutHandle) {
      clearTimeout(spawn.timeoutHandle)
    }

    spawn.abort()

    if (gracePeriodMs > 0) {
      await new Promise<void>((resolve) => {
        const graceTimeout = setTimeout(() => {
          log.debug('Grace period expired, force cleanup', { agentId })
          this.forceCleanup(agentId)
          resolve()
        }, gracePeriodMs)

        const checkInterval = setInterval(() => {
          if (!this.activeSpawns.has(agentId)) {
            clearTimeout(graceTimeout)
            clearInterval(checkInterval)
            resolve()
          }
        }, 100)
      })
    } else {
      this.forceCleanup(agentId)
    }

    return true
  }

  private forceCleanup(agentId: string): void {
    if (this.activeSpawns.has(agentId)) {
      this.activeSpawns.delete(agentId)
      this.agentRegistry.failAgent(agentId, 'Killed by orchestrator')
      this.emit('killed', { agentId })
    }
  }

  getActiveSpawns(): string[] {
    return Array.from(this.activeSpawns.keys())
  }

  private async consumeStream(
    agentId: string,
    stream: AsyncGenerator<StreamChunk>
  ): Promise<{
    output: string
    toolCalls: number
    tokensUsed: number
    extractedMeta: { filesModified: string[]; filesRead: string[]; errors: string[] }
  }> {
    let output = ''
    let toolCalls = 0
    let tokensUsed = 0

    const filesModified: string[] = []
    const filesRead: string[] = []
    const extractedErrors: string[] = []

    for await (const chunk of stream) {
      if (chunk.type === 'tool_use') {
        toolCalls++
        this.agentRegistry.incrementToolCalls(agentId)
        this.emit('tool_use', {
          agentId,
          tool: chunk.tool,
          toolCalls,
          toolUseId: chunk.toolUseId,
          toolInput: chunk.toolInput,
        })

        const toolName = chunk.tool ?? ''
        const input = chunk.toolInput as Record<string, unknown> | undefined
        const filePath = typeof input?.file_path === 'string' ? input.file_path : undefined

        if (filePath) {
          if (toolName === 'Edit' || toolName === 'Write') {
            if (!filesModified.includes(filePath)) {
              filesModified.push(filePath)
            }
          } else if (toolName === 'Read') {
            if (!filesRead.includes(filePath)) {
              filesRead.push(filePath)
            }
          }
        }
      }

      if (chunk.type === 'text' && chunk.data) {
        output += chunk.data
        this.emit('text', { agentId, data: chunk.data })
      }

      if (chunk.type === 'tool_result') {
        this.emit('tool_result', {
          agentId,
          tool: chunk.tool,
          toolUseId: chunk.toolUseId,
          toolOutput: chunk.toolOutput,
        })
      }

      if (chunk.type === 'result') {
        if (chunk.data) {
          output = chunk.data
        }
        if (chunk.usage?.totalTokens) {
          tokensUsed = chunk.usage.totalTokens
        }
      }

      if (chunk.type === 'error') {
        extractedErrors.push(chunk.data || 'Unknown stream error')
        throw new Error(chunk.data || 'Unknown stream error')
      }
    }

    return {
      output,
      toolCalls,
      tokensUsed,
      extractedMeta: { filesModified, filesRead, errors: extractedErrors },
    }
  }

  private async buildEnrichedPrompt(config: SpawnConfig, maxTokens: number): Promise<string> {
    let expertContext = ''

    if (config.expertId) {
      try {
        const expertise = await this.expertStore.load(config.expertId)
        const agentPrompt = await this.expertStore.getAgentPrompt(config.expertId)

        expertContext = `
## Expert Context: ${expertise.domain}

### Mental Model
${expertise.mental_model.overview}

### Key Files
${(expertise.mental_model?.key_files ?? []).map((f) => `- \`${f.path}\`: ${f.purpose}`).join('\n')}

${
  expertise.patterns?.length
    ? `### Known Patterns
${expertise.patterns.map((p) => `- **${p.name}** (confidence: ${p.confidence})`).join('\n')}`
    : ''
}

${
  agentPrompt
    ? `### Agent Instructions
${agentPrompt}`
    : ''
}
---
`
        log.debug('Loaded expert context', {
          expertId: config.expertId,
          confidence: expertise.confidence,
        })
      } catch (error) {
        log.warn('Failed to load expert', { expertId: config.expertId, error: String(error) })
      }
    }

    return `${expertContext}
## Task
${config.prompt}

---
## OUTPUT REQUIREMENTS (MANDATORY)

1. Generate a **SUMMARY** at the end (max ${maxTokens} tokens / ~${maxTokens * 4} characters)
2. Format:

\`\`\`
## Summary

### Files Modified
- [list with brief description]

### Key Changes
- [max 5 bullet points]

### Notes
- [any observations]
\`\`\`

3. Do NOT include full code in the summary
4. The Lead Orchestrator only sees your summary
`
  }

  private normalizeAgentType(type: string): AgentType {
    const validTypes: AgentType[] = [
      'scout',
      'architect',
      'builder',
      'reviewer',
      'general-purpose',
      'Explore',
      'Plan',
      'code-quality',
      'refactor-agent',
    ]

    if (type.startsWith('expert:')) {
      return 'general-purpose'
    }

    if (validTypes.includes(type as AgentType)) {
      return type as AgentType
    }

    return 'general-purpose'
  }
}

export const createAgentSpawner = (claudeService: ClaudeService): AgentSpawner => {
  return new AgentSpawner(claudeService)
}
