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

/**
 * Build an enriched PATH that includes common Node.js installation locations.
 * This ensures spawned processes can find node/npm even when launched from
 * environments without the full user PATH (e.g., GUI apps, launchd).
 */
function getEnrichedPath(): string {
  const currentPath = process.env.PATH || ''
  const isWindows = process.platform === 'win32'
  const separator = isWindows ? ';' : ':'
  const home = process.env.HOME || process.env.USERPROFILE || ''

  // Known Node.js installation paths by platform
  const additionalPaths: string[] = []

  if (process.platform === 'darwin' || process.platform === 'linux') {
    // CRITICAL: System paths must be included for Claude CLI to access Keychain
    // via 'security' command and other system utilities
    additionalPaths.push('/usr/bin')
    additionalPaths.push('/bin')
    additionalPaths.push('/usr/sbin')
    additionalPaths.push('/sbin')

    // NVM - check for active version or common versions
    const nvmDir = process.env.NVM_DIR || `${home}/.nvm`
    const nodeVersions = ['v20.17.0', 'v20.18.0', 'v22.0.0', 'v18.17.0']
    for (const version of nodeVersions) {
      additionalPaths.push(`${nvmDir}/versions/node/${version}/bin`)
    }

    // Homebrew (macOS)
    additionalPaths.push('/opt/homebrew/bin')
    additionalPaths.push('/usr/local/bin')

    // npm global
    additionalPaths.push(`${home}/.npm-global/bin`)
    additionalPaths.push('/usr/local/lib/node_modules/.bin')
  } else if (isWindows) {
    // Windows system paths
    additionalPaths.push(`${process.env.SYSTEMROOT}\\System32`)
    additionalPaths.push(`${process.env.SYSTEMROOT}`)

    // Windows common paths for Node.js
    additionalPaths.push(`${process.env.APPDATA}\\npm`)
    additionalPaths.push(`${process.env.PROGRAMFILES}\\nodejs`)
  }

  // Combine: current PATH + additional paths (deduplicated)
  const allPaths = currentPath.split(separator).concat(additionalPaths)
  const uniquePaths = [...new Set(allPaths.filter(Boolean))]

  return uniquePaths.join(separator)
}

export function getSafeEnvForClaude(): Record<string, string | undefined> {
  const env = getSafeEnv({
    additionalPrefixes: ['ANTHROPIC_', 'CLAUDE_', 'NVM_']
  })

  // Enrich PATH to ensure node AND system commands are findable
  // Claude CLI needs access to system binaries like 'security' for Keychain access
  env.PATH = getEnrichedPath()

  return env
}

export function getSafeEnvForCodex(codexHome?: string): Record<string, string | undefined> {
  return getSafeEnv({
    additionalPrefixes: ['CODEX_', 'OPENAI_'],
    additionalKeys: codexHome ? { CODEX_HOME: codexHome } : undefined
  })
}

