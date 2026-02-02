/**
 * Git Merge Resolver
 * Handles merge conflicts detection and resolution
 */

import type {
  MergeConflict,
  MergeResolution,
  MergeResult,
  MergeResolverResult,
  MergeStrategy,
} from '@shared/types'
import { execGit, GitError, hasUncommittedChanges } from './git-utils'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

export class MergeResolver {
  /**
   * Detect merge conflicts in a worktree
   */
  async detectConflicts(worktreePath: string): Promise<MergeConflict[]> {
    const conflicts: MergeConflict[] = []

    try {
      // Get list of unmerged files
      const output = await execGit(
        ['diff', '--name-only', '--diff-filter=U'],
        worktreePath
      )

      if (!output) {
        return conflicts
      }

      const conflictedFiles = output.split('\n').filter(Boolean)

      for (const file of conflictedFiles) {
        const conflict = await this.parseConflictFile(worktreePath, file)
        if (conflict) {
          conflicts.push(conflict)
        }
      }
    } catch (error) {
      // No merge in progress or no conflicts
      if (error instanceof GitError && error.stderr.includes('not a merge')) {
        return conflicts
      }
      throw error
    }

    return conflicts
  }

  /**
   * Resolve a single conflict
   */
  async resolveConflict(resolution: MergeResolution): Promise<MergeResult> {
    const { file, resolved, strategy, confidence } = resolution

    try {
      // Extract worktree path from file path
      const worktreePath = this.getWorktreePath(file)
      const relativePath = this.getRelativePath(file, worktreePath)

      // Write resolved content
      await writeFile(file, resolved, 'utf-8')

      // Stage the resolved file
      await execGit(['add', relativePath], worktreePath)

      return {
        success: true,
        conflicts: [],
        merged: false,
        message: `Resolved ${relativePath} using ${strategy} strategy (confidence: ${Math.round(confidence * 100)}%)`,
      }
    } catch (error) {
      return {
        success: false,
        conflicts: [file],
        merged: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Abort an in-progress merge
   */
  async abortMerge(worktreePath: string): Promise<void> {
    await execGit(['merge', '--abort'], worktreePath)
  }

  /**
   * Complete a merge after all conflicts are resolved
   */
  async completeMerge(
    worktreePath: string,
    message?: string
  ): Promise<MergeResult> {
    try {
      // Check if there are still conflicts
      const conflicts = await this.detectConflicts(worktreePath)
      if (conflicts.length > 0) {
        return {
          success: false,
          conflicts: conflicts.map((c) => c.file),
          merged: false,
          message: `${conflicts.length} conflict(s) still unresolved`,
        }
      }

      // Check if there are staged changes
      const hasChanges = await hasUncommittedChanges(worktreePath)
      if (!hasChanges) {
        return {
          success: true,
          conflicts: [],
          merged: true,
          message: 'No changes to commit',
        }
      }

      // Commit the merge
      const commitMessage = message || 'Merge conflict resolution'
      await execGit(['commit', '-m', commitMessage], worktreePath)

      return {
        success: true,
        conflicts: [],
        merged: true,
        message: 'Merge completed successfully',
      }
    } catch (error) {
      return {
        success: false,
        conflicts: [],
        merged: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Start a merge from another branch
   */
  async startMerge(
    worktreePath: string,
    sourceBranch: string
  ): Promise<MergeResult> {
    try {
      await execGit(['merge', sourceBranch, '--no-commit'], worktreePath)

      return {
        success: true,
        conflicts: [],
        merged: false,
        message: `Merged ${sourceBranch} without conflicts`,
      }
    } catch (error) {
      if (error instanceof GitError && error.stderr.includes('CONFLICT')) {
        const conflicts = await this.detectConflicts(worktreePath)
        return {
          success: false,
          conflicts: conflicts.map((c) => c.file),
          merged: false,
          message: `Merge conflicts detected in ${conflicts.length} file(s)`,
        }
      }
      throw error
    }
  }

  /**
   * Resolve all conflicts with a given strategy
   */
  async resolveAll(
    worktreePath: string,
    strategy: MergeStrategy
  ): Promise<MergeResolverResult> {
    const conflicts = await this.detectConflicts(worktreePath)
    const resolutions: MergeResolution[] = []
    let requiresReview = false

    for (const conflict of conflicts) {
      const resolution = this.generateResolution(conflict, strategy)
      resolutions.push(resolution)

      if (resolution.confidence < 0.8) {
        requiresReview = true
      }

      await this.resolveConflict(resolution)
    }

    return {
      success: true,
      conflicts,
      resolutions,
      requiresReview,
      message: `Resolved ${conflicts.length} conflict(s) using ${strategy} strategy`,
    }
  }

  /**
   * Generate a resolution for a conflict
   */
  private generateResolution(
    conflict: MergeConflict,
    strategy: MergeStrategy
  ): MergeResolution {
    let resolved: string
    let confidence: number
    let reasoning: string

    switch (strategy) {
      case 'ours':
        resolved = conflict.ours
        confidence = 1.0
        reasoning = 'Kept our changes, discarded theirs'
        break

      case 'theirs':
        resolved = conflict.theirs
        confidence = 1.0
        reasoning = 'Accepted their changes, discarded ours'
        break

      case 'combined':
        // Simple combination: ours followed by theirs
        resolved = `${conflict.ours}\n${conflict.theirs}`
        confidence = 0.5
        reasoning = 'Combined both changes sequentially - manual review recommended'
        break

      case 'manual':
      default:
        // Keep conflict markers for manual resolution
        resolved = this.formatConflictMarkers(conflict)
        confidence = 0.0
        reasoning = 'Requires manual resolution'
        break
    }

    return {
      file: conflict.file,
      resolved,
      strategy,
      confidence,
      reasoning,
    }
  }

  /**
   * Parse a file with conflict markers
   */
  private async parseConflictFile(
    worktreePath: string,
    relativePath: string
  ): Promise<MergeConflict | null> {
    const fullPath = join(worktreePath, relativePath)
    const content = await readFile(fullPath, 'utf-8')

    // Find conflict markers
    const startMarker = content.indexOf('<<<<<<< ')
    const middleMarker = content.indexOf('=======')
    const endMarker = content.indexOf('>>>>>>> ')

    if (startMarker === -1 || middleMarker === -1 || endMarker === -1) {
      return null
    }

    // Extract sections
    const startLine = content.slice(0, startMarker)
    const oursStart = content.indexOf('\n', startMarker) + 1
    const ours = content.slice(oursStart, middleMarker).trim()
    const theirsStart = middleMarker + 8 // '=======\n'.length
    const theirsEnd = content.lastIndexOf('\n', endMarker)
    const theirs = content.slice(theirsStart, theirsEnd).trim()

    // Try to get base version
    let base: string | undefined
    try {
      base = await execGit(['show', `:1:${relativePath}`], worktreePath)
    } catch {
      // Base version might not be available in all merge scenarios
    }

    // Calculate line numbers
    const linesBefore = startLine.split('\n').length
    const linesOurs = ours.split('\n').length
    const linesTheirs = theirs.split('\n').length

    return {
      file: fullPath,
      ours,
      theirs,
      base,
      markers: {
        start: linesBefore,
        middle: linesBefore + linesOurs + 1,
        end: linesBefore + linesOurs + linesTheirs + 2,
      },
    }
  }

  /**
   * Format conflict markers back into content
   */
  private formatConflictMarkers(conflict: MergeConflict): string {
    return [
      '<<<<<<< HEAD (ours)',
      conflict.ours,
      '=======',
      conflict.theirs,
      '>>>>>>> (theirs)',
    ].join('\n')
  }

  /**
   * Extract worktree path from full file path
   */
  private getWorktreePath(fullPath: string): string {
    // Find .worktrees in path and extract up to task directory
    const worktreesIndex = fullPath.indexOf('.worktrees')
    if (worktreesIndex === -1) {
      // Not in a worktree, return parent directory
      const parts = fullPath.split(/[/\\]/)
      return parts.slice(0, -1).join('/')
    }

    const afterWorktrees = fullPath.slice(worktreesIndex + '.worktrees/'.length)
    const taskDir = afterWorktrees.split(/[/\\]/)[0]
    return fullPath.slice(0, worktreesIndex + '.worktrees/'.length + taskDir.length)
  }

  /**
   * Get relative path from worktree root
   */
  private getRelativePath(fullPath: string, worktreePath: string): string {
    return fullPath.slice(worktreePath.length + 1)
  }
}

export { GitError }
