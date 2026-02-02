import { Elysia } from 'elysia'
import { join } from 'path'
import { readdir } from 'fs/promises'
import { logger } from '../logger'
import { configCache } from '../cache'
import type { ClaudeConfig } from '@shared/types'

const log = logger.child('claude-config')

async function parseMarkdownFrontmatter(filePath: string): Promise<Record<string, string>> {
  try {
    const file = Bun.file(filePath)
    const content = await file.text()
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (!frontmatterMatch) return {}

    const frontmatter: Record<string, string> = {}
    const lines = frontmatterMatch[1].split('\n')
    for (const line of lines) {
      const colonIndex = line.indexOf(':')
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim()
        const value = line.slice(colonIndex + 1).trim()
        frontmatter[key] = value
      }
    }
    return frontmatter
  } catch (error) {
    log.debug('Failed to parse frontmatter (non-critical)', { filePath, error: String(error) })
    return {}
  }
}

export async function loadClaudeConfig(): Promise<ClaudeConfig> {
  const cached = configCache.get('claude-config') as ClaudeConfig | undefined
  if (cached) {
    log.debug('Using cached claude config')
    return cached
  }

  const claudeDir = join(import.meta.dir, '../../../../.claude')
  const claudeConfig: ClaudeConfig = { agents: [], skills: [], commands: [] }

  try {
    const agentsDir = join(claudeDir, 'agents')
    const agentFiles = await readdir(agentsDir)
    for (const file of agentFiles) {
      if (file.endsWith('.md')) {
        const frontmatter = await parseMarkdownFrontmatter(join(agentsDir, file))
        claudeConfig.agents.push({
          name: frontmatter.name || file.replace('.md', ''),
          description: frontmatter.description || '',
          model: frontmatter.model,
          tools: frontmatter.tools?.split(',').map(t => t.trim()),
        })
      }
    }
  } catch (e) {
    log.warn('Failed to load agents', e)
  }

  try {
    const skillsDir = join(claudeDir, 'skills')
    const skillDirs = await readdir(skillsDir)
    for (const dir of skillDirs) {
      if (dir.startsWith('.')) continue
      const skillMdPath = join(skillsDir, dir, 'SKILL.md')
      const skillFile = Bun.file(skillMdPath)
      if (await skillFile.exists()) {
        const content = await skillFile.text()
        const descMatch = content.match(/^#\s+(.+)/m)
        const triggersMatch = content.match(/Keywords?:\s*(.+)/i)
        claudeConfig.skills.push({
          name: dir,
          description: descMatch?.[1] || dir,
          triggers: triggersMatch?.[1]?.split(',').map(t => t.trim()),
        })
      }
    }
  } catch (e) {
    log.warn('Failed to load skills', e)
  }

  try {
    const commandsDir = join(claudeDir, 'commands')
    const commandFiles = await readdir(commandsDir)
    for (const file of commandFiles) {
      if (file.endsWith('.md')) {
        const frontmatter = await parseMarkdownFrontmatter(join(commandsDir, file))
        const name = file.replace('.md', '')
        claudeConfig.commands.push({
          name: `/${name}`,
          description: frontmatter.description || name,
          model: frontmatter.model,
        })
      }
    }
  } catch (e) {
    log.warn('Failed to load commands', e)
  }

  configCache.set('claude-config', claudeConfig)
  log.info('Loaded claude config', {
    agents: claudeConfig.agents.length,
    skills: claudeConfig.skills.length,
    commands: claudeConfig.commands.length,
  })

  return claudeConfig
}

export const claudeConfigRoutes = new Elysia({ prefix: '/api' })
  .get('/claude-config', async () => {
    return await loadClaudeConfig()
  })
