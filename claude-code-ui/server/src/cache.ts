import { CACHE_DEFAULT_TTL_MS, CONFIG_CACHE_TTL_MS } from './constants'

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private defaultTtlMs: number

  constructor(defaultTtlMs: number = CACHE_DEFAULT_TTL_MS) {
    this.defaultTtlMs = defaultTtlMs
  }

  set(key: string, value: T, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs)
    this.cache.set(key, { value, expiresAt })
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return undefined
    }

    return entry.value
  }

  has(key: string): boolean {
    return this.get(key) !== undefined
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    this.cleanup()
    return this.cache.size
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }
}

export const configCache = new SimpleCache<unknown>(CONFIG_CACHE_TTL_MS)
