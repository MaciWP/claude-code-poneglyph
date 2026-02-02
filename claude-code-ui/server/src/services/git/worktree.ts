/**
 * Git Worktree Manager
 * Manages git worktrees for parallel task execution
 */

import type { WorktreeInfo, WorktreeConfig } from '@shared/types'
import {
  execGit,
  getCurrentBranch,
  getCommitCount,
  getDiffStats,
  GitError,
} from './git-utils'
import { join, basename } from 'path'
import { mkdir, rm, stat } from 'fs/promises'

export interface CreateWorktreeOptions {
  taskId: string
  taskName?: string
  baseBranch?: string
  branchName?: string
}

export class WorktreeManager {
  private config: WorktreeConfig

  constructor(
    private repoPath: string,
    config?: Partial<WorktreeConfig>
  ) {
    this.config = {
      enabled: true,
      basePath: join(repoPath, '.worktrees'),
      branchPrefix: 'task/',
      autoCleanupHours: 24,
      mergeOnSuccess: true,
      ...config,
    }
  }

  /**
   * Create a new worktree for a task
   */
  async create(options: CreateWorktreeOptions): Promise<WorktreeInfo> {
    const { taskId, taskName, baseBranch, branchName } = options

    // Determine branch names
    const currentBranch = baseBranch || (await getCurrentBranch(this.repoPath))
    const newBranchName = branchName || `${this.config.branchPrefix}${taskId}`
    const worktreePath = join(this.config.basePath, taskId)

    // Ensure base directory exists
    await mkdir(this.config.basePath, { recursive: true })

    // Check if worktree already exists
    const existing = await this.getInfo(worktreePath)
    if (existing) {
      return existing
    }

    try {
      // Create worktree with new branch
      await execGit(
        ['worktree', 'add', '-b', newBranchName, worktreePath, currentBranch],
        this.repoPath
      )
    } catch (error) {
      // If branch already exists, try without -b
      if (error instanceof GitError && error.stderr.includes('already exists')) {
        await execGit(
          ['worktree', 'add', worktreePath, newBranchName],
          this.repoPath
        )
      } else {
        throw error
      }
    }

    // Get initial stats
    const stats = await this.getWorktreeStats(worktreePath, currentBranch)

    const info: WorktreeInfo = {
      path: worktreePath,
      branch: newBranchName,
      taskId,
      taskName,
      baseBranch: currentBranch,
      isActive: true,
      stats,
      createdAt: new Date().toISOString(),
    }

    return info
  }

  /**
   * List all worktrees
   */
  async list(): Promise<WorktreeInfo[]> {
    const output = await execGit(['worktree', 'list', '--porcelain'], this.repoPath)
    const worktrees = this.parseWorktreeList(output)

    // Filter out main worktree and enrich with task info
    const taskWorktrees: WorktreeInfo[] = []

    for (const wt of worktrees) {
      // Skip main worktree
      if (wt.path === this.repoPath) {
        continue
      }

      // Extract taskId from path
      const taskId = basename(wt.path)

      // Check if it's in our managed directory
      if (!wt.path.startsWith(this.config.basePath)) {
        continue
      }

      try {
        const stats = await this.getWorktreeStats(wt.path, wt.branch)
        const createdAt = await this.getWorktreeCreatedAt(wt.path)

        taskWorktrees.push({
          path: wt.path,
          branch: wt.branch,
          taskId,
          baseBranch: await this.getBaseBranch(wt.path),
          isActive: !wt.isLocked,
          stats,
          createdAt,
        })
      } catch (error) {
        // Worktree might be in invalid state, skip it
        // This can happen if worktree was partially deleted
        continue
      }
    }

    return taskWorktrees
  }

