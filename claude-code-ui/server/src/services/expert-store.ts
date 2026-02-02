import { readFile, writeFile, readdir, access, mkdir } from 'fs/promises'
import { join } from 'path'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { logger } from '../logger'
import { agentPromptCache } from '../cache'

const log = logger.child('expert-store')

export interface ExpertiseKeyFile {
  path: string
  purpose: string
  patterns?: string[]
  last_verified?: string
}

export interface ExpertisePattern {
  name: string
  confidence: number
  usage?: string
  example?: string
  gotchas?: string[]
}

export interface ExpertiseIssue {
  id: string
  symptom: string
  root_cause?: string
  solution: string
  verified: boolean
  date_found?: string
}

export interface ExpertiseChangelog {
  date: string
  type: 'learned' | 'corrected' | 'verified' | 'deprecated'
  source: string
  change: string
  confidence_delta?: number
}

export interface ExpertiseValidation {
  required_files?: string[]
  required_patterns?: Array<{
    file: string
    pattern: string
    description: string
  }>
  validate_every?: string
}

export interface Expertise {
  domain: string
  version: string
  last_updated: string
  last_updated_by: 'manual' | 'self-improve' | 'bootstrap'
  confidence: number
  mental_model: {
    overview: string
    architecture?: {
      type: string
      framework?: string
      protocol?: string
      diagram?: string
    }
    key_files: ExpertiseKeyFile[]
    relationships?: Array<{
      from: string
      to: string
      type: string
      description?: string
    }>
  }
  patterns?: ExpertisePattern[]
  known_issues?: ExpertiseIssue[]
  changelog?: ExpertiseChangelog[]
  validation?: ExpertiseValidation
}

export interface ExpertSummary {
  id: string
  domain: string
  confidence: number
  lastUpdated: string
}

export class ExpertStore {
  private basePath: string
  private cache: Map<string, Expertise> = new Map()

  constructor(basePath?: string) {
    this.basePath = basePath || join(process.cwd(), '..', '..', '.claude', 'experts')
  }

  async list(): Promise<ExpertSummary[]> {
    try {
      const dirs = await readdir(this.basePath, { withFileTypes: true })

      const expertDirs = dirs.filter(
        dir => dir.isDirectory() && !dir.name.startsWith('_')
      )

      const results = await Promise.allSettled(
        expertDirs.map(async dir => {
          const expertise = await this.load(dir.name)
          return {
            id: dir.name,
            domain: expertise.domain,
            confidence: expertise.confidence,
            lastUpdated: expertise.last_updated
          }
        })
      )

      // Log failures for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          log.warn('Failed to load expert', {
            id: expertDirs[index].name,
            error: String(result.reason)
          })
        }
      })

      return results
        .filter((r): r is PromiseFulfilledResult<ExpertSummary> => r.status === 'fulfilled')
        .map(r => r.value)
    } catch (error) {
      log.warn('Failed to list experts', { error: String(error) })
      return []
    }
  }

  async load(expertId: string): Promise<Expertise> {
    if (this.cache.has(expertId)) {
      return this.cache.get(expertId)!
    }

    const filePath = join(this.basePath, expertId, 'expertise.yaml')

    try {
      const content = await readFile(filePath, 'utf-8')
      const expertise = parseYaml(content) as Expertise

      this.cache.set(expertId, expertise)
      log.debug('Loaded expertise', { expertId, confidence: expertise.confidence })

      return expertise
    } catch (error) {
      throw new Error(`Failed to load expertise for ${expertId}: ${error}`)
    }
  }

  async save(expertId: string, expertise: Expertise): Promise<void> {
    const dirPath = join(this.basePath, expertId)
    const filePath = join(dirPath, 'expertise.yaml')

    try {
      await mkdir(dirPath, { recursive: true })
      const content = stringifyYaml(expertise, { lineWidth: 0 })
      await writeFile(filePath, content)

      this.cache.set(expertId, expertise)
      log.info('Saved expertise', { expertId, version: expertise.version })
    } catch (error) {
      throw new Error(`Failed to save expertise for ${expertId}: ${error}`)
    }
  }

  async update(expertId: string, updates: Partial<Expertise>): Promise<Expertise> {
    const current = await this.load(expertId)

    const updated: Expertise = {
      ...current,
      ...updates,
      last_updated: new Date().toISOString(),
      version: this.incrementVersion(current.version)
    }

    await this.save(expertId, updated)
    return updated
  }

  async addChangelogEntry(
    expertId: string,
    entry: Omit<ExpertiseChangelog, 'date'>
  ): Promise<void> {
    const expertise = await this.load(expertId)

    const newEntry: ExpertiseChangelog = {
      date: new Date().toISOString().split('T')[0],
      ...entry
    }

    expertise.changelog = expertise.changelog || []
    expertise.changelog.unshift(newEntry)

    if (entry.confidence_delta) {
      expertise.confidence = Math.max(0, Math.min(1,
        expertise.confidence + entry.confidence_delta
      ))
    }

    await this.save(expertId, expertise)
    log.debug('Added changelog entry', { expertId, type: entry.type })
  }

  async validate(expertId: string): Promise<{
    valid: boolean
    errors: string[]
    warnings: string[]
  }> {
    const expertise = await this.load(expertId)
    const errors: string[] = []
    const warnings: string[] = []

    if (expertise.validation?.required_files) {
      for (const file of expertise.validation.required_files) {
        try {
          await access(join(process.cwd(), file))
        } catch {
          // File access check failed - file does not exist
          errors.push(`Required file not found: ${file}`)
        }
      }
    }

    for (const file of expertise.mental_model?.key_files ?? []) {
      if (file.last_verified) {
        const lastVerified = new Date(file.last_verified)
        const daysSince = (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60 * 24)
        if (daysSince > 7) {
          warnings.push(`File ${file.path} not verified in ${Math.floor(daysSince)} days`)
        }
      }
    }

    if (expertise.confidence < 0.5) {
      warnings.push(`Low confidence (${expertise.confidence.toFixed(2)}) - consider re-validation`)
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  async getAgentPrompt(expertId: string): Promise<string | null> {
    // Check cache first (5 min TTL)
    const cacheKey = `agent-prompt:${expertId}`
    const cached = agentPromptCache.get(cacheKey)
    if (cached !== undefined) {
      log.debug('Using cached agent prompt', { expertId })
      return cached
    }

    const filePath = join(this.basePath, expertId, 'agent.md')

    try {
      const prompt = await readFile(filePath, 'utf-8')
      agentPromptCache.set(cacheKey, prompt)
      log.debug('Cached agent prompt', { expertId })
      return prompt
    } catch {
      // Agent prompt file does not exist - this is expected for experts without custom prompts
      log.debug('No agent prompt found', { expertId })
      // Cache null results too to avoid repeated lookups
      agentPromptCache.set(cacheKey, null)
      return null
    }
  }

  async exists(expertId: string): Promise<boolean> {
    try {
      await access(join(this.basePath, expertId, 'expertise.yaml'))
      return true
    } catch {
      // Expert directory or file does not exist
      return false
    }
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number)
    parts[2] = (parts[2] || 0) + 1
    return parts.join('.')
  }

  clearCache(): void {
    this.cache.clear()
    log.debug('Cleared expertise cache')
  }
}

export const expertStore = new ExpertStore()
