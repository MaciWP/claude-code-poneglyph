import path from 'path'
import { config } from '../config'
import { logger } from '../logger'

const log = logger.child('security')

export interface ValidateWorkDirOptions {
  allowFullPC?: boolean
}

export function validateWorkDir(workDir?: string, options?: ValidateWorkDirOptions): string {
  const targetDir = workDir ? path.resolve(workDir) : process.cwd()

  if (config.NODE_ENV === 'test') {
    return targetDir
  }

  if (options?.allowFullPC) {
    // Safeguard: Prohibir en producción
    if (config.NODE_ENV === 'production') {
      log.error("Full PC access is disabled in production")
      throw new Error('Full PC access is disabled in production')
    }
    // Safeguard: Logging de warning para awareness
    log.warn("SECURITY WARNING: Full PC access enabled - skipping directory validation", {
      targetDir,
      caller: new Error().stack?.split('\n')[2]?.trim()
    })
    return targetDir
  }

  const allowedDirs = config.ALLOWED_WORK_DIRS
  if (allowedDirs.length > 0) {
    const normalizedTarget = targetDir.toLowerCase()
    const isAllowed = allowedDirs.some(dir => {
      const normalizedDir = path.resolve(dir).toLowerCase()
      return normalizedTarget.startsWith(normalizedDir)
    })
    if (isAllowed) {
      log.debug("Directory allowed via ALLOWED_WORK_DIRS", { targetDir })
      return targetDir
    }
  }

  const allowedRoot = process.env.HOME || process.env.USERPROFILE || process.cwd()
  const resolvedRoot = path.resolve(allowedRoot)

  const normalizedTarget = targetDir.toLowerCase()
  const normalizedRoot = resolvedRoot.toLowerCase()
  if (!normalizedTarget.startsWith(normalizedRoot)) {
    throw new Error(`Security Violation: Access denied to directory '${targetDir}'. Allowed scope: '${resolvedRoot}'`)
  }
  return targetDir
}

export interface SafeEnvOptions {
  additionalPrefixes?: string[]
  additionalKeys?: Record<string, string | undefined>
}

export function getSafeEnv(options?: SafeEnvOptions): Record<string, string | undefined> {
  const safeKeys = ['PATH', 'HOME', 'USER', 'SHELL', 'TERM', 'LANG', 'TZ', 'TMPDIR', 'USERPROFILE']
  const env: Record<string, string | undefined> = {}

  for (const key of safeKeys) {
    if (process.env[key]) {
      env[key] = process.env[key]
    }
  }

  const defaultPrefixes = ['LC_', 'NODE_']
  const prefixes = [...defaultPrefixes, ...(options?.additionalPrefixes || [])]

  for (const key in process.env) {
    if (prefixes.some(prefix => key.startsWith(prefix))) {
      env[key] = process.env[key]
    }
  }

  if (options?.additionalKeys) {
    Object.assign(env, options.additionalKeys)
  }

  return env
}

export function getSafeEnvForClaude(): Record<string, string | undefined> {
  return getSafeEnv({
    additionalPrefixes: ['ANTHROPIC_', 'CLAUDE_']
  })
}

export function getSafeEnvForCodex(codexHome?: string): Record<string, string | undefined> {
  return getSafeEnv({
    additionalPrefixes: ['CODEX_', 'OPENAI_'],
    additionalKeys: codexHome ? { CODEX_HOME: codexHome } : undefined
  })
}

