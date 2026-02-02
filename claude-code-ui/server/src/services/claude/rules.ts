/**
 * Rules Discovery
 *
 * Finds and caches Claude rules from .claude/rules directories.
 */

import { Glob } from 'bun'
import path from 'path'
import { logger } from '../../logger'
import { rulesCache } from '../../cache'

const log = logger.child('claude-rules')

/**
 * Finds all rule files in the .claude/rules directory of a given base directory.
 * Results are cached for 2 minutes.
 */
export async function findRulesInDir(baseDir: string): Promise<string[]> {
  // Check cache first (2 min TTL)
  const cacheKey = `rules:${baseDir}`
  const cached = rulesCache.get(cacheKey)
  if (cached) {
    log.debug('Using cached rules', { baseDir, count: cached.length })
    return cached
  }

  const rulesDir = path.join(baseDir, '.claude', 'rules')
  const rules: string[] = []

  try {
    const glob = new Glob('**/*.md')
    for await (const file of glob.scan({ cwd: rulesDir, absolute: false })) {
      const name = file.replace(/\.md$/, '')
      rules.push(name)
    }
  } catch {
    // No rules directory or not accessible - this is expected for projects without rules
  }

  // Cache the result
  rulesCache.set(cacheKey, rules)
  log.debug('Cached rules', { baseDir, count: rules.length })

  return rules
}
