import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { logger } from '../logger'
import type { QAResult, QAStepResult } from '../types/qa'

const log = logger.child('qa-store')

export class QAStore {
  private basePath: string
  private runs: Map<string, QAResult>
  private loaded: boolean

  constructor(basePath?: string) {
    this.basePath = basePath || join(process.cwd(), '.claude', 'qa-results')
    this.runs = new Map()
    this.loaded = false
  }

  private get filePath(): string {
    return join(this.basePath, 'runs.json')
  }

  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      await this.load()
      this.loaded = true
    }
  }

  async createRun(run: QAResult): Promise<QAResult> {
    await this.ensureLoaded()
    this.runs.set(run.id, run)
    await this.persist(run)
    log.debug('Created QA run', { id: run.id, storyName: run.storyName })
    return run
  }

  async updateRun(id: string, updates: Partial<QAResult>): Promise<QAResult | null> {
    await this.ensureLoaded()
    const existing = this.runs.get(id)
    if (!existing) {
      log.warn('Attempted to update non-existent run', { id })
      return null
    }

    const updated: QAResult = { ...existing, ...updates, id: existing.id }
    this.runs.set(id, updated)
    await this.persist(updated)
    log.debug('Updated QA run', { id, status: updated.status })
    return updated
  }

  async addStep(runId: string, step: QAStepResult): Promise<QAResult | null> {
    await this.ensureLoaded()
    const existing = this.runs.get(runId)
    if (!existing) {
      log.warn('Attempted to add step to non-existent run', { runId })
      return null
    }

    const existingStepIdx = existing.steps.findIndex((s) => s.index === step.index)
    if (existingStepIdx >= 0) {
      existing.steps[existingStepIdx] = step
    } else {
      existing.steps.push(step)
    }

    this.runs.set(runId, existing)
    await this.persist(existing)
    return existing
  }

  async getAll(options?: {
    limit?: number
    status?: QAResult['status']
    storyName?: string
  }): Promise<QAResult[]> {
    await this.ensureLoaded()
    let results = Array.from(this.runs.values())

    if (options?.status) {
      results = results.filter((r) => r.status === options.status)
    }

    if (options?.storyName) {
      results = results.filter((r) => r.storyName === options.storyName)
    }

    results.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())

    if (options?.limit) {
      results = results.slice(0, options.limit)
    }

    return results
  }

  async getById(id: string): Promise<QAResult | null> {
    await this.ensureLoaded()
    return this.runs.get(id) || null
  }

  async getByStory(storyName: string): Promise<QAResult[]> {
    return this.getAll({ storyName })
  }

  private async persist(run: QAResult): Promise<void> {
    try {
      await mkdir(this.basePath, { recursive: true })
      const allRuns = Array.from(this.runs.values())
      await writeFile(this.filePath, JSON.stringify(allRuns, null, 2))
    } catch (error) {
      log.error('Failed to persist QA run', { id: run.id, error: String(error) })
    }
  }

  private async load(): Promise<void> {
    try {
      if (!existsSync(this.filePath)) {
        return
      }
      const content = await readFile(this.filePath, 'utf-8')
      const runs: QAResult[] = JSON.parse(content)
      for (const run of runs) {
        this.runs.set(run.id, run)
      }
      log.info('Loaded QA runs from disk', { count: runs.length })
    } catch (error) {
      log.warn('Failed to load QA runs, starting fresh', { error: String(error) })
    }
  }
}

export const qaStore = new QAStore()
