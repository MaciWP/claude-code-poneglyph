/**
 * Claude Executable Path Resolution
 *
 * Resolves the Claude CLI executable path across different OS and installation methods.
 * Supports: npm global, nvm, homebrew, Windows AppData, etc.
 */

import { existsSync } from 'fs'
import { join } from 'path'
import { logger } from '../logger'

const log = logger.child('claude-path')

let cachedPath: string | null = null
let cachedNodePath: string | null = null

/**
 * Known installation paths for Node.js by platform
 */
const KNOWN_NODE_PATHS: Record<string, string[]> = {
  darwin: [
    `${process.env.HOME}/.nvm/versions/node/*/bin/node`,
    '/opt/homebrew/bin/node',
    '/usr/local/bin/node',
  ],
  linux: [
    `${process.env.HOME}/.nvm/versions/node/*/bin/node`,
    '/usr/local/bin/node',
    '/usr/bin/node',
  ],
  win32: [
    `${process.env.PROGRAMFILES}\\nodejs\\node.exe`,
    `${process.env.LOCALAPPDATA}\\Programs\\nodejs\\node.exe`,
  ],
}

/**
 * Known installation paths for Claude CLI by platform
 */
const KNOWN_PATHS: Record<string, string[]> = {
  darwin: [
    // NVM installations
    `${process.env.HOME}/.nvm/versions/node/*/bin/claude`,
    // Homebrew
    '/opt/homebrew/bin/claude',
    '/usr/local/bin/claude',
    // npm global
    `${process.env.HOME}/.npm-global/bin/claude`,
    '/usr/local/lib/node_modules/.bin/claude',
  ],
  linux: [
    `${process.env.HOME}/.nvm/versions/node/*/bin/claude`,
    '/usr/local/bin/claude',
    '/usr/bin/claude',
    `${process.env.HOME}/.npm-global/bin/claude`,
  ],
  win32: [
    `${process.env.APPDATA}\\npm\\claude.cmd`,
    `${process.env.LOCALAPPDATA}\\Programs\\claude\\claude.exe`,
    `${process.env.USERPROFILE}\\.npm-global\\claude.cmd`,
  ],
}

/**
 * Expand glob-like patterns in paths (e.g., * for nvm versions)
 */
