import { describe, test, expect, beforeEach } from 'bun:test'
import { join } from 'path'
import {
  matchesPattern,
  findMatchingContexts,
  clearContextCache,
  loadContextRules,
} from './context-loader'

const CONFIG_PATH = join(import.meta.dir, '..', '..', '..', '..', '.claude', 'context-rules.json')

describe('context-loader', () => {
  beforeEach(() => clearContextCache())

  describe('matchesPattern', () => {
    test('matches exact directory pattern', () => {
      expect(matchesPattern('server/src/routes/auth.ts', 'server/src/routes/**')).toBe(true)
    })

    test('matches globstar pattern', () => {
      expect(matchesPattern('deep/nested/routes/handler.ts', '**/routes/**')).toBe(true)
    })

    test('does not match unrelated path', () => {
      expect(matchesPattern('web/src/hooks/use-auth.ts', 'server/src/routes/**')).toBe(false)
    })

    test('matches test file pattern', () => {
      expect(matchesPattern('src/services/auth.test.ts', '**/*.test.ts')).toBe(true)
    })

    test('matches Windows-style paths', () => {
      expect(matchesPattern('server\\src\\routes\\auth.ts', 'server/src/routes/**')).toBe(true)
    })

    test('does not match partial directory name', () => {
      expect(matchesPattern('server/src/subroutes/handler.ts', 'server/src/routes/**')).toBe(false)
    })
  })

  describe('loadContextRules', () => {
    test('loads rules from config file', async () => {
      const config = await loadContextRules(CONFIG_PATH)
      expect(config.rules.length).toBeGreaterThan(0)
    })

    test('returns empty rules for missing file', async () => {
      const config = await loadContextRules('/nonexistent/path/rules.json')
      expect(config.rules).toEqual([])
    })

    test('uses cache on second call', async () => {
      const config1 = await loadContextRules(CONFIG_PATH)
      const config2 = await loadContextRules(CONFIG_PATH)
      expect(config1).toBe(config2)
    })
  })

  describe('findMatchingContexts', () => {
    test('matches by path', async () => {
      const matches = await findMatchingContexts(
        ['server/src/routes/users.ts'],
        undefined,
        CONFIG_PATH
      )
      expect(matches.some((m) => m.ruleName === 'api-routes')).toBe(true)
      expect(matches.some((m) => m.matchedBy === 'path')).toBe(true)
    })

    test('matches by keyword', async () => {
      const matches = await findMatchingContexts(
        ['some/random/file.ts'],
        ['implement', 'websocket', 'handler'],
        CONFIG_PATH
      )
      expect(matches.some((m) => m.ruleName === 'websocket')).toBe(true)
      expect(matches.some((m) => m.matchedBy === 'keyword')).toBe(true)
    })

    test('returns empty for no matches', async () => {
      const matches = await findMatchingContexts(
        ['random/unrelated/file.xyz'],
        ['nothing', 'matches'],
        CONFIG_PATH
      )
      expect(matches.length).toBe(0)
    })

    test('does not duplicate rule matches', async () => {
      const matches = await findMatchingContexts(
        ['server/src/routes/auth.ts', 'server/src/routes/users.ts'],
        ['endpoint', 'api'],
        CONFIG_PATH
      )
      const apiRouteMatches = matches.filter((m) => m.ruleName === 'api-routes')
      expect(apiRouteMatches.length).toBe(1)
    })

    test('matches testing rule for test files', async () => {
      const matches = await findMatchingContexts(
        ['src/services/auth.test.ts'],
        undefined,
        CONFIG_PATH
      )
      expect(matches.some((m) => m.ruleName === 'testing')).toBe(true)
    })

    test('matches services rule', async () => {
      const matches = await findMatchingContexts(
        ['server/src/services/claude.ts'],
        undefined,
        CONFIG_PATH
      )
      expect(matches.some((m) => m.ruleName === 'services')).toBe(true)
    })
  })
})
