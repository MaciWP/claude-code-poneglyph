import { describe, test, expect } from 'bun:test'
import { parseBlueprintMd } from './blueprint-parser'

const SAMPLE_BLUEPRINT = `---
id: dev-cycle
name: Development Cycle
description: Standard development workflow
version: "1.0"
triggers:
  keywords: [implement, feature, add, create, build]
  complexity:
    min: 30
variables:
  task: ""
  workDir: "."
---

### Node: implement
- type: agent
- agentType: builder
- prompt: "Implement the following task: {{task}}"
- maxRetries: 2

### Node: lint
- type: command
- command: "bunx biome check --write ."
- deps: [implement]

### Node: typecheck
- type: command
- command: "bun typecheck"
- deps: [implement]

### Node: test
- type: command
- command: "bun test"
- deps: [lint, typecheck]

### Node: quality-gate
- type: gate
- deps: [test]
- onSuccess: review
- onFailure: fix

### Node: fix
- type: agent
- agentType: builder
- prompt: "Fix the failing tests"
- maxRetries: 1

### Node: review
- type: agent
- agentType: reviewer
- prompt: "Review the implementation for quality and correctness"
- deps: [quality-gate]
`

describe('blueprint-parser', () => {
  describe('parseBlueprintMd', () => {
    test('parses frontmatter id, name, description, version', () => {
      const result = parseBlueprintMd(SAMPLE_BLUEPRINT, 'test.md')

      expect(result.id).toBe('dev-cycle')
      expect(result.name).toBe('Development Cycle')
      expect(result.description).toBe('Standard development workflow')
      expect(result.version).toBe('1.0')
    })

    test('parses trigger keywords', () => {
      const result = parseBlueprintMd(SAMPLE_BLUEPRINT, 'test.md')

      expect(result.triggers.keywords).toContain('implement')
      expect(result.triggers.keywords).toContain('feature')
      expect(result.triggers.keywords).toContain('build')
      expect(result.triggers.keywords.length).toBe(5)
    })

    test('parses complexity range', () => {
      const result = parseBlueprintMd(SAMPLE_BLUEPRINT, 'test.md')

      expect(result.triggers.complexity).toBeDefined()
      expect(result.triggers.complexity!.min).toBe(30)
    })

    test('parses variables', () => {
      const result = parseBlueprintMd(SAMPLE_BLUEPRINT, 'test.md')

      expect(result.variables).toBeDefined()
      expect(result.variables!.task).toBe('')
      expect(result.variables!.workDir).toBe('.')
    })

    test('parses agent nodes', () => {
      const result = parseBlueprintMd(SAMPLE_BLUEPRINT, 'test.md')

      const implement = result.nodes.find((n) => n.id === 'implement')
      expect(implement).toBeDefined()
      expect(implement!.type).toBe('agent')
      expect(implement!.agentType).toBe('builder')
      expect(implement!.prompt).toContain('{{task}}')
      expect(implement!.maxRetries).toBe(2)
    })

    test('parses command nodes with deps', () => {
      const result = parseBlueprintMd(SAMPLE_BLUEPRINT, 'test.md')

      const lint = result.nodes.find((n) => n.id === 'lint')
      expect(lint).toBeDefined()
      expect(lint!.type).toBe('command')
      expect(lint!.command).toContain('biome')
      expect(lint!.deps).toEqual(['implement'])
    })

    test('parses gate nodes', () => {
      const result = parseBlueprintMd(SAMPLE_BLUEPRINT, 'test.md')

      const gate = result.nodes.find((n) => n.id === 'quality-gate')
      expect(gate).toBeDefined()
      expect(gate!.type).toBe('gate')
      expect(gate!.onSuccess).toBe('review')
      expect(gate!.onFailure).toBe('fix')
      expect(gate!.deps).toEqual(['test'])
    })

    test('parses multiple deps', () => {
      const result = parseBlueprintMd(SAMPLE_BLUEPRINT, 'test.md')

      const testNode = result.nodes.find((n) => n.id === 'test')
      expect(testNode).toBeDefined()
      expect(testNode!.deps).toEqual(['lint', 'typecheck'])
    })

    test('throws on missing id', () => {
      const content = `---
name: No ID Blueprint
---

### Node: step1
- type: command
- command: echo hello
`
      expect(() => parseBlueprintMd(content, 'bad.md')).toThrow("missing 'id'")
    })

    test('parses all 7 nodes', () => {
      const result = parseBlueprintMd(SAMPLE_BLUEPRINT, 'test.md')
      expect(result.nodes.length).toBe(7)
    })
  })
})
