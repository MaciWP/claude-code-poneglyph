import { logger } from '../../logger'
import type { Memory, MemorySearchResult } from './types'

const log = logger.child('vector-store')

interface PipelineFunction {
  (text: string, options: { pooling: string; normalize: boolean }): Promise<{ data: Float32Array }>
}

let pipeline: PipelineFunction | null = null
let modelLoaded = false
let loadingPromise: Promise<void> | null = null

async function loadModel(): Promise<void> {
  if (modelLoaded) return
  if (loadingPromise) {
    await loadingPromise
    return
  }

  loadingPromise = (async () => {
    try {
      log.info('Loading embedding model...')
      const { pipeline: createPipeline } = await import('@xenova/transformers')
      pipeline = await createPipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2') as unknown as PipelineFunction
      modelLoaded = true
      log.info('Embedding model loaded successfully')
    } catch (error) {
      log.error('Failed to load embedding model', { error })
      throw error
    }
  })()

  await loadingPromise
}

export async function generateEmbedding(text: string): Promise<number[]> {
  await loadModel()

  if (!pipeline) {
    throw new Error('Embedding model not loaded')
  }

  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const output = await pipeline(text, { pooling: 'mean', normalize: true })
      return Array.from(output.data as Float32Array)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      log.warn('Embedding failed, retrying...', { attempt, maxRetries, error: lastError.message })
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * attempt)) // exponential backoff
      }
    }
  }

  log.error('All embedding attempts failed', { error: lastError })
  throw lastError || new Error('Embedding failed after all retries')
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  return denominator === 0 ? 0 : dotProduct / denominator
}

export async function searchByEmbedding(
  queryEmbedding: number[],
  memories: Memory[],
  options: { limit?: number; minSimilarity?: number } = {}
): Promise<MemorySearchResult[]> {
  const { limit = 10, minSimilarity = 0.3 } = options

  const results: MemorySearchResult[] = []

  for (const memory of memories) {
    if (!memory.embedding) continue

    const similarity = cosineSimilarity(queryEmbedding, memory.embedding)
    if (similarity >= minSimilarity) {
      results.push({
        memory,
        similarity,
        relevanceScore: similarity * memory.confidence.current
      })
    }
  }

  results.sort((a, b) => b.relevanceScore - a.relevanceScore)
  return results.slice(0, limit)
}

export async function semanticSearch(
  query: string,
  memories: Memory[],
  options: { limit?: number; minSimilarity?: number } = {}
): Promise<MemorySearchResult[]> {
  const queryEmbedding = await generateEmbedding(query)
  return searchByEmbedding(queryEmbedding, memories, options)
}

export function isModelLoaded(): boolean {
  return modelLoaded
}

export async function preloadModel(): Promise<void> {
  await loadModel()
}
