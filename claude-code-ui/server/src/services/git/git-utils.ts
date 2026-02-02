/**
 * Git utility functions for executing git commands
 * Uses Bun.spawn for subprocess execution
 */

export interface GitStatus {
  branch: string
  isClean: boolean
  staged: FileStatus[]
  unstaged: FileStatus[]
  untracked: string[]
  ahead: number
  behind: number
}

export interface FileStatus {
  status: 'A' | 'M' | 'D' | 'R' | 'C' | 'U'
  path: string
  originalPath?: string // For renames
}

export interface GitExecOptions {
  cwd: string
  timeout?: number
  env?: Record<string, string>
}

/**
 * Execute a git command and return stdout
 * @param args - Git command arguments (without 'git' prefix)
 * @param cwd - Working directory
 * @returns stdout as string
 * @throws Error if command fails
 */
export async function execGit(args: string[], cwd: string): Promise<string> {
  const proc = Bun.spawn(['git', ...args], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited

  if (exitCode !== 0) {
    throw new GitError(`Git command failed: git ${args.join(' ')}`, stderr, exitCode)
  }

  return stdout.trim()
}

/**
 * Execute a git command with full options
 */
export async function execGitWithOptions(
  args: string[],
  options: GitExecOptions
): Promise<string> {
  const { cwd, timeout = 30000, env } = options

  const proc = Bun.spawn(['git', ...args], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: env ? { ...process.env, ...env } : undefined,
  })

  // Handle timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      proc.kill()
      reject(new GitError('Git command timed out', '', -1))
    }, timeout)
  })

  const resultPromise = (async () => {
    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()
    const exitCode = await proc.exited

    if (exitCode !== 0) {
      throw new GitError(`Git command failed: git ${args.join(' ')}`, stderr, exitCode)
    }

    return stdout.trim()
  })()

  return Promise.race([resultPromise, timeoutPromise])
}

/**
 * Parse git status --porcelain=v2 output
 */
export function parseGitStatus(output: string): GitStatus {
  const lines = output.split('\n').filter(Boolean)
  
  const status: GitStatus = {
    branch: 'HEAD',
    isClean: true,
    staged: [],
    unstaged: [],
    untracked: [],
    ahead: 0,
    behind: 0,
  }

  for (const line of lines) {
    // Branch header: # branch.head main
    if (line.startsWith('# branch.head ')) {
      status.branch = line.slice(14)
      continue
    }

    // Ahead/behind: # branch.ab +1 -2
    if (line.startsWith('# branch.ab ')) {
      const match = line.match(/\+(\d+) -(\d+)/)
      if (match) {
        status.ahead = parseInt(match[1], 10)
        status.behind = parseInt(match[2], 10)
      }
      continue
    }

    // Untracked: ? path
    if (line.startsWith('? ')) {
      status.untracked.push(line.slice(2))
      status.isClean = false
      continue
    }

    // Changed entry: 1 XY ... path
    // Renamed entry: 2 XY ... path\toriginalPath
    if (line.startsWith('1 ') || line.startsWith('2 ')) {
      const parts = line.split(' ')
      const xy = parts[1]
      const stagedStatus = xy[0]
      const unstagedStatus = xy[1]

      // Get path (last part, may contain tab for renames)
      const pathPart = parts.slice(8).join(' ')
      const [path, originalPath] = pathPart.split('\t')

      if (stagedStatus !== '.') {
        status.staged.push({
          status: stagedStatus as FileStatus['status'],
          path,
          originalPath,
        })
        status.isClean = false
      }

      if (unstagedStatus !== '.') {
        status.unstaged.push({
          status: unstagedStatus as FileStatus['status'],
          path,
          originalPath,
        })
        status.isClean = false
      }
      continue
    }

    // Unmerged entry: u XY ...
    if (line.startsWith('u ')) {
      const parts = line.split(' ')
      const path = parts.slice(10).join(' ')
      status.unstaged.push({
        status: 'U',
        path,
      })
      status.isClean = false
    }
  }

  return status
}

/**
 * Get current branch name
 */
export async function getCurrentBranch(cwd: string): Promise<string> {
  return execGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd)
}

/**
 * Check if directory is a git repository
 */
export async function isGitRepository(cwd: string): Promise<boolean> {
  try {
    await execGit(['rev-parse', '--git-dir'], cwd)
    return true
  } catch {
    // Not a git repository - this is expected for non-git directories
    return false
  }
}

/**
 * Get the root of the git repository
 */
export async function getRepoRoot(cwd: string): Promise<string> {
  return execGit(['rev-parse', '--show-toplevel'], cwd)
}

/**
 * Get commit count between two refs
 */
export async function getCommitCount(
  cwd: string,
  from: string,
  to: string
): Promise<number> {
  try {
    const output = await execGit(['rev-list', '--count', `${from}..${to}`], cwd)
    return parseInt(output, 10)
  } catch {
    // Invalid refs or no commits in range - return 0 as default
    return 0
  }
}

/**
 * Get diff stats between two refs
 */
export async function getDiffStats(
  cwd: string,
  from: string,
  to: string
): Promise<{ filesChanged: number; additions: number; deletions: number }> {
  try {
    const output = await execGit(
      ['diff', '--shortstat', `${from}...${to}`],
      cwd
    )

    if (!output) {
      return { filesChanged: 0, additions: 0, deletions: 0 }
    }

    const filesMatch = output.match(/(\d+) files? changed/)
    const addMatch = output.match(/(\d+) insertions?/)
    const delMatch = output.match(/(\d+) deletions?/)

    return {
      filesChanged: filesMatch ? parseInt(filesMatch[1], 10) : 0,
      additions: addMatch ? parseInt(addMatch[1], 10) : 0,
      deletions: delMatch ? parseInt(delMatch[1], 10) : 0,
    }
  } catch {
    // Invalid refs or diff failed - return empty stats
    return { filesChanged: 0, additions: 0, deletions: 0 }
  }
}

/**
 * Check if there are uncommitted changes
 */
export async function hasUncommittedChanges(cwd: string): Promise<boolean> {
  try {
    const output = await execGit(['status', '--porcelain'], cwd)
    return output.length > 0
  } catch {
    // Git command failed (not a repo or invalid state) - assume no changes
    return false
  }
}

/**
 * Custom error class for git operations
 */
export class GitError extends Error {
  constructor(
    message: string,
    public readonly stderr: string,
    public readonly exitCode: number
  ) {
    super(message)
    this.name = 'GitError'
  }
}
