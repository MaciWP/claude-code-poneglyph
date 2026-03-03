import { describe, test, expect } from 'bun:test'
import { topologicalSort, resolveTemplate } from './blueprint-executor-helpers'
import type { BlueprintNode } from '@shared/types/blueprint'

function makeNode(id: string, deps: string[] = []): BlueprintNode {
  return { id, type: 'command', name: id, deps }
}

describe('blueprint-executor-helpers', () => {
  describe('topologicalSort', () => {
    test('sorts linear chain into sequential groups', () => {
      const nodes = [makeNode('a'), makeNode('b', ['a']), makeNode('c', ['b'])]

      const groups = topologicalSort(nodes)

      expect(groups).toEqual([['a'], ['b'], ['c']])
    })

    test('groups independent nodes together', () => {
      const nodes = [makeNode('a'), makeNode('b'), makeNode('c', ['a', 'b'])]

      const groups = topologicalSort(nodes)

      expect(groups.length).toBe(2)
      expect(groups[0]).toContain('a')
      expect(groups[0]).toContain('b')
      expect(groups[1]).toEqual(['c'])
    })

    test('handles diamond dependency pattern', () => {
      const nodes = [
        makeNode('a'),
        makeNode('b', ['a']),
        makeNode('c', ['a']),
        makeNode('d', ['b', 'c']),
      ]

      const groups = topologicalSort(nodes)

      expect(groups.length).toBe(3)
      expect(groups[0]).toEqual(['a'])
      expect(groups[1]).toContain('b')
      expect(groups[1]).toContain('c')
      expect(groups[2]).toEqual(['d'])
    })

    test('throws on cycle', () => {
      const nodes = [makeNode('a', ['b']), makeNode('b', ['a'])]

      expect(() => topologicalSort(nodes)).toThrow('Cycle detected')
    })

    test('handles single node', () => {
      const nodes = [makeNode('a')]

      const groups = topologicalSort(nodes)

      expect(groups).toEqual([['a']])
    })

    test('handles empty list', () => {
      const groups = topologicalSort([])

      expect(groups).toEqual([])
    })
  })

  describe('resolveTemplate', () => {
    test('replaces simple variables', () => {
      const result = resolveTemplate('Hello {{name}}', { name: 'World' }, {})

      expect(result).toBe('Hello World')
    })

    test('replaces multiple variables', () => {
      const result = resolveTemplate(
        '{{greeting}} {{name}}!',
        { greeting: 'Hi', name: 'Alice' },
        {}
      )

      expect(result).toBe('Hi Alice!')
    })

    test('resolves context values', () => {
      const result = resolveTemplate('Output: {{output}}', {}, { output: 'test-result' })

      expect(result).toBe('Output: test-result')
    })

    test('resolves nested context paths', () => {
      const result = resolveTemplate(
        'Errors: {{test.output}}',
        {},
        { test: { output: 'some errors' } }
      )

      expect(result).toBe('Errors: some errors')
    })

    test('returns empty string for missing variables', () => {
      const result = resolveTemplate('Value: {{missing}}', {}, {})

      expect(result).toBe('Value: ')
    })

    test('variables take precedence over context', () => {
      const result = resolveTemplate('{{key}}', { key: 'from-vars' }, { key: 'from-context' })

      expect(result).toBe('from-vars')
    })

    test('preserves non-template text', () => {
      const result = resolveTemplate('No templates here', {}, {})

      expect(result).toBe('No templates here')
    })
  })
})
