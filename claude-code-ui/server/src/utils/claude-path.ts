/**
 * Claude Executable Path Resolution
 *
 * Resolves the Claude CLI executable path across different OS and installation methods.
 * Supports: npm global, nvm, homebrew, Windows AppData, etc.
 */

import { existsSync, readdirSync, openSync, readSync, closeSync } from 'fs'
import { join, delimiter } from 'path'
import { logger } from '../logger'

const log = logger.child('claude-path')

/**
 * Check if a file is a binary executable (not a script)
 * Detects Mach-O (macOS), ELF (Linux), and PE (Windows) binaries
 */
function isBinaryExecutable(filePath: string): boolean {
  try {
    // Read first 4 bytes to check magic numbers
    const buffer = new Uint8Array(4)
    const file = openSync(filePath, 'r')
    readSync(file, buffer, 0, 4, 0)
    closeSync(file)

    // Check for common binary magic numbers:
    // Mach-O (macOS): 0xFEEDFACE, 0xFEEDFACF, 0xCAFEBABE, 0xCFFAEDFE, 0xCEFAEDFE
    // ELF (Linux): 0x7F454C46 (\x7FELF)
    // PE (Windows): 0x4D5A (MZ)

    // Use >>> 0 to convert to unsigned 32-bit integer (avoid negative numbers)
    const magic32 = ((buffer[0] << 24) | (buffer[1] << 16) | (buffer[2] << 8) | buffer[3]) >>> 0
    const magic16 = (buffer[0] << 8) | buffer[1]

    // Mach-O magic numbers (both endianness)
    const machOMagics = [
      0xfeedface,
      0xfeedfacf, // 32-bit and 64-bit
      0xcafebabe, // Universal binary
      0xcffaedfe,
      0xcefaedfe, // Reverse endian (little-endian on ARM)
    ]

    if (machOMagics.includes(magic32)) {
      log.debug('Detected Mach-O binary', { filePath, magic: magic32.toString(16) })
      return true
    }

    // ELF magic: 0x7F 'E' 'L' 'F'
    if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
      log.debug('Detected ELF binary', { filePath })
      return true
    }

    // PE/COFF magic: 'MZ'
    if (magic16 === 0x4d5a) {
      log.debug('Detected PE binary', { filePath })
      return true
    }

    return false
  } catch (error) {
    log.debug('Failed to check binary magic', { filePath, error: String(error) })
    return false
  }
}

let cachedPath: string | null = null
let cachedNodePath: string | null = null

/**
 * Get Claude Desktop app installation paths
 * macOS: ~/Library/Application Support/Claude/claude-code/{version}/claude
 * Windows: %LOCALAPPDATA%/Claude/claude-code/{version}/claude.exe
 */
