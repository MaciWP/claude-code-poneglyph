import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import {
  classifyIntent,
  enrichPrompt,
  formatEnrichedPrompt,
  clearCache,
  orchestrator
} from './orchestrator'
import { agentRegistry } from './agent-registry'

describe('Orchestrator', () => {
  beforeEach(() => {
    clearCache()
    agentRegistry.clearAll()
  })

  afterEach(() => {
    clearCache()
    agentRegistry.clearAll()
  })

  describe('classifyIntent()', () => {
    test('classifies implementation intent from keywords', () => {
      const result = classifyIntent('implement a new feature for user authentication')

      expect(result.primary).toBe('implementation')
      expect(result.matchedKeywords).toContain('implement')
      expect(result.suggestedAgent).toBe('general-purpose')
      expect(result.confidence).toBeGreaterThan(0.5)
    })

    test('classifies exploration intent from keywords', () => {
      const result = classifyIntent('where is the config file located?')

      expect(result.primary).toBe('exploration')
      expect(result.matchedKeywords).toContain('where')
      expect(result.suggestedAgent).toBe('Explore')
    })

    test('classifies with multiple matching keywords', () => {
      const result = classifyIntent('find and search for the authentication module')

      expect(result.matchedKeywords.length).toBeGreaterThanOrEqual(2)
      expect(result.confidence).toBeGreaterThan(0.6)
    })

    test('returns general intent when no keywords match', () => {
      const result = classifyIntent('xyz abc 123')

      expect(result.primary).toBe('general')
      expect(result.confidence).toBe(0.3)
      expect(result.matchedKeywords).toEqual([])
      expect(result.suggestedAgent).toBe('general-purpose')
    })

    test('handles case insensitive matching', () => {
      const result = classifyIntent('IMPLEMENT a new FEATURE')

      expect(result.primary).toBe('implementation')
      expect(result.matchedKeywords).toContain('implement')
    })

    test('returns workflow for implementation intent', () => {
      const result = classifyIntent('create a new component')

      expect(result.workflow).toBeDefined()
      expect(result.workflow.length).toBeGreaterThan(0)
    })

    test('confidence is capped at 0.9', () => {
      const result = classifyIntent('implement create add build make')

      expect(result.confidence).toBeLessThanOrEqual(0.9)
    })
  })

  describe('enrichPrompt()', () => {
    test('returns enriched prompt with system context', async () => {
      const result = await enrichPrompt('implement a new feature')

      expect(result.systemContext).toBeDefined()
      expect(result.systemContext.length).toBeGreaterThan(0)
    })

    test('includes delegation hints', async () => {
      const result = await enrichPrompt('implement a new feature')

      expect(result.delegationHints).toBeDefined()
      expect(result.delegationHints).toContain('Delegation Plan')
    })

    test('preserves original prompt', async () => {
      const originalPrompt = 'implement a new feature'
      const result = await enrichPrompt(originalPrompt)

      expect(result.originalPrompt).toBe(originalPrompt)
    })

    test('includes metadata with intent', async () => {
      const result = await enrichPrompt('find the config')

      expect(result.metadata).toBeDefined()
      expect(result.metadata.intent).toBeDefined()
      expect(result.metadata.intent.primary).toBe('exploration')
    })

    test('sets orchestrationMode to true by default', async () => {
      const result = await enrichPrompt('test prompt')

      expect(result.metadata.orchestrationMode).toBe(true)
    })

    test('respects forceOrchestration option', async () => {
      const result = await enrichPrompt('test prompt', { forceOrchestration: false })

      expect(result.metadata.orchestrationMode).toBe(false)
    })

    test('activates prompt-engineer skill for vague prompts', async () => {
      const result = await enrichPrompt('fix something')

      expect(result.metadata.promptEngineerActive).toBe(true)
    })

    test('activates prompt-engineer skill for short implementation prompts', async () => {
      const result = await enrichPrompt('implement it')

      expect(result.metadata.promptEngineerActive).toBe(true)
    })

    test('does not activate prompt-engineer for clear prompts', async () => {
      const result = await enrichPrompt('find the configuration file in src/config directory')

      expect(result.metadata.promptEngineerActive).toBe(false)
    })
  })

  describe('formatEnrichedPrompt()', () => {
    test('combines system context and original prompt', async () => {
      const enriched = await enrichPrompt('test prompt')
      const formatted = formatEnrichedPrompt(enriched)

      expect(formatted).toContain('test prompt')
      expect(formatted).toContain('User Request')
    })

    test('formats with markdown structure', async () => {
      const enriched = await enrichPrompt('implement something')
      const formatted = formatEnrichedPrompt(enriched)

      expect(formatted).toContain('---')
      expect(formatted).toContain('##')
    })
  })

  describe('clearCache()', () => {
    test('clears cached data without errors', () => {
      expect(() => clearCache()).not.toThrow()
    })

    test('allows new data to be loaded after clear', async () => {
      await enrichPrompt('first prompt')
      clearCache()

      const result = await enrichPrompt('second prompt')
      expect(result.systemContext).toBeDefined()
    })
  })

  describe('orchestrator object', () => {
    test('exports all expected functions', () => {
      expect(orchestrator.enrichPrompt).toBe(enrichPrompt)
      expect(orchestrator.classifyIntent).toBe(classifyIntent)
      expect(orchestrator.formatEnrichedPrompt).toBe(formatEnrichedPrompt)
      expect(orchestrator.clearCache).toBe(clearCache)
    })

    test('includes agent registry reference', () => {
      expect(orchestrator.registry).toBe(agentRegistry)
    })
  })

  describe('requiresDelegation edge cases', () => {
    test('detects vague words in Spanish', async () => {
      const result = await enrichPrompt('arregla algo en el codigo')
      expect(result.metadata.promptEngineerActive).toBe(true)
    })

    test('detects vague words in English', async () => {
      const result = await enrichPrompt('somehow make it better')
      expect(result.metadata.promptEngineerActive).toBe(true)
    })

    test('detects multiple agent workflow', async () => {
      const intent = classifyIntent('implement a new user registration system')
      expect(intent.workflow.length).toBeGreaterThan(1)
    })
  })

  describe('intent classification with default intents', () => {
    test('handles create keyword', () => {
      const result = classifyIntent('create a new file')
      expect(result.primary).toBe('implementation')
    })

    test('handles add keyword', () => {
      const result = classifyIntent('add a new button')
      expect(result.primary).toBe('implementation')
    })

    test('handles build keyword', () => {
      const result = classifyIntent('build the application')
      expect(result.primary).toBe('implementation')
    })

    test('handles make keyword', () => {
      const result = classifyIntent('make a component')
      expect(result.primary).toBe('implementation')
    })

    test('handles search keyword', () => {
      const result = classifyIntent('search for the function')
      expect(result.primary).toBe('exploration')
    })

    test('handles how keyword', () => {
      const result = classifyIntent('how does this work')
      expect(result.primary).toBe('exploration')
    })

    test('handles what keyword', () => {
      const result = classifyIntent('what is this module doing')
      expect(result.primary).toBe('exploration')
    })
  })
})
