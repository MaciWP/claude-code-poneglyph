import path from 'path'
import { existsSync, readdirSync } from 'fs'
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
      log.error('Full PC access is disabled in production')
      throw new Error('Full PC access is disabled in production')
    }
    // Safeguard: Logging de warning para awareness
    log.warn('SECURITY WARNING: Full PC access enabled - skipping directory validation', {
      targetDir,
      caller: new Error().stack?.split('\n')[2]?.trim(),
    })
    return targetDir
  }

  const allowedDirs = config.ALLOWED_WORK_DIRS
  if (allowedDirs.length > 0) {
    const normalizedTarget = targetDir.toLowerCase()
    const isAllowed = allowedDirs.some((dir) => {
      const normalizedDir = path.resolve(dir).toLowerCase()
      return normalizedTarget.startsWith(normalizedDir)
    })
    if (isAllowed) {
      log.debug('Directory allowed via ALLOWED_WORK_DIRS', { targetDir })
      return targetDir
    }
  }

  const allowedRoot = process.env.HOME || process.env.USERPROFILE || process.cwd()
  const resolvedRoot = path.resolve(allowedRoot)

  const normalizedTarget = targetDir.toLowerCase()
  const normalizedRoot = resolvedRoot.toLowerCase()
  if (!normalizedTarget.startsWith(normalizedRoot)) {
    throw new Error(
      `Security Violation: Access denied to directory '${targetDir}'. Allowed scope: '${resolvedRoot}'`
    )
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
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      env[key] = process.env[key]
    }
  }

  if (options?.additionalKeys) {
    Object.assign(env, options.additionalKeys)
  }

  return env
}

/**
 * Dynamically get all NVM node bin directories by scanning the versions directory
 */
function getNvmNodePaths(): string[] {
  const home = process.env.HOME || process.env.USERPROFILE || ''
  const nvmDir = process.env.NVM_DIR || path.join(home, '.nvm')
  const versionsDir = path.join(nvmDir, 'versions', 'node')

  try {
    if (!existsSync(versionsDir)) return []

    return readdirSync(versionsDir)
      .filter((v) => v.startsWith('v'))
      .map((v) => path.join(versionsDir, v, 'bin'))
  } catch {
    return []
  }
}

/**
 * Get Claude Desktop app bin directories
 * Returns the directories containing Claude executables for PATH enrichment
 */
function getClaudeDesktopBinPaths(): string[] {
  const paths: string[] = []
  const home = process.env.HOME || process.env.USERPROFILE || ''

  if (process.platform === 'darwin') {
    const claudeAppDir = path.join(home, 'Library', 'Application Support', 'Claude')
    const subDirs = ['claude-code', 'claude-code-vm']

    for (const subDir of subDirs) {
      const baseDir = path.join(claudeAppDir, subDir)
      if (existsSync(baseDir)) {
        try {
          const versions = readdirSync(baseDir).filter((v) => /^\d+\.\d+\.\d+$/.test(v))
          // Sort by version descending (newest first)
          versions.sort((a, b) => {
            const [aMajor, aMinor, aPatch] = a.split('.').map(Number)
            const [bMajor, bMinor, bPatch] = b.split('.').map(Number)
            return bMajor - aMajor || bMinor - aMinor || bPatch - aPatch
          })
          for (const version of versions) {
            paths.push(path.join(baseDir, version))
          }
        } catch {
          /* ignore read errors */
        }
      }
    }
  } else if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || ''
    if (localAppData) {
      const claudeAppDir = path.join(localAppData, 'Claude')
      const subDirs = ['claude-code', 'claude-code-vm']

      for (const subDir of subDirs) {
        const baseDir = path.join(claudeAppDir, subDir)
        if (existsSync(baseDir)) {
          try {
            const versions = readdirSync(baseDir).filter((v) => /^\d+\.\d+\.\d+$/.test(v))
            versions.sort((a, b) => {
              const [aMajor, aMinor, aPatch] = a.split('.').map(Number)
              const [bMajor, bMinor, bPatch] = b.split('.').map(Number)
              return bMajor - aMajor || bMinor - aMinor || bPatch - aPatch
            })
            for (const version of versions) {
              paths.push(path.join(baseDir, version))
            }
          } catch {
            /* ignore read errors */
          }
        }
      }
    }
  }

  return paths
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

    // Claude Desktop app paths (highest priority for claude executable)
    additionalPaths.push(...getClaudeDesktopBinPaths())

    // NVM - dynamically scan for all installed versions
    additionalPaths.push(...getNvmNodePaths())

    // Homebrew (macOS)
    additionalPaths.push('/opt/homebrew/bin')
    additionalPaths.push('/usr/local/bin')

    // ~/.local/bin
    additionalPaths.push(path.join(home, '.local', 'bin'))

    // npm global
    additionalPaths.push(path.join(home, '.npm-global', 'bin'))
    additionalPaths.push('/usr/local/lib/node_modules/.bin')
  } else if (isWindows) {
    // Windows system paths
    const systemRoot = process.env.SYSTEMROOT || 'C:\\Windows'
    additionalPaths.push(path.join(systemRoot, 'System32'))
    additionalPaths.push(systemRoot)

    // Claude Desktop app paths (highest priority for claude executable)
    additionalPaths.push(...getClaudeDesktopBinPaths())

    // Windows common paths for Node.js
    const appData = process.env.APPDATA || ''
    const localAppData = process.env.LOCALAPPDATA || ''
    const programFiles = process.env.PROGRAMFILES || ''
    const programFilesX86 = process.env['PROGRAMFILES(X86)'] || ''

    // ~/.local/bin
    if (home) additionalPaths.push(path.join(home, '.local', 'bin'))

    if (appData) additionalPaths.push(path.join(appData, 'npm'))
    if (localAppData) additionalPaths.push(path.join(localAppData, 'Programs', 'nodejs'))
    if (programFiles) additionalPaths.push(path.join(programFiles, 'nodejs'))
    if (programFilesX86) additionalPaths.push(path.join(programFilesX86, 'nodejs'))
    if (home) additionalPaths.push(path.join(home, '.npm-global'))
  }

  // Combine: current PATH + additional paths (deduplicated)
  const allPaths = currentPath.split(separator).concat(additionalPaths)
  const uniquePaths = [...new Set(allPaths.filter(Boolean))]

  return uniquePaths.join(separator)
}

export function getSafeEnvForClaude(): Record<string, string | undefined> {
  const env = getSafeEnv({
    additionalPrefixes: ['ANTHROPIC_', 'CLAUDE_', 'NVM_'],
  })

  // Enrich PATH to ensure node AND system commands are findable
  // Claude CLI needs access to system binaries like 'security' for Keychain access
  env.PATH = getEnrichedPath()

  return env
}

export function getSafeEnvForCodex(codexHome?: string): Record<string, string | undefined> {
  return getSafeEnv({
    additionalPrefixes: ['CODEX_', 'OPENAI_'],
    additionalKeys: codexHome ? { CODEX_HOME: codexHome } : undefined,
  })
}
