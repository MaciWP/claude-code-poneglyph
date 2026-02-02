/**
 * Git Services - Re-exports
 *
 * Provides git worktree management and merge resolution capabilities
 */

// Utils
export {
  execGit,
  execGitWithOptions,
  parseGitStatus,
  getCurrentBranch,
  isGitRepository,
  getRepoRoot,
  getCommitCount,
  getDiffStats,
  hasUncommittedChanges,
  GitError,
} from './git-utils'

export type { GitStatus, FileStatus, GitExecOptions } from './git-utils'

// Worktree Manager
export { WorktreeManager } from './worktree'
export type { CreateWorktreeOptions } from './worktree'

// Merge Resolver
export { MergeResolver } from './merge-resolver'

// Re-export shared types for convenience
export type {
  WorktreeInfo,
  WorktreeConfig,
  MergeResult,
  MergeConflict,
  MergeResolution,
  MergeResolverResult,
  MergeStrategy,
} from '@shared/types'
