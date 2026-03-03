import { join } from 'path'
import { readdir } from 'fs/promises'
import { logger } from '../logger'

const log = logger.child('hook-runner')

export interface HookResult {
  hookName: string
  exitCode: number
  stdout: string
  stderr: string
  durationMs: number
  passed: boolean
}

export async function runHook(hookPath: string, stdin: string | undefined): Promise<HookResult> {
  const hookName = hookPath.split(/[/\\]/).pop() || hookPath
  const startTime = Date.now()

  try {
    const proc = Bun.spawn(['bun', 'run', hookPath], {
      stdout: 'pipe',
      stderr: 'pipe',
      stdin: stdin ? new TextEncoder().encode(stdin) : undefined,
    })

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ])

    const exitCode = await proc.exited
    const durationMs = Date.now() - startTime

    return {
      hookName,
      exitCode,
      stdout,
      stderr,
      durationMs,
      passed: exitCode === 0,
    }
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : String(error)

    return {
      hookName,
      exitCode: 1,
      stdout: '',
      stderr: errorMsg,
      durationMs,
      passed: false,
    }
  }
}

const DEFAULT_VALIDATORS_DIR = join(process.cwd(), '..', '..', '.claude', 'hooks', 'validators')

export async function runValidators(
  filePath: string,
  content: string,
  validators: string[] | undefined
): Promise<HookResult[]> {
  const results: HookResult[] = []

  const validatorFiles = validators || (await discoverValidators())

  const stdinPayload = JSON.stringify({
    tool_name: 'Write',
    tool_input: { file_path: filePath, content },
  })

  for (const validator of validatorFiles) {
    try {
      const result = await runHook(validator, stdinPayload)
      results.push(result)
    } catch (error) {
      log.warn(`Validator failed: ${validator}`, { error: String(error) })
    }
  }

  return results
}

async function discoverValidators(): Promise<string[]> {
  const validators: string[] = []

  try {
    const dirs = await readdir(DEFAULT_VALIDATORS_DIR)
    for (const dir of dirs) {
      const dirPath = join(DEFAULT_VALIDATORS_DIR, dir)
      try {
        const files = await readdir(dirPath)
        for (const file of files) {
          if (file.endsWith('.ts')) {
            validators.push(join(dirPath, file))
          }
        }
      } catch {
        // Skip non-directories
      }
    }
  } catch {
    log.info('No validators directory found')
  }

  return validators
}

export async function runQualityGate(workDir: string): Promise<{
  passed: boolean
  results: HookResult[]
}> {
  const results: HookResult[] = []

  const typecheckResult = await runCommandAsHook('typecheck', 'bun typecheck', workDir)
  results.push(typecheckResult)

  const testResult = await runCommandAsHook('test', 'bun test', workDir)
  results.push(testResult)

  const passed = results.every((r) => r.passed)

  return { passed, results }
}

async function runCommandAsHook(
  name: string,
  command: string,
  workDir: string
): Promise<HookResult> {
  const startTime = Date.now()
  const shellArgs = ['bash', '-c', command]

  try {
    const proc = Bun.spawn(shellArgs, {
      cwd: workDir,
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ])

    const exitCode = await proc.exited

    return {
      hookName: name,
      exitCode,
      stdout,
      stderr,
      durationMs: Date.now() - startTime,
      passed: exitCode === 0,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)

    return {
      hookName: name,
      exitCode: 1,
      stdout: '',
      stderr: errorMsg,
      durationMs: Date.now() - startTime,
      passed: false,
    }
  }
}
