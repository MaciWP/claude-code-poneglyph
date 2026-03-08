import { Elysia, t } from 'elysia'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import { logger } from '../logger'
import { hookMonitor } from '../services/hook-monitor'
import { NotFoundError, toErrorResponse, getStatusCode } from '../errors'

const log = logger.child('config-routes')

const CLAUDE_DIR = join(import.meta.dir, '../../../../.claude')
const SETTINGS_PATH = join(CLAUDE_DIR, 'settings.json')
const RULES_DIR = join(CLAUDE_DIR, 'rules')
const COMMANDS_DIR = join(CLAUDE_DIR, 'commands')

const SAFE_NAME_RE = /^[a-zA-Z0-9_-]+$/

interface HookConfig {
  event: string
  matcher?: string
  command: string
  timeout?: number
}

interface RuleInfo {
  name: string
  fileName: string
  preview: string
  lines: number
  lastModified: string
}

interface CommandInfo {
  name: string
  fileName: string
  description: string
  category?: string
  lines: number
}

interface SettingsHookEntry {
  type?: string
  command?: string
  timeout?: number
}

interface SettingsHookGroup {
  matcher?: string
  hooks?: SettingsHookEntry[]
}

function sanitizeName(name: string): string {
  if (!SAFE_NAME_RE.test(name)) {
    throw new NotFoundError('Rule', name)
  }
  return name
}

async function loadSettings(): Promise<Record<string, unknown>> {
  try {
    const file = Bun.file(SETTINGS_PATH)
    if (!(await file.exists())) return {}
    return (await file.json()) as Record<string, unknown>
  } catch (error) {
    log.warn('Failed to read settings.json', { error: String(error) })
    return {}
  }
}

function extractHooks(settings: Record<string, unknown>): HookConfig[] {
  const hooksSection = settings.hooks as Record<string, SettingsHookGroup[]> | undefined
  if (!hooksSection || typeof hooksSection !== 'object') return []

  const result: HookConfig[] = []

  for (const [event, groups] of Object.entries(hooksSection)) {
    if (!Array.isArray(groups)) continue

    for (const group of groups) {
      const matcher = group.matcher || undefined
      const hooks = group.hooks
      if (!Array.isArray(hooks)) continue

      for (const hook of hooks) {
        if (hook.command) {
          result.push({
            event,
            matcher,
            command: hook.command,
            timeout: hook.timeout,
          })
        }
      }
    }
  }

  return result
}

async function loadRules(): Promise<RuleInfo[]> {
  try {
    const files = await readdir(RULES_DIR)
    const mdFiles = files.filter((f) => f.endsWith('.md'))

    const results = await Promise.all(
      mdFiles.map(async (fileName): Promise<RuleInfo | null> => {
        try {
          const filePath = join(RULES_DIR, fileName)
          const [content, fileStat] = await Promise.all([Bun.file(filePath).text(), stat(filePath)])

          return {
            name: fileName.replace(/\.md$/, ''),
            fileName,
            preview: content.slice(0, 200).trim(),
            lines: content.split('\n').length,
            lastModified: fileStat.mtime.toISOString(),
          }
        } catch (error) {
          log.warn('Failed to read rule file', { fileName, error: String(error) })
          return null
        }
      })
    )

    return results.filter((r): r is RuleInfo => r !== null)
  } catch {
    return []
  }
}

async function loadCommands(): Promise<CommandInfo[]> {
  try {
    return await readCommandsDir(COMMANDS_DIR)
  } catch {
    return []
  }
}

async function readCommandsDir(dir: string, category?: string): Promise<CommandInfo[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const results: CommandInfo[] = []

  const tasks = entries.map(async (entry) => {
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      const subCategory = category ? `${category}/${entry.name}` : entry.name
      return readCommandsDir(join(dir, entry.name), subCategory)
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      try {
        const filePath = join(dir, entry.name)
        const content = await Bun.file(filePath).text()
        const firstNonEmpty = content
          .split('\n')
          .map((l) => l.trim())
          .find((l) => l.length > 0 && !l.startsWith('#'))

        return [
          {
            name: entry.name.replace(/\.md$/, ''),
            fileName: entry.name,
            description: firstNonEmpty || entry.name.replace(/\.md$/, ''),
            category,
            lines: content.split('\n').length,
          },
        ]
      } catch (error) {
        log.warn('Failed to read command file', { name: entry.name, error: String(error) })
        return []
      }
    }

    return []
  })

  const nested = await Promise.all(tasks)
  for (const items of nested) {
    results.push(...items)
  }

  return results
}

function handleError(
  set: { status?: number | string },
  context: string,
  error: unknown
): ReturnType<typeof toErrorResponse> {
  log.error(context, { error: String(error) })
  set.status = getStatusCode(error)
  return toErrorResponse(error)
}

export const configRoutes = new Elysia({ prefix: '/api/config' })
  .get('/hooks', async () => {
    const settings = await loadSettings()
    const hooks = extractHooks(settings)
    return { hooks }
  })

  .get('/hooks/stats', () => {
    const stats = hookMonitor.getAllStats()
    return { stats }
  })

  .get('/rules', async () => {
    const rules = await loadRules()
    return { rules }
  })

  .get(
    '/rules/:name',
    async ({ params, set }) => {
      try {
        const safeName = sanitizeName(params.name)
        const filePath = join(RULES_DIR, `${safeName}.md`)
        const file = Bun.file(filePath)

        if (!(await file.exists())) {
          throw new NotFoundError('Rule', safeName)
        }

        const content = await file.text()
        return { rule: { name: safeName, content } }
      } catch (error) {
        return handleError(set, 'Failed to get rule', error)
      }
    },
    { params: t.Object({ name: t.String() }) }
  )

  .get('/commands', async () => {
    const commands = await loadCommands()
    return { commands }
  })