  /**
   * Remove a worktree
   */
  async remove(path: string): Promise<void> {
    try {
      // First try to remove cleanly
      await execGit(['worktree', 'remove', path], this.repoPath)
    } catch (error) {
      if (error instanceof GitError) {
        // Force remove if there are uncommitted changes
        if (error.stderr.includes('contains modified or untracked files')) {
          await execGit(['worktree', 'remove', '--force', path], this.repoPath)
        } else if (error.stderr.includes('is not a working tree')) {
          // Worktree already removed, just clean up directory
          await rm(path, { recursive: true, force: true })
        } else {
          throw error
        }
      } else {
        throw error
      }
    }

    // Prune stale worktrees
    await execGit(['worktree', 'prune'], this.repoPath)
  }

  /**
   * Get info about a specific worktree
   */
  async getInfo(path: string): Promise<WorktreeInfo | null> {
    try {
      await stat(path)
    } catch {
      // Path does not exist - worktree not found
      return null
    }

    const worktrees = await this.list()
    return worktrees.find((wt) => wt.path === path) || null
  }

  /**
   * Lock a worktree to prevent accidental removal
   */
  async lock(path: string, reason?: string): Promise<void> {
    const args = ['worktree', 'lock', path]
    if (reason) {
      args.push('--reason', reason)
    }
    await execGit(args, this.repoPath)
  }

  /**
   * Unlock a worktree
   */
  async unlock(path: string): Promise<void> {
    await execGit(['worktree', 'unlock', path], this.repoPath)
  }

  /**
   * Clean up stale worktrees older than autoCleanupHours
   */
  async cleanup(): Promise<string[]> {
    const worktrees = await this.list()
    const cutoff = Date.now() - this.config.autoCleanupHours * 60 * 60 * 1000
    const removed: string[] = []

    for (const wt of worktrees) {
      const createdAt = new Date(wt.createdAt).getTime()
      if (createdAt < cutoff && !wt.isActive) {
        await this.remove(wt.path)
        removed.push(wt.path)
      }
    }

    return removed
  }

  /**
   * Get the configuration
   */
  getConfig(): WorktreeConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<WorktreeConfig>): void {
    this.config = { ...this.config, ...config }
  }

  // Private helper methods

  private parseWorktreeList(
    output: string
  ): Array<{ path: string; branch: string; isLocked: boolean }> {
    const entries: Array<{ path: string; branch: string; isLocked: boolean }> = []
    const blocks = output.split('\n\n').filter(Boolean)

    for (const block of blocks) {
      const lines = block.split('\n')
      let path = ''
      let branch = ''
      let isLocked = false

      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          path = line.slice(9)
        } else if (line.startsWith('branch ')) {
          // refs/heads/branch-name -> branch-name
          branch = line.slice(7).replace('refs/heads/', '')
        } else if (line === 'locked') {
          isLocked = true
        }
      }

      if (path) {
        entries.push({ path, branch, isLocked })
      }
    }

    return entries
  }

  private async getWorktreeStats(
    worktreePath: string,
    baseBranch: string
  ): Promise<WorktreeInfo['stats']> {
    const currentBranch = await getCurrentBranch(worktreePath)
    
    const commitCount = await getCommitCount(
      worktreePath,
      baseBranch,
      currentBranch
    )
    
    const diffStats = await getDiffStats(worktreePath, baseBranch, currentBranch)

    return {
      commitCount,
      filesChanged: diffStats.filesChanged,
      additions: diffStats.additions,
      deletions: diffStats.deletions,
    }
  }

  private async getBaseBranch(worktreePath: string): Promise<string> {
    try {
      // Try to get the tracking branch
      const output = await execGit(
        ['rev-parse', '--abbrev-ref', '@{upstream}'],
        worktreePath
      )
      return output.replace('origin/', '')
    } catch {
      // No tracking branch, fall back to main/master
      try {
        await execGit(['rev-parse', '--verify', 'main'], worktreePath)
        return 'main'
      } catch {
        // main doesn't exist, assume master
        return 'master'
      }
    }
  }

  private async getWorktreeCreatedAt(worktreePath: string): Promise<string> {
    try {
      const stats = await stat(worktreePath)
      return stats.birthtime.toISOString()
    } catch {
      // Cannot stat directory, use current time as fallback
      return new Date().toISOString()
    }
  }
}

export { GitError }
