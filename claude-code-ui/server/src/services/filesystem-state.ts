import { logger } from '../logger'

export interface FilesystemSnapshot {
  diffStat: string
  statusShort: string
  modifiedFiles: string[]
  untrackedFiles: string[]
}

async function runGitCommand(args: string[], cwd: string): Promise<string> {
  try {
    const proc = Bun.spawn(['git', ...args], {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const output = await new Response(proc.stdout).text()
    await proc.exited
    return output.trim()
  } catch (err) {
    logger.warn('filesystem-state', `git ${args[0]} failed`, { error: String(err) })
    return ''
  }
}

export async function captureFilesystemState(workDir: string): Promise<FilesystemSnapshot> {
  const [diffStat, statusShort] = await Promise.all([
    runGitCommand(['diff', '--stat'], workDir),
    runGitCommand(['status', '--short'], workDir),
  ])

  const modifiedFiles: string[] = []
  const untrackedFiles: string[] = []

  for (const line of statusShort.split('\n')) {
    if (!line.trim()) continue
    const status = line.slice(0, 2)
    const file = line.slice(3).trim()
    if (status.includes('?')) {
      untrackedFiles.push(file)
    } else {
      modifiedFiles.push(file)
    }
  }

  logger.info('filesystem-state', `Captured state for ${workDir}`, {
    modified: modifiedFiles.length,
    untracked: untrackedFiles.length,
  })

  return { diffStat, statusShort, modifiedFiles, untrackedFiles }
}
