import { EventEmitter } from 'events'
import { readFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import yaml from 'yaml'
import type { QAResult, QAStory, QAStoryStep, QAStepResult, QAEvent } from '../types/qa'
import { qaStore } from './qa-store'
import { logger } from '../logger'

const log = logger.child('qa-runner')

const PROCESS_TIMEOUT_MS = 60_000

export class QARunner extends EventEmitter {
  private storyBasePath: string
  private evidenceBasePath: string
  private activeProcesses: Map<string, { cancel: () => void }>

  constructor(storyBasePath?: string, evidenceBasePath?: string) {
    super()
    this.storyBasePath = storyBasePath || this.resolveRepoPath('.claude', 'ui-stories')
    this.evidenceBasePath = evidenceBasePath || this.resolveRepoPath('.claude', 'ui-evidence')
    this.activeProcesses = new Map()
  }

  private resolveRepoPath(...segments: string[]): string {
    const cwd = process.cwd()
    const candidates = [
      join(cwd, ...segments),
      join(cwd, '..', ...segments),
      join(cwd, '..', '..', ...segments),
    ]
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate
      }
    }
    return candidates[0]
  }

  private findProjectRoot(): string {
    let dir = process.cwd()
    for (let i = 0; i < 5; i++) {
      if (existsSync(join(dir, 'node_modules', '@playwright', 'test'))) {
        return dir
      }
      const parent = dirname(dir)
      if (parent === dir) break
      dir = parent
    }
    return process.cwd()
  }

  async listStories(): Promise<string[]> {
    try {
      if (!existsSync(this.storyBasePath)) {
        return []
      }
      const files = readdirSync(this.storyBasePath)
      return files
        .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
        .map((f) => f.replace(/\.ya?ml$/, ''))
    } catch (error) {
      log.error('Failed to list stories', { error: String(error) })
      return []
    }
  }

  async checkPlaywright(): Promise<boolean> {
    try {
      const result = Bun.spawnSync(['npx', 'playwright', '--version'], {
        stdout: 'pipe',
        stderr: 'pipe',
      })
      return result.exitCode === 0
    } catch {
      return false
    }
  }

  async runStory(storyName: string): Promise<QAResult> {
    const runId = `${storyName}-${Date.now()}`
    const now = new Date().toISOString()

    const initialResult: QAResult = {
      id: runId,
      storyName,
      status: 'running',
      startedAt: now,
      steps: [],
      screenshots: [],
    }

    const hasPlaywright = await this.checkPlaywright()
    if (!hasPlaywright) {
      const errorMsg = 'Playwright is not installed. Run: npx playwright install'
      this.emitQAEvent({ type: 'qa_error', runId, error: errorMsg })
      return {
        ...initialResult,
        status: 'failed',
        completedAt: new Date().toISOString(),
        error: errorMsg,
      }
    }

    await qaStore.createRun(initialResult)
    this.emitQAEvent({ type: 'qa_started', runId, storyName })

    let story: QAStory
    try {
      story = this.loadStory(storyName)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      await qaStore.updateRun(runId, {
        status: 'failed',
        completedAt: new Date().toISOString(),
        error: errorMsg,
      })
      this.emitQAEvent({ type: 'qa_error', runId, error: errorMsg })
      const updated = await qaStore.getById(runId)
      return updated || { ...initialResult, status: 'failed', error: errorMsg }
    }

    const evidencePath = join(this.evidenceBasePath, storyName)
    if (!existsSync(evidencePath)) {
      mkdirSync(evidencePath, { recursive: true })
    }

    const spec = this.generatePlaywrightSpec(story, evidencePath)
    const specPath = join(evidencePath, `_spec_${runId}.spec.ts`)
    const configPath = join(evidencePath, `_pw_config_${runId}.ts`)
    const stderrPath: string | undefined = join(evidencePath, `_stderr_${runId}.log`)
    let timeout: ReturnType<typeof setTimeout> | undefined

    try {
      await Promise.all([
        Bun.write(specPath, spec),
        Bun.write(configPath, this.generatePlaywrightConfig(evidencePath)),
      ])

      const projectRoot = this.findProjectRoot()
      const nodeModulesPath = join(projectRoot, 'node_modules')

      const normalizedSpecPath = specPath.replace(/\\/g, '/')
      const normalizedConfigPath = configPath.replace(/\\/g, '/')

      const proc = Bun.spawn(
        [
          'npx',
          'playwright',
          'test',
          normalizedSpecPath,
          '--config',
          normalizedConfigPath,
          '--reporter=line',
        ],
        {
          stdout: 'pipe',
          stderr: Bun.file(stderrPath),
          cwd: projectRoot,
          env: {
            ...Bun.env,
            PLAYWRIGHT_HTML_REPORT: 'false',
            FORCE_COLOR: '0',
            NODE_PATH: nodeModulesPath,
          },
        }
      )

      let cancelled = false
      let timedOut = false

      timeout = setTimeout(() => {
        timedOut = true
        proc.kill()
      }, PROCESS_TIMEOUT_MS)

      this.activeProcesses.set(runId, {
        cancel: () => {
          cancelled = true
          proc.kill()
        },
      })

      const allStdoutLines: string[] = []
      const stdout = proc.stdout
      if (stdout) {
        const reader = stdout.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              // eslint-disable-next-line no-control-regex
              const cleaned = line.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim()
              if (!cleaned) continue
              allStdoutLines.push(cleaned)
              try {
                const parsed = JSON.parse(cleaned)
                await this.handleScriptOutput(runId, parsed)
              } catch {
                log.debug('Non-JSON stdout line', { line: cleaned })
              }
            }
          }
        } catch (error) {
          log.warn('Error reading stdout stream', { error: String(error) })
        }
      }

      const exitCode = await proc.exited
      clearTimeout(timeout)
      this.activeProcesses.delete(runId)

      let stderrText = ''
      try {
        const stderrFileObj = Bun.file(stderrPath)
        if (await stderrFileObj.exists()) {
          stderrText = await stderrFileObj.text()
        }
      } catch {
        log.debug('Failed to read stderr file', { stderrPath })
      }

      if (timedOut) {
        const errorMsg = `Timeout after ${PROCESS_TIMEOUT_MS / 1000}s`
        await qaStore.updateRun(runId, {
          status: 'failed',
          completedAt: new Date().toISOString(),
          error: errorMsg,
        })
        this.emitQAEvent({ type: 'qa_error', runId, error: errorMsg })
        const result = await qaStore.getById(runId)
        return result || { ...initialResult, status: 'failed', error: errorMsg }
      }

      if (cancelled) {
        await qaStore.updateRun(runId, {
          status: 'cancelled',
          completedAt: new Date().toISOString(),
        })
        const result = await qaStore.getById(runId)
        return result || { ...initialResult, status: 'cancelled' }
      }

      const finalStatus = exitCode === 0 ? 'passed' : 'failed'

      if (finalStatus === 'failed') {
        log.error('Playwright process failed', {
          runId,
          exitCode,
          stderr: stderrText.slice(0, 1000),
          stdout: allStdoutLines.join('\n').slice(0, 2000),
          projectRoot,
        })
      }

      const updates: Partial<QAResult> = {
        status: finalStatus,
        completedAt: new Date().toISOString(),
      }
      if (finalStatus === 'failed') {
        updates.error = stderrText
          ? stderrText.slice(0, 2000)
          : `Playwright exited with code ${exitCode}`
      }

      await qaStore.updateRun(runId, updates)
      const finalResult = await qaStore.getById(runId)

      if (finalResult) {
        this.emitQAEvent({ type: 'qa_completed', runId, result: finalResult })
        return finalResult
      }

      return { ...initialResult, ...updates } as QAResult
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      log.error('Failed to execute QA story', { runId, error: errorMsg })
      await qaStore.updateRun(runId, {
        status: 'failed',
        completedAt: new Date().toISOString(),
        error: errorMsg,
      })
      this.emitQAEvent({ type: 'qa_error', runId, error: errorMsg })
      const result = await qaStore.getById(runId)
      return result || { ...initialResult, status: 'failed', error: errorMsg }
    } finally {
      if (timeout) {
        clearTimeout(timeout)
      }
      const tempFiles = [specPath, configPath]
      if (stderrPath) {
        tempFiles.push(stderrPath)
      }
      for (const tempFile of tempFiles) {
        try {
          if (existsSync(tempFile)) {
            unlinkSync(tempFile)
          }
        } catch {
          log.debug('Failed to cleanup temp file', { path: tempFile })
        }
      }
    }
  }

  cancel(runId: string): void {
    const active = this.activeProcesses.get(runId)
    if (active) {
      log.info('Cancelling QA run', { runId })
      active.cancel()
    }
  }

  private generatePlaywrightConfig(evidencePath: string): string {
    const escaped = evidencePath.replace(/\\/g, '/')
    return `import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '${escaped}',
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  reporter: 'line',
  timeout: 30000,
})
`
  }

  private generatePlaywrightSpec(story: QAStory, evidencePath: string): string {
    const escapedEvidence = evidencePath.replace(/\\/g, '/')
    const safeName = story.name.replace(/'/g, "\\'")
    const stepsCode = story.steps
      .map((step, i) => this.generateStepCode(step, i, escapedEvidence))
      .join('\n\n')

    return `import { test, expect } from '@playwright/test'

const emit = (data: unknown) => console.log(JSON.stringify(data))

test('${safeName}', async ({ page }) => {
${stepsCode}
})
`
  }

  private generateStepCode(step: QAStoryStep, index: number, evidencePath: string): string {
    const target = step.target.replace(/'/g, "\\'")
    const value = step.value?.replace(/'/g, "\\'") || ''
    const screenshotPath = `${evidencePath}/step-${index}.png`

    let actionCode: string
    switch (step.action) {
      case 'navigate':
        actionCode = `await page.goto('${target}', { waitUntil: 'networkidle' })`
        break
      case 'click':
        actionCode = `await page.click('${target}')`
        break
      case 'fill':
        actionCode = `await page.fill('${target}', '${value}')`
        break
      case 'wait':
        actionCode = step.waitMs
          ? `await page.waitForTimeout(${step.waitMs})`
          : `await page.waitForSelector('${target}')`
        break
      case 'screenshot':
        actionCode = `await page.screenshot({ path: '${screenshotPath}', fullPage: true })`
        break
      case 'assert':
        actionCode = `await expect(page.locator('${target}')).toBeVisible()`
        break
      case 'hover':
        actionCode = `await page.hover('${target}')`
        break
      case 'select':
        actionCode = `await page.selectOption('${target}', '${value}')`
        break
      default:
        actionCode = `// Unknown action: ${step.action}`
    }

    return `  // Step ${index}: ${step.action} - ${step.description || target}
  emit({ type: 'step', index: ${index}, status: 'running' })
  try {
    const stepStart = Date.now()
    ${actionCode}
    const stepMs = Date.now() - stepStart
    emit({ type: 'step', index: ${index}, status: 'passed', ms: stepMs })
    await page.screenshot({ path: '${screenshotPath}' })
    emit({ type: 'screenshot', index: ${index}, path: '${screenshotPath}' })
  } catch (err) {
    emit({ type: 'step', index: ${index}, status: 'failed', error: String(err) })
    throw err
  }`
  }

  private loadStory(storyName: string): QAStory {
    const yamlPath = join(this.storyBasePath, `${storyName}.yaml`)
    const ymlPath = join(this.storyBasePath, `${storyName}.yml`)

    let filePath: string
    if (existsSync(yamlPath)) {
      filePath = yamlPath
    } else if (existsSync(ymlPath)) {
      filePath = ymlPath
    } else {
      throw new Error(`Story not found: ${storyName} (checked ${yamlPath} and ${ymlPath})`)
    }

    const content = readFileSync(filePath, 'utf-8')
    const parsed = yaml.parse(content) as QAStory

    if (!parsed.name) {
      parsed.name = storyName
    }

    if (!parsed.steps || !Array.isArray(parsed.steps)) {
      throw new Error(`Story "${storyName}" has no steps defined`)
    }

    return parsed
  }

  private async handleScriptOutput(
    runId: string,
    data: {
      type: string
      index: number
      status?: string
      ms?: number
      error?: string
      path?: string
    }
  ): Promise<void> {
    if (data.type === 'step') {
      const step: QAStepResult = {
        index: data.index,
        action: '',
        target: '',
        status: (data.status as QAStepResult['status']) || 'running',
        durationMs: data.ms,
        error: data.error,
      }
      await qaStore.addStep(runId, step)
      this.emitQAEvent({ type: 'qa_step', runId, step })
    } else if (data.type === 'screenshot' && data.path) {
      const run = await qaStore.getById(runId)
      if (run) {
        const screenshots = [...run.screenshots, data.path]
        await qaStore.updateRun(runId, { screenshots })
      }
      this.emitQAEvent({
        type: 'qa_screenshot',
        runId,
        path: data.path,
        stepIndex: data.index,
      })
    }
  }

  private emitQAEvent(event: QAEvent): void {
    this.emit('qa_event', event)
  }
}

export const qaRunner = new QARunner()
