import { join } from 'path'

interface ContextRule {
  name: string
  paths: string[]
  keywords: string[]
  contexts: string[]
}

interface ContextRulesConfig {
  rules: ContextRule[]
}

interface ContextMatch {
  ruleName: string
  matchedBy: 'path' | 'keyword'
  contexts: string[]
}

interface LoadedContext {
  skillName: string
  content: string
}

let rulesCache: ContextRulesConfig | null = null

export async function loadContextRules(configPath?: string): Promise<ContextRulesConfig> {
  if (rulesCache) return rulesCache

  const path = configPath || join(process.cwd(), '..', '..', '.claude', 'context-rules.json')
  try {
    const file = Bun.file(path)
    const exists = await file.exists()
    if (!exists) return { rules: [] }
    const content = await file.text()
    rulesCache = JSON.parse(content) as ContextRulesConfig
    return rulesCache
  } catch {
    return { rules: [] }
  }
}

export function clearContextCache(): void {
  rulesCache = null
}

export function matchesPattern(filePath: string, pattern: string): boolean {
  const SEP = '[/\\\\]'
  const NOT_SEP = '[^/\\\\]'

  // Escape regex special chars except * and /
  let regexStr = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&')

  // Replace path separators before glob expansion to avoid corrupting glob regex
  regexStr = regexStr.replace(/\//g, SEP)

  // Replace glob patterns (order matters: ** before *)
  regexStr = regexStr
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, `${NOT_SEP}*`)
    .replace(/\{\{GLOBSTAR\}\}/g, '.*')

  // If pattern starts with **, allow matching from beginning
  const prefix = pattern.startsWith('**') ? '^' : `(^|${SEP})`
  const regex = new RegExp(`${prefix}${regexStr}$`, 'i')
  return regex.test(filePath)
}

export async function findMatchingContexts(
  filePaths: string[],
  promptKeywords?: string[],
  configPath?: string
): Promise<ContextMatch[]> {
  const config = await loadContextRules(configPath)
  const matches: ContextMatch[] = []
  const seen = new Set<string>()

  for (const rule of config.rules) {
    if (seen.has(rule.name)) continue

    for (const fp of filePaths) {
      for (const pattern of rule.paths) {
        if (matchesPattern(fp, pattern)) {
          matches.push({ ruleName: rule.name, matchedBy: 'path', contexts: rule.contexts })
          seen.add(rule.name)
          break
        }
      }
      if (seen.has(rule.name)) break
    }

    if (!seen.has(rule.name) && promptKeywords) {
      const lowerKeywords = promptKeywords.map((k) => k.toLowerCase())
      for (const kw of rule.keywords) {
        if (lowerKeywords.some((lk) => lk.includes(kw.toLowerCase()))) {
          matches.push({ ruleName: rule.name, matchedBy: 'keyword', contexts: rule.contexts })
          seen.add(rule.name)
          break
        }
      }
    }
  }

  return matches
}

export async function loadContextContent(contextNames: string[]): Promise<LoadedContext[]> {
  const unique = [...new Set(contextNames)]
  const results: LoadedContext[] = []

  const skillsDir = join(process.cwd(), '..', '..', '.claude', 'skills')

  for (const name of unique) {
    try {
      const skillPath = join(skillsDir, name, 'skill.md')
      const file = Bun.file(skillPath)
      const exists = await file.exists()
      if (exists) {
        const content = await file.text()
        results.push({ skillName: name, content })
      }
    } catch {
      // Skip missing skills silently
    }
  }

  return results
}

export async function getContextForAgent(
  filePaths: string[],
  prompt: string,
  maxContexts?: number
): Promise<string> {
  const words = prompt.toLowerCase().split(/\s+/)

  const matches = await findMatchingContexts(filePaths, words)

  const limit = maxContexts || 3
  const contextNames = [...new Set(matches.flatMap((m) => m.contexts))].slice(0, limit)

  if (contextNames.length === 0) return ''

  const loaded = await loadContextContent(contextNames)

  if (loaded.length === 0) return ''

  const contextBlock = loaded
    .map((c) => `## Context: ${c.skillName}\n\n${c.content}`)
    .join('\n\n---\n\n')

  return `\n\n# Relevant Context\n\n${contextBlock}`
}
