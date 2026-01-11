import { describe, it, expect, beforeEach } from 'bun:test'
import { PromptClassifier } from '../services/prompt-classifier'

describe('PromptClassifier', () => {
  let classifier: PromptClassifier

  beforeEach(() => {
    classifier = new PromptClassifier({}, ['websocket', 'memory'])
  })

  describe('classify', () => {
    it('should detect websocket domain from keywords', () => {
      const result = classifier.classify('Add reconnection logic to websocket')
      expect(result.domains).toContain('websocket')
    })

    it('should detect multiple domains', () => {
      const result = classifier.classify('Connect websocket to database events')
      expect(result.domains).toContain('websocket')
      expect(result.domains).toContain('database')
    })

    it('should return empty domains for no matches', () => {
      const result = classifier.classify('Hello world')
      expect(result.domains).toHaveLength(0)
    })

    it('should score low for simple tasks', () => {
      const result = classifier.classify('Fix typo in README')
      expect(result.complexityScore).toBeLessThan(30)
      expect(result.requiresDelegation).toBe(false)
    })

    it('should score high for refactoring', () => {
      // "Refactor all authentication across multiple files" scores 45 (refactor:25 + multiFile:20)
      // With trivialThreshold at 50, this doesn't trigger delegation but is still complex
      const result = classifier.classify('Refactor all authentication across multiple files')
      expect(result.complexityScore).toBeGreaterThan(40)
      // Delegation requires score > 50 (trivialThreshold)
      expect(result.requiresDelegation).toBe(false)
    })

    it('should trigger delegation for very complex tasks', () => {
      // Add more complexity to exceed threshold: refactor + multiFile + integration + debugging
      const result = classifier.classify('Refactor and debug the authentication integration across multiple files')
      expect(result.complexityScore).toBeGreaterThan(50)
      expect(result.requiresDelegation).toBe(true)
    })

    it('should increase score for multiple domains', () => {
      const simple = classifier.classify('Add button to form')
      const multi = classifier.classify('Add button that connects to websocket and updates database')
      expect(multi.complexityScore).toBeGreaterThan(simple.complexityScore)
    })

    it('should suggest scout for complex exploration', () => {
      // Scout is added when complexity > 40
      const result = classifier.classify('Refactor and investigate memory leak across multiple files in the system')
      expect(result.complexityScore).toBeGreaterThan(40)
      expect(result.suggestedAgents).toContain('scout')
    })

    it('should always include builder for implementation tasks', () => {
      const result = classifier.classify('Add new feature to handle events')
      expect(result.suggestedAgents).toContain('builder')
    })

    it('should suggest reviewer for high complexity', () => {
      const result = classifier.classify('Refactor entire auth system across all modules with integration')
      expect(result.suggestedAgents).toContain('reviewer')
    })

    it('should match experts based on domains', () => {
      const result = classifier.classify('Fix websocket connection issue')
      expect(result.suggestedExperts).toContain('websocket')
    })

    it('should generate reasoning string', () => {
      const result = classifier.classify('Implement new feature')
      expect(result.reasoning).toBeTruthy()
      expect(typeof result.reasoning).toBe('string')
    })

    it('should estimate tool calls based on complexity', () => {
      const simple = classifier.classify('Fix typo')
      const complex = classifier.classify('Refactor entire codebase with multiple integrations')
      expect(complex.estimatedToolCalls).toBeGreaterThan(simple.estimatedToolCalls)
    })
  })

  describe('setAvailableExperts', () => {
    it('should update available experts for matching', () => {
      classifier.setAvailableExperts(['frontend', 'backend'])
      const result = classifier.classify('Update frontend components')
      expect(result.suggestedExperts).toContain('frontend')
    })
  })
})