function getClaudeDesktopPaths(): string[] {
  const paths: string[] = []
  const home = process.env.HOME || process.env.USERPROFILE || ''

  if (process.platform === 'darwin') {
    // macOS: ~/Library/Application Support/Claude/claude-code/{version}/claude
    const claudeAppDir = join(home, 'Library', 'Application Support', 'Claude')
    const subDirs = ['claude-code', 'claude-code-vm']

    for (const subDir of subDirs) {
      const baseDir = join(claudeAppDir, subDir)
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
            paths.push(join(baseDir, version, 'claude'))
          }
        } catch {
          /* ignore read errors */
        }
      }
    }
  } else if (process.platform === 'win32') {
    // Windows: %LOCALAPPDATA%/Claude/claude-code/{version}/claude.exe
    const localAppData = process.env.LOCALAPPDATA || ''
    if (localAppData) {
      const claudeAppDir = join(localAppData, 'Claude')
      const subDirs = ['claude-code', 'claude-code-vm']

      for (const subDir of subDirs) {
        const baseDir = join(claudeAppDir, subDir)
        if (existsSync(baseDir)) {
          try {
            const versions = readdirSync(baseDir).filter((v) => /^\d+\.\d+\.\d+$/.test(v))
            versions.sort((a, b) => {
              const [aMajor, aMinor, aPatch] = a.split('.').map(Number)
              const [bMajor, bMinor, bPatch] = b.split('.').map(Number)
              return bMajor - aMajor || bMinor - aMinor || bPatch - aPatch
            })
            for (const version of versions) {
              paths.push(join(baseDir, version, 'claude.exe'))
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
 * Dynamically get NVM node binary paths by scanning the versions directory
 */
function getNvmPaths(executable: string): string[] {
  const home = process.env.HOME || process.env.USERPROFILE || ''
  const nvmDir = process.env.NVM_DIR || join(home, '.nvm')
  const versionsDir = join(nvmDir, 'versions', 'node')

  try {
    if (!existsSync(versionsDir)) return []

    const versions = readdirSync(versionsDir)
      .filter((v) => v.startsWith('v'))
      .sort((a, b) => {
        // Sort by version number descending (newest first)
        const parseVersion = (v: string) => v.slice(1).split('.').map(Number)
        const [aMajor, aMinor, aPatch] = parseVersion(a)
        const [bMajor, bMinor, bPatch] = parseVersion(b)
        if (bMajor !== aMajor) return bMajor - aMajor
        if (bMinor !== aMinor) return bMinor - aMinor
        return bPatch - aPatch
      })

    return versions.map((v) => join(versionsDir, v, 'bin', executable))
  } catch {
    return []
  }
}

/**
 * Get static known paths by platform (excluding NVM which is dynamic)
 */
function getStaticPaths(executable: string): string[] {
  const home = process.env.HOME || process.env.USERPROFILE || ''
  const platform = process.platform

  if (platform === 'darwin') {
    return [
      '/opt/homebrew/bin/' + executable,
      '/usr/local/bin/' + executable,
      join(home, '.npm-global', 'bin', executable),
      '/usr/local/lib/node_modules/.bin/' + executable,
    ]
  }

  if (platform === 'linux') {
    return [
      '/usr/local/bin/' + executable,
      '/usr/bin/' + executable,
      join(home, '.npm-global', 'bin', executable),
    ]
  }

  if (platform === 'win32') {
    const appData = process.env.APPDATA || ''
    const localAppData = process.env.LOCALAPPDATA || ''
    const programFiles = process.env.PROGRAMFILES || ''
    const programFilesX86 = process.env['PROGRAMFILES(X86)'] || ''

    const ext = executable === 'node' ? '.exe' : '.cmd'
    const winExe = executable + ext

    return [
      join(appData, 'npm', winExe),
      join(localAppData, 'Programs', 'nodejs', winExe),
      join(home, '.npm-global', winExe),
      join(programFiles, 'nodejs', winExe),
      join(programFilesX86, 'nodejs', winExe),
      // For claude specifically, also check for .exe variant
      ...(executable === 'claude' ? [join(localAppData, 'Programs', 'claude', 'claude.exe')] : []),
    ]
  }

  return []
}

/**
 * Get all known paths for an executable (Claude Desktop + NVM dynamic + static)
 */
function getKnownPaths(executable: string): string[] {
  // Claude Desktop paths only apply to the 'claude' executable
  const desktopPaths = executable === 'claude' ? getClaudeDesktopPaths() : []
  return [...desktopPaths, ...getNvmPaths(executable), ...getStaticPaths(executable)]
}

/**
 * Get enriched PATH including NVM and common installation directories
 */
function getEnrichedPathForSearch(): string {
  const isWindows = process.platform === 'win32'
  const sep = isWindows ? ';' : ':'
  const currentPath = process.env.PATH || ''

  // Get NVM bin directories dynamically
  const nvmBinDirs = getNvmPaths('claude').map((p) => join(p, '..'))

  // Static paths to include
  const staticPaths = isWindows
    ? [
        process.env.APPDATA ? join(process.env.APPDATA, 'npm') : '',
        process.env.PROGRAMFILES ? join(process.env.PROGRAMFILES, 'nodejs') : '',
      ]
    : [
        '/opt/homebrew/bin',
        '/usr/local/bin',
        process.env.HOME ? join(process.env.HOME, '.npm-global', 'bin') : '',
      ]

  const allPaths = [currentPath, ...nvmBinDirs, ...staticPaths].filter(Boolean)

  return [...new Set(allPaths)].join(sep)
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
        PATH: getEnrichedPathForSearch(),
      },
    })

    const stdout = await new Response(proc.stdout).text()
    const exitCode = await proc.exited

    if (exitCode === 0 && stdout.trim()) {
      const foundPath = stdout.trim().split('\n')[0]
      if (existsSync(foundPath)) {
        log.debug('Found claude via which/where', { path: foundPath })
        return foundPath
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
function findInKnownPaths(): { path: string | null; searchedPaths: string[] } {
  const paths = getKnownPaths('claude')
  const searchedPaths: string[] = []

  for (const p of paths) {
    searchedPaths.push(p)
    if (existsSync(p)) {
      log.debug('Found claude in known path', { path: p })
      return { path: p, searchedPaths }
    }
  }

  return { path: null, searchedPaths }
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

  const allSearchedPaths: string[] = []

  // 1. Check CLAUDE_CLI_PATH env var (highest priority)
  if (process.env.CLAUDE_CLI_PATH) {
    allSearchedPaths.push(`CLAUDE_CLI_PATH: ${process.env.CLAUDE_CLI_PATH}`)
    if (existsSync(process.env.CLAUDE_CLI_PATH)) {
      cachedPath = process.env.CLAUDE_CLI_PATH
      log.info('Using CLAUDE_CLI_PATH env var', { path: cachedPath })
      return cachedPath
    }
  }

  // 2. Try which/where command with extended PATH
  const viaWhich = await findViaWhich()
  if (viaWhich) {
    cachedPath = viaWhich
    log.info('Claude path resolved via which', { path: cachedPath })
    return cachedPath
  }
  allSearchedPaths.push('which/where: not found')

  // 3. Search known installation paths
  const { path: knownPath, searchedPaths } = findInKnownPaths()
  allSearchedPaths.push(...searchedPaths)

  if (knownPath) {
    cachedPath = knownPath
    log.info('Claude path resolved via known paths', { path: cachedPath })
    return cachedPath
  }

  // 4. Log diagnostic info and throw descriptive error
  log.warn('Claude CLI not found', {
    searchedPaths: allSearchedPaths.slice(0, 10), // First 10 paths
    platform: process.platform,
    pathEnv: process.env.PATH?.split(delimiter).slice(0, 5), // First 5 PATH entries
  })

  throw new Error(
    `Claude CLI not found. Searched paths:\n${allSearchedPaths.join('\n')}\n\n` +
      `Install with: npm install -g @anthropic-ai/claude-code`
  )
}

/**
 * Find Node.js executable path
 */
function findNodePath(): string | null {
  const paths = getKnownPaths('node')

  for (const p of paths) {
    if (existsSync(p)) {
      log.debug('Found node in known path', { path: p })
      return p
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
 * - Native binaries (Mach-O, ELF, PE): executed directly
 * - JS scripts with NVM: returns ['node', 'claude-script-path', ...args]
 * - Windows .cmd or when node is in PATH: returns ['claude', ...args]
 */
export async function getClaudeCommand(): Promise<string[]> {
  const claudePath = await getClaudePath()
  const isWindows = process.platform === 'win32'

  // On Windows, .cmd files work directly
  if (isWindows && claudePath.endsWith('.cmd')) {
    return [claudePath]
  }

  // IMPORTANT: Check if it's a native binary BEFORE trying to use node
  // Claude Desktop installs a Mach-O binary that must be executed directly
  if (existsSync(claudePath) && isBinaryExecutable(claudePath)) {
    log.info('Using native binary claude (direct execution)', { claudePath })
    return [claudePath]
  }

  // For JS scripts: check if we need to use a specific node path
  if (!isWindows && claudePath && existsSync(claudePath)) {
    const nodePath = getNodePath()
    // If we found a specific node path (not just 'node'), use it for JS scripts
    if (nodePath !== 'node') {
      log.info('Using node to execute claude JS script', { nodePath, claudePath })
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
  const paths = getKnownPaths('claude')

  const knownPathsStatus = paths.map((p) => ({
    path: p,
    exists: existsSync(p),
  }))

  const viaWhich = await findViaWhich()
  const { path: knownPath } = findInKnownPaths()

  return {
    resolved: viaWhich || knownPath,
    inPath: !!viaWhich,
    knownPaths: knownPathsStatus,
    env: {
      CLAUDE_CLI_PATH: process.env.CLAUDE_CLI_PATH,
      PATH: process.env.PATH,
    },
  }
}
