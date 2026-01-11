import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'
import { rm, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

const TEST_DATA_DIR = join(import.meta.dir, '../../../storage/memories-test')

const mockLogger = {
  debug: mock(() => {}),
  info: mock(() => {}),
  warn: mock(() => {}),
  error: mock(() => {}),
}

mock.module('../../logger', () => ({
  logger: {
    child: () => mockLogger,
    debug: mockLogger.debug,
    info: mockLogger.info,
    warn: mockLogger.warn,
    error: mockLogger.error,
  },
}))

describe('Memory System', () => {
  describe('cosineSimilarity', () => {
    const { cosineSimilarity } = require('./vector')

    test('returns 1 for identical vectors', () => {
      const v = [0.5, 0.5, 0.5]
      expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5)
    })

    test('returns 0 for orthogonal vectors', () => {
      const v1 = [1, 0]
      const v2 = [0, 1]
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(0, 5)
    })

    test('returns 0 for different length vectors', () => {
      const v1 = [1, 0, 0]
      const v2 = [1, 0]
      expect(cosineSimilarity(v1, v2)).toBe(0)
    })

    test('handles zero vectors', () => {
      const zero = [0, 0, 0]
      const v = [1, 0, 0]
      expect(cosineSimilarity(zero, v)).toBe(0)
    })

    test('handles negative values', () => {
      const v1 = [1, 0]
      const v2 = [-1, 0]
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(-1, 5)
    })
  })

  describe('extractFromText', () => {
    const { extractFromText, extractTags } = require('./extractor')

    describe('preference patterns', () => {
      test('extracts "I prefer X" pattern', () => {
        const results = extractFromText('I prefer TypeScript.', 'user')
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].content).toContain('prefers')
        expect(results[0].content).toContain('TypeScript')
        expect(results[0].type).toBe('semantic')
        expect(results[0].tags).toContain('preference')
      })

      test('extracts "I like to X" pattern', () => {
        const results = extractFromText('I like to use tabs.', 'user')
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].content).toContain('prefers')
      })

      test('extracts "always use X" pattern', () => {
        const results = extractFromText('Always use strict mode.', 'user')
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].tags).toContain('preference')
      })

      test('extracts negative preferences', () => {
        const results = extractFromText("Don't use var in JavaScript.", 'user')
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].content).toContain('NOT want')
        expect(results[0].tags).toContain('anti-preference')
      })

      test('extracts "never use X" pattern', () => {
        const results = extractFromText('Never use any type.', 'user')
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].content).toContain('NOT want')
      })
    })

    describe('knowledge patterns', () => {
      test('extracts "project uses X" pattern', () => {
        const results = extractFromText('The project uses React for frontend.', 'user')
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].content).toContain('React')
        expect(results[0].tags).toContain('knowledge')
      })

      test('extracts "we use X for Y" pattern', () => {
        const results = extractFromText('We use PostgreSQL for database.', 'user')
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].content).toContain('PostgreSQL')
        expect(results[0].tags).toContain('stack')
      })

      test('extracts "database is X" pattern', () => {
        const results = extractFromText('The database is MongoDB.', 'user')
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].tags).toContain('infrastructure')
      })

      test('extracts "deploy to X" pattern', () => {
        const results = extractFromText('We deploy to AWS.', 'user')
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].tags).toContain('infrastructure')
      })
    })

    describe('feedback patterns', () => {
      test('extracts positive feedback', () => {
        const previousContent = 'The answer is 42.'
        const results = extractFromText("That's correct!", 'user', previousContent)
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].type).toBe('episodic')
        expect(results[0].tags).toContain('confirmation')
      })

      test('extracts corrections', () => {
        const previousContent = 'Use semicolons.'
        const results = extractFromText('Actually, use ASI style.', 'user', previousContent)
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].content).toContain('Correction')
        expect(results[0].tags).toContain('correction')
      })
    })

    describe('assistant code detection', () => {
      test('extracts code pattern from assistant response', () => {
        const codeResponse = 'Here is the code:\n```typescript\nconst x = 1;\n```'
        const results = extractFromText(codeResponse, 'assistant')
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].type).toBe('procedural')
        expect(results[0].tags).toContain('code')
        expect(results[0].tags).toContain('typescript')
      })

      test('handles code without language', () => {
        const codeResponse = '```\nsome code\n```'
        const results = extractFromText(codeResponse, 'assistant')
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].type).toBe('procedural')
      })
    })

    describe('no extraction cases', () => {
      test('returns empty for generic user message', () => {
        const results = extractFromText('Hello, how are you?', 'user')
        expect(results.length).toBe(0)
      })

      test('returns empty for assistant text without code', () => {
        const results = extractFromText('I can help you with that.', 'assistant')
        expect(results.length).toBe(0)
      })
    })
  })

  describe('extractTags', () => {
    const { extractTags } = require('./extractor')

    test('extracts language tags', () => {
      const tags = extractTags('We use TypeScript and Python in this project.')
      expect(tags).toContain('typescript')
      expect(tags).toContain('python')
    })

    test('extracts framework tags', () => {
      const tags = extractTags('Built with React and Vue.')
      expect(tags).toContain('react')
      expect(tags).toContain('vue')
    })

    test('extracts runtime tags', () => {
      const tags = extractTags('Running on Bun and Node.')
      expect(tags).toContain('bun')
      expect(tags).toContain('node')
    })

    test('extracts database tags', () => {
      const tags = extractTags('Using Postgres and Redis.')
      expect(tags).toContain('postgres')
      expect(tags).toContain('redis')
    })

    test('extracts cloud provider tags', () => {
      const tags = extractTags('Deployed on AWS and GCP.')
      expect(tags).toContain('aws')
      expect(tags).toContain('gcp')
    })

    test('deduplicates tags', () => {
      const tags = extractTags('TypeScript typescript TYPESCRIPT')
      expect(tags.filter((t: string) => t === 'typescript').length).toBe(1)
    })

    test('returns empty for no matches', () => {
      const tags = extractTags('Hello world')
      expect(tags.length).toBe(0)
    })
  })

  describe('MemoryGraph', () => {
    const graphModule = require('./graph')
    const memoryGraph = graphModule.memoryGraph

    const resetGraph = () => {
      memoryGraph['nodes'] = new Map()
      memoryGraph['edges'] = new Map()
      memoryGraph['initialized'] = true
    }

    beforeEach(async () => {
      if (existsSync(TEST_DATA_DIR)) {
        await rm(TEST_DATA_DIR, { recursive: true })
      }
      await mkdir(TEST_DATA_DIR, { recursive: true })
      resetGraph()
    })

    afterEach(async () => {
      if (existsSync(TEST_DATA_DIR)) {
        await rm(TEST_DATA_DIR, { recursive: true })
      }
      resetGraph()
    })

    describe('addNode', () => {
      test('creates new node', async () => {
        const node = await memoryGraph.addNode('mem_1')
        expect(node.memoryId).toBe('mem_1')
        expect(node.edges).toEqual([])
        expect(node.inDegree).toBe(0)
        expect(node.outDegree).toBe(0)
      })

      test('returns existing node if already exists', async () => {
        const node1 = await memoryGraph.addNode('mem_1')
        const node2 = await memoryGraph.addNode('mem_1')
        expect(node1).toBe(node2)
      })
    })

    describe('addEdge', () => {
      test('creates edge between nodes', async () => {
        const edge = await memoryGraph.addEdge('mem_1', 'mem_2', 'reinforces')
        expect(edge.sourceId).toBe('mem_1')
        expect(edge.targetId).toBe('mem_2')
        expect(edge.type).toBe('reinforces')
        expect(edge.weight).toBe(1.0)
      })

      test('creates nodes if they do not exist', async () => {
        await memoryGraph.addEdge('new_1', 'new_2', 'related')
        const stats = memoryGraph.getStats()
        expect(stats.nodes).toBe(2)
        expect(stats.edges).toBe(1)
      })

      test('updates node degrees', async () => {
        await memoryGraph.addEdge('mem_a', 'mem_b', 'extends')
        const source = memoryGraph['nodes'].get('mem_a')
        const target = memoryGraph['nodes'].get('mem_b')
        expect(source.outDegree).toBe(1)
        expect(target.inDegree).toBe(1)
      })

      test('allows custom weight', async () => {
        const edge = await memoryGraph.addEdge('m1', 'm2', 'related', 0.5)
        expect(edge.weight).toBe(0.5)
      })
    })

    describe('getRelated', () => {
      test('returns empty for non-existent node', async () => {
        const related = await memoryGraph.getRelated('non_existent')
        expect(related).toEqual([])
      })

      test('returns all related memories', async () => {
        await memoryGraph.addEdge('center', 'related_1', 'reinforces')
        await memoryGraph.addEdge('center', 'related_2', 'extends')
        await memoryGraph.addEdge('related_3', 'center', 'contradicts')

        const related = await memoryGraph.getRelated('center')
        expect(related.length).toBe(3)
      })

      test('filters by relation type', async () => {
        await memoryGraph.addEdge('c', 'a', 'reinforces')
        await memoryGraph.addEdge('c', 'b', 'contradicts')

        const reinforcements = await memoryGraph.getRelated('c', ['reinforces'])
        expect(reinforcements.length).toBe(1)
        expect(reinforcements[0].memory).toBe('a')
      })

      test('sorts by weight descending', async () => {
        await memoryGraph.addEdge('c', 'low', 'related', 0.3)
        await memoryGraph.addEdge('c', 'high', 'related', 0.9)
        await memoryGraph.addEdge('c', 'mid', 'related', 0.6)

        const related = await memoryGraph.getRelated('c')
        expect(related[0].weight).toBe(0.9)
        expect(related[1].weight).toBe(0.6)
        expect(related[2].weight).toBe(0.3)
      })
    })

    describe('findContradictions', () => {
      test('returns only contradiction relations', async () => {
        await memoryGraph.addEdge('m', 'contradict1', 'contradicts')
        await memoryGraph.addEdge('m', 'reinforce1', 'reinforces')
        await memoryGraph.addEdge('m', 'contradict2', 'contradicts')

        const contradictions = await memoryGraph.findContradictions('m')
        expect(contradictions.length).toBe(2)
        expect(contradictions).toContain('contradict1')
        expect(contradictions).toContain('contradict2')
      })
    })

    describe('findReinforcements', () => {
      test('returns only reinforcement relations', async () => {
        await memoryGraph.addEdge('m', 'reinforce1', 'reinforces')
        await memoryGraph.addEdge('m', 'contradict1', 'contradicts')
        await memoryGraph.addEdge('m', 'reinforce2', 'reinforces')

        const reinforcements = await memoryGraph.findReinforcements('m')
        expect(reinforcements.length).toBe(2)
        expect(reinforcements).toContain('reinforce1')
        expect(reinforcements).toContain('reinforce2')
      })
    })

    describe('removeNode', () => {
      test('removes node and its edges', async () => {
        await memoryGraph.addEdge('a', 'b', 'related')
        await memoryGraph.addEdge('b', 'c', 'related')
        await memoryGraph.addEdge('a', 'c', 'related')

        await memoryGraph.removeNode('b')

        const stats = memoryGraph.getStats()
        expect(stats.nodes).toBe(2)
        expect(stats.edges).toBe(1)
      })

      test('handles non-existent node gracefully', async () => {
        await memoryGraph.removeNode('non_existent')
        expect(true).toBe(true)
      })

      test('updates neighbor degrees after removal', async () => {
        await memoryGraph.addEdge('a', 'b', 'reinforces')
        await memoryGraph.removeNode('b')

        const nodeA = memoryGraph['nodes'].get('a')
        expect(nodeA.edges.length).toBe(0)
      })
    })

    describe('findClusters', () => {
      test('finds connected components', async () => {
        await memoryGraph.addEdge('a1', 'a2', 'related')
        await memoryGraph.addEdge('a2', 'a3', 'related')
        await memoryGraph.addEdge('b1', 'b2', 'related')

        const clusters = await memoryGraph.findClusters(2)
        expect(clusters.length).toBe(2)
      })

      test('filters by minimum size', async () => {
        await memoryGraph.addEdge('a1', 'a2', 'related')
        await memoryGraph.addEdge('a2', 'a3', 'related')
        await memoryGraph.addEdge('b1', 'b2', 'related')

        const largeClusters = await memoryGraph.findClusters(3)
        expect(largeClusters.length).toBe(1)
        expect(largeClusters[0].size).toBe(3)
      })

      test('returns empty for no clusters meeting min size', async () => {
        await memoryGraph.addNode('single')

        const clusters = await memoryGraph.findClusters(2)
        expect(clusters.length).toBe(0)
      })
    })

    describe('getStats', () => {
      test('returns correct statistics', async () => {
        await memoryGraph.addEdge('a', 'b', 'reinforces')
        await memoryGraph.addEdge('b', 'c', 'extends')

        const stats = memoryGraph.getStats()
        expect(stats.nodes).toBe(3)
        expect(stats.edges).toBe(2)
        expect(stats.avgDegree).toBeCloseTo(4 / 3)
      })

      test('handles empty graph', () => {
        const stats = memoryGraph.getStats()
        expect(stats.nodes).toBe(0)
        expect(stats.edges).toBe(0)
        expect(stats.avgDegree).toBe(0)
      })
    })
  })

  describe('searchByEmbedding', () => {
    const { searchByEmbedding } = require('./vector')

    const createMemory = (id: string, embedding: number[], confidence = 0.8) => ({
      id,
      type: 'semantic',
      content: `Memory ${id}`,
      embedding,
      confidence: { current: confidence },
      metadata: { tags: [], source: 'test', createdAt: '', updatedAt: '' },
    })

    test('returns memories sorted by relevance score', async () => {
      const memories = [
        createMemory('m1', [1, 0, 0], 0.5),
        createMemory('m2', [0.9, 0.1, 0], 0.9),
        createMemory('m3', [0.5, 0.5, 0], 0.7),
      ]

      const queryEmbedding = [1, 0, 0]
      const results = await searchByEmbedding(queryEmbedding, memories)

      expect(results[0].memory.id).toBe('m2')
    })

    test('filters by minimum similarity', async () => {
      const memories = [
        createMemory('m1', [1, 0, 0], 0.8),
        createMemory('m2', [0, 1, 0], 0.8),
      ]

      const results = await searchByEmbedding([1, 0, 0], memories, { minSimilarity: 0.5 })

      expect(results.length).toBe(1)
      expect(results[0].memory.id).toBe('m1')
    })

    test('respects limit option', async () => {
      const memories = [
        createMemory('m1', [0.9, 0.1, 0], 0.8),
        createMemory('m2', [0.8, 0.2, 0], 0.8),
        createMemory('m3', [0.7, 0.3, 0], 0.8),
        createMemory('m4', [0.6, 0.4, 0], 0.8),
      ]

      const results = await searchByEmbedding([1, 0, 0], memories, { limit: 2 })
      expect(results.length).toBe(2)
    })

    test('skips memories without embeddings', async () => {
      const memories = [
        { ...createMemory('m1', [1, 0, 0]), embedding: undefined },
        createMemory('m2', [0.9, 0.1, 0], 0.8),
      ]

      const results = await searchByEmbedding([1, 0, 0], memories)
      expect(results.length).toBe(1)
      expect(results[0].memory.id).toBe('m2')
    })

    test('returns empty for empty memory array', async () => {
      const results = await searchByEmbedding([1, 0, 0], [])
      expect(results).toEqual([])
    })
  })

  describe('Confidence Module', () => {
    const {
      createConfidenceMetrics,
      calculateDecay,
      applyReinforcement,
      applyContradiction,
      calculateReliabilityScore,
      shouldTriggerValidation,
      getConfidenceLevel,
      mergeConfidence,
      refreshAccess,
    } = require('./confidence')

    describe('createConfidenceMetrics', () => {
      test('creates metrics with default values', () => {
        const metrics = createConfidenceMetrics()
        expect(metrics.initial).toBe(0.5)
        expect(metrics.current).toBe(0.5)
        expect(metrics.decayRate).toBe(30)
        expect(metrics.reinforcements).toBe(0)
        expect(metrics.contradictions).toBe(0)
      })

      test('creates metrics with custom initial confidence', () => {
        const metrics = createConfidenceMetrics(0.9)
        expect(metrics.initial).toBe(0.9)
        expect(metrics.current).toBe(0.9)
      })

      test('clamps confidence to valid range', () => {
        const tooHigh = createConfidenceMetrics(1.5)
        expect(tooHigh.current).toBe(1.0)

        const tooLow = createConfidenceMetrics(0.05)
        expect(tooLow.current).toBe(0.1)
      })
    })

    describe('calculateDecay', () => {
      test('returns current confidence for recent access', () => {
        const metrics = createConfidenceMetrics(0.8)
        const result = calculateDecay(metrics)
        expect(result).toBeCloseTo(0.8, 1)
      })

      test('reduces confidence over time', () => {
        const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
        const metrics = {
          ...createConfidenceMetrics(0.8),
          lastAccessed: oldDate,
        }
        const result = calculateDecay(metrics)
        expect(result).toBeLessThan(0.8)
      })

      test('never goes below 0.1', () => {
        const veryOldDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
        const metrics = {
          ...createConfidenceMetrics(0.8),
          lastAccessed: veryOldDate,
        }
        const result = calculateDecay(metrics)
        expect(result).toBeGreaterThanOrEqual(0.1)
      })
    })

    describe('applyReinforcement', () => {
      test('increases confidence', () => {
        const metrics = createConfidenceMetrics(0.5)
        const reinforced = applyReinforcement(metrics)
        expect(reinforced.current).toBeGreaterThan(0.5)
        expect(reinforced.reinforcements).toBe(1)
      })

      test('diminishing returns for repeated reinforcements', () => {
        let metrics = createConfidenceMetrics(0.5)
        const first = applyReinforcement(metrics)
        const second = applyReinforcement(first)
        const boost1 = first.current - 0.5
        const boost2 = second.current - first.current
        expect(boost2).toBeLessThan(boost1)
      })

      test('never exceeds 1.0', () => {
        let metrics = createConfidenceMetrics(0.95)
        for (let i = 0; i < 10; i++) {
          metrics = applyReinforcement(metrics)
        }
        expect(metrics.current).toBeLessThanOrEqual(1.0)
      })
    })

    describe('applyContradiction', () => {
      test('decreases confidence', () => {
        const metrics = createConfidenceMetrics(0.8)
        const contradicted = applyContradiction(metrics)
        expect(contradicted.current).toBeLessThan(0.8)
        expect(contradicted.contradictions).toBe(1)
      })

      test('never goes below 0.1', () => {
        let metrics = createConfidenceMetrics(0.3)
        for (let i = 0; i < 10; i++) {
          metrics = applyContradiction(metrics)
        }
        expect(metrics.current).toBeGreaterThanOrEqual(0.1)
      })
    })

    describe('calculateReliabilityScore', () => {
      test('returns current confidence with no interactions', () => {
        const metrics = createConfidenceMetrics(0.7)
        expect(calculateReliabilityScore(metrics)).toBe(0.7)
      })

      test('increases score with reinforcements', () => {
        const metrics = {
          ...createConfidenceMetrics(0.5),
          reinforcements: 5,
          contradictions: 0,
        }
        const score = calculateReliabilityScore(metrics)
        expect(score).toBeGreaterThan(0.5)
      })

      test('decreases score with contradictions', () => {
        const metrics = {
          ...createConfidenceMetrics(0.5),
          reinforcements: 0,
          contradictions: 5,
        }
        const score = calculateReliabilityScore(metrics)
        expect(score).toBeLessThan(0.5)
      })
    })

    describe('shouldTriggerValidation', () => {
      test('returns true for low confidence', () => {
        const metrics = createConfidenceMetrics(0.3)
        expect(shouldTriggerValidation(metrics)).toBe(true)
      })

      test('returns false for high confidence', () => {
        const metrics = createConfidenceMetrics(0.8)
        expect(shouldTriggerValidation(metrics)).toBe(false)
      })

      test('returns true with contradictions at medium confidence', () => {
        const metrics = {
          ...createConfidenceMetrics(0.55),
          contradictions: 1,
        }
        expect(shouldTriggerValidation(metrics)).toBe(true)
      })
    })

    describe('getConfidenceLevel', () => {
      test('returns low for values below 0.4', () => {
        expect(getConfidenceLevel(0.3)).toBe('low')
      })

      test('returns medium for values between 0.4 and 0.7', () => {
        expect(getConfidenceLevel(0.5)).toBe('medium')
      })

      test('returns high for values 0.7 and above', () => {
        expect(getConfidenceLevel(0.7)).toBe('high')
        expect(getConfidenceLevel(1.0)).toBe('high')
      })
    })

    describe('mergeConfidence', () => {
      test('averages current confidence', () => {
        const a = createConfidenceMetrics(0.6)
        const b = createConfidenceMetrics(0.8)
        const merged = mergeConfidence(a, b)
        expect(merged.current).toBe(0.7)
      })

      test('sums reinforcements and contradictions', () => {
        const a = { ...createConfidenceMetrics(0.5), reinforcements: 2, contradictions: 1 }
        const b = { ...createConfidenceMetrics(0.5), reinforcements: 3, contradictions: 2 }
        const merged = mergeConfidence(a, b)
        expect(merged.reinforcements).toBe(5)
        expect(merged.contradictions).toBe(3)
      })
    })

    describe('refreshAccess', () => {
      test('updates lastAccessed timestamp', () => {
        const oldDate = new Date(Date.now() - 10000).toISOString()
        const metrics = { ...createConfidenceMetrics(0.5), lastAccessed: oldDate }
        const refreshed = refreshAccess(metrics)
        expect(new Date(refreshed.lastAccessed).getTime()).toBeGreaterThan(new Date(oldDate).getTime())
      })
    })
  })

  describe('Temporal Module', () => {
    const {
      applyTemporalDecay,
      shouldCleanup,
      calculateOptimalHalfLife,
      getMemoryAge,
      getDaysSinceAccess,
      isStale,
      sortByRecency,
      filterByTimeRange,
      getLifecycleStage,
    } = require('./temporal')
    const { createConfidenceMetrics } = require('./confidence')

    const createTestMemory = (overrides: Partial<any> = {}) => {
      const now = new Date().toISOString()
      return {
        id: 'test_mem',
        type: 'semantic',
        content: 'Test memory',
        confidence: createConfidenceMetrics(0.7),
        metadata: {
          source: 'test',
          tags: [],
          createdAt: now,
          updatedAt: now,
        },
        ...overrides,
      }
    }

    describe('applyTemporalDecay', () => {
      test('applies decay to memory confidence', () => {
        const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
        const memory = createTestMemory({
          confidence: { ...createConfidenceMetrics(0.8), lastAccessed: oldDate },
        })
        const decayed = applyTemporalDecay(memory)
        expect(decayed.confidence.current).toBeLessThan(0.8)
      })

      test('preserves other memory properties', () => {
        const memory = createTestMemory()
        const decayed = applyTemporalDecay(memory)
        expect(decayed.id).toBe(memory.id)
        expect(decayed.content).toBe(memory.content)
      })
    })

    describe('shouldCleanup', () => {
      test('returns true for low confidence memories without reinforcements', () => {
        const oldDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
        const memory = createTestMemory({
          confidence: {
            ...createConfidenceMetrics(0.2),
            lastAccessed: oldDate,
            reinforcements: 0,
          },
        })
        expect(shouldCleanup(memory)).toBe(true)
      })

      test('returns false for reinforced memories', () => {
        const oldDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
        const memory = createTestMemory({
          confidence: {
            ...createConfidenceMetrics(0.2),
            lastAccessed: oldDate,
            reinforcements: 3,
          },
        })
        expect(shouldCleanup(memory)).toBe(false)
      })
    })

    describe('calculateOptimalHalfLife', () => {
      test('returns 180 for highly reinforced memories', () => {
        const memory = createTestMemory({
          confidence: { ...createConfidenceMetrics(0.8), reinforcements: 6, contradictions: 0 },
        })
        expect(calculateOptimalHalfLife(memory)).toBe(180)
      })

      test('returns 14 for contradicted memories', () => {
        const memory = createTestMemory({
          confidence: { ...createConfidenceMetrics(0.5), reinforcements: 1, contradictions: 3 },
        })
        expect(calculateOptimalHalfLife(memory)).toBe(14)
      })

      test('returns default 30 for neutral memories', () => {
        const memory = createTestMemory()
        expect(calculateOptimalHalfLife(memory)).toBe(30)
      })
    })

    describe('getMemoryAge', () => {
      test('returns age in days', () => {
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        const memory = createTestMemory({
          metadata: { source: 'test', tags: [], createdAt: twoDaysAgo, updatedAt: twoDaysAgo },
        })
        const age = getMemoryAge(memory)
        expect(age).toBeCloseTo(2, 0)
      })
    })

    describe('getDaysSinceAccess', () => {
      test('returns days since last access', () => {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        const memory = createTestMemory({
          confidence: { ...createConfidenceMetrics(0.7), lastAccessed: threeDaysAgo },
        })
        const days = getDaysSinceAccess(memory)
        expect(days).toBeCloseTo(3, 0)
      })
    })

    describe('isStale', () => {
      test('returns false for recently accessed memories', () => {
        const memory = createTestMemory()
        expect(isStale(memory, 90)).toBe(false)
      })

      test('returns true for old memories', () => {
        const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString()
        const memory = createTestMemory({
          confidence: { ...createConfidenceMetrics(0.7), lastAccessed: oldDate },
        })
        expect(isStale(memory, 90)).toBe(true)
      })
    })

    describe('sortByRecency', () => {
      test('sorts memories by lastAccessed descending', () => {
        const older = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        const recent = new Date().toISOString()

        const memories = [
          createTestMemory({ id: 'old', confidence: { ...createConfidenceMetrics(0.5), lastAccessed: older } }),
          createTestMemory({ id: 'new', confidence: { ...createConfidenceMetrics(0.5), lastAccessed: recent } }),
        ]

        const sorted = sortByRecency(memories)
        expect(sorted[0].id).toBe('new')
        expect(sorted[1].id).toBe('old')
      })
    })

    describe('filterByTimeRange', () => {
      test('filters memories by creation date', () => {
        const now = new Date()
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)

        const memories = [
          createTestMemory({ id: 'm1', metadata: { createdAt: now.toISOString() } }),
          createTestMemory({ id: 'm2', metadata: { createdAt: twoDaysAgo.toISOString() } }),
        ]

        const filtered = filterByTimeRange(memories, yesterday)
        expect(filtered.length).toBe(1)
        expect(filtered[0].id).toBe('m1')
      })
    })

    describe('getLifecycleStage', () => {
      test('returns new for very recent memories', () => {
        const now = new Date().toISOString()
        const memory = createTestMemory({
          metadata: { source: 'test', tags: [], createdAt: now, updatedAt: now },
        })
        expect(getLifecycleStage(memory)).toBe('new')
      })

      test('returns active for high confidence recently accessed memories', () => {
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        const memory = createTestMemory({
          metadata: { source: 'test', tags: [], createdAt: twoDaysAgo, updatedAt: twoDaysAgo },
          confidence: { ...createConfidenceMetrics(0.8), lastAccessed: new Date().toISOString() },
        })
        expect(getLifecycleStage(memory)).toBe('active')
      })

      test('returns expired for very low confidence', () => {
        const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        const memory = createTestMemory({
          metadata: { source: 'test', tags: [], createdAt: oldDate, updatedAt: oldDate },
          confidence: { ...createConfidenceMetrics(0.25), lastAccessed: oldDate },
        })
        expect(getLifecycleStage(memory)).toBe('expired')
      })
    })
  })
})