function expandPath(pattern: string): string[] {
  if (!pattern.includes('*')) {
    return [pattern]
  }

  const parts = pattern.split('*')
  if (parts.length !== 2) return []

  const baseDir = parts[0]
  const suffix = parts[1]

  try {
    const { readdirSync } = require('fs')
    const entries = readdirSync(baseDir.replace(/\/$/, ''))
    return entries.map((entry: string) => join(baseDir.replace(/\/$/, ''), entry, suffix.replace(/^\//, '')))
  } catch {
    return []
  }
}

/**
 * Try to find claude using system's which/where command
 */
async function findViaWhich(): Promise<string | null> {
  const isWindows = process.platform === 'win32'
  const cmd = isWindows ? 'where' : 'which'

  try {
    const proc = Bun.spawn([cmd, 'claude'], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        // Ensure common paths are included
        PATH: [
          process.env.PATH,
          `${process.env.HOME}/.nvm/versions/node/v20.17.0/bin`,
          '/opt/homebrew/bin',
          '/usr/local/bin',
        ]
          .filter(Boolean)
          .join(isWindows ? ';' : ':'),
      },
    })

    const stdout = await new Response(proc.stdout).text()
    const exitCode = await proc.exited

    if (exitCode === 0 && stdout.trim()) {
      const path = stdout.trim().split('\n')[0]
      if (existsSync(path)) {
        log.debug('Found claude via which/where', { path })
        return path
      }
    }
  } catch (e) {
    log.debug('which/where failed', { error: String(e) })
  }

  return null
}

/**
 * Search known installation paths
 */
function findInKnownPaths(): string | null {
  const platform = process.platform
  const paths = KNOWN_PATHS[platform] || []

  for (const pattern of paths) {
    const expanded = expandPath(pattern)
    for (const path of expanded) {
      if (existsSync(path)) {
        log.debug('Found claude in known path', { path })
        return path
      }
    }
  }

  return null
}

/**
 * Get the Claude CLI executable path.
 * Caches the result for subsequent calls.
 *
 * @throws Error if claude executable cannot be found
 */
export async function getClaudePath(): Promise<string> {
  if (cachedPath) {
    return cachedPath
  }

  // 1. Check if 'claude' is directly available (might work in some environments)
  if (process.env.CLAUDE_CLI_PATH && existsSync(process.env.CLAUDE_CLI_PATH)) {
    cachedPath = process.env.CLAUDE_CLI_PATH
    log.info('Using CLAUDE_CLI_PATH env var', { path: cachedPath })
    return cachedPath
  }

  // 2. Try which/where command with extended PATH
  const viaWhich = await findViaWhich()
  if (viaWhich) {
    cachedPath = viaWhich
    log.info('Claude path resolved via which', { path: cachedPath })
    return cachedPath
  }

  // 3. Search known installation paths
  const knownPath = findInKnownPaths()
  if (knownPath) {
    cachedPath = knownPath
    log.info('Claude path resolved via known paths', { path: cachedPath })
    return cachedPath
  }

  // 4. Last resort: return 'claude' and hope it's in PATH at runtime
  log.warn('Could not resolve claude path, falling back to "claude"')
  return 'claude'
}

/**
 * Find Node.js executable path
 */
function findNodePath(): string | null {
  const platform = process.platform
  const paths = KNOWN_NODE_PATHS[platform] || []

  for (const pattern of paths) {
    const expanded = expandPath(pattern)
    for (const path of expanded) {
      if (existsSync(path)) {
        log.debug('Found node in known path', { path })
        return path
      }
    }
  }

  return null
}

/**
 * Get the Node.js executable path.
 */
export function getNodePath(): string {
  if (cachedNodePath) {
    return cachedNodePath
  }

  const nodePath = findNodePath()
  if (nodePath) {
    cachedNodePath = nodePath
    log.info('Node path resolved', { path: cachedNodePath })
    return cachedNodePath
  }

  // Fallback to 'node' and hope it's in PATH
  return 'node'
}

/**
 * Get the command array to execute Claude CLI.
 * On Unix with NVM, returns ['node', 'claude-script-path', ...args]
 * On Windows or when node is in PATH, returns ['claude', ...args]
 */
export async function getClaudeCommand(): Promise<string[]> {
  const claudePath = await getClaudePath()
  const isWindows = process.platform === 'win32'

  // On Windows, .cmd files work directly
  if (isWindows && claudePath.endsWith('.cmd')) {
    return [claudePath]
  }

  // Check if claude script uses node shebang
  if (!isWindows && claudePath && existsSync(claudePath)) {
    const nodePath = getNodePath()
    // If we found a specific node path (not just 'node'), use it directly
    if (nodePath !== 'node') {
      log.info('Using node to execute claude script', { nodePath, claudePath })
      return [nodePath, claudePath]
    }
  }

  return [claudePath]
}

/**
 * Clear the cached path (useful for testing)
 */
export function clearClaudePathCache(): void {
  cachedPath = null
  cachedNodePath = null
}

/**
 * Get a diagnostic report of Claude CLI availability
 */
export async function diagnoseClaudePath(): Promise<{
  resolved: string | null
  inPath: boolean
  knownPaths: { path: string; exists: boolean }[]
  env: { CLAUDE_CLI_PATH?: string; PATH?: string }
}> {
  const platform = process.platform
  const paths = KNOWN_PATHS[platform] || []

  const knownPathsStatus = paths.flatMap((pattern) => {
    const expanded = expandPath(pattern)
    return expanded.map((p) => ({ path: p, exists: existsSync(p) }))
  })

  const viaWhich = await findViaWhich()

  return {
    resolved: viaWhich || findInKnownPaths(),
    inPath: !!viaWhich,
    knownPaths: knownPathsStatus,
    env: {
      CLAUDE_CLI_PATH: process.env.CLAUDE_CLI_PATH,
      PATH: process.env.PATH,
    },
  }
}
