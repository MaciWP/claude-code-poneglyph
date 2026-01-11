import { describe, test, expect, beforeEach } from 'bun:test'
import { SimpleCache } from './cache'

describe('SimpleCache', () => {
  let cache: SimpleCache<string>

  beforeEach(() => {
    cache = new SimpleCache<string>(1000)
  })

  describe('set() and get()', () => {
    test('stores and retrieves values', () => {
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')
    })

    test('returns undefined for missing keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined()
    })

    test('overwrites existing values', () => {
      cache.set('key', 'first')
      cache.set('key', 'second')
      expect(cache.get('key')).toBe('second')
    })
  })

  describe('has()', () => {
    test('returns true for existing keys', () => {
      cache.set('exists', 'value')
      expect(cache.has('exists')).toBe(true)
    })

    test('returns false for missing keys', () => {
      expect(cache.has('missing')).toBe(false)
    })
  })

  describe('delete()', () => {
    test('removes existing keys', () => {
      cache.set('toDelete', 'value')
      expect(cache.delete('toDelete')).toBe(true)
      expect(cache.get('toDelete')).toBeUndefined()
    })

    test('returns false for non-existent keys', () => {
      expect(cache.delete('nonexistent')).toBe(false)
    })
  })

  describe('clear()', () => {
    test('removes all entries', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.clear()
      expect(cache.get('key1')).toBeUndefined()
      expect(cache.get('key2')).toBeUndefined()
    })
  })

  describe('size()', () => {
    test('returns correct count', () => {
      expect(cache.size()).toBe(0)
      cache.set('key1', 'value1')
      expect(cache.size()).toBe(1)
      cache.set('key2', 'value2')
      expect(cache.size()).toBe(2)
    })
  })

  describe('TTL expiration', () => {
    test('returns undefined for expired entries', async () => {
      const shortCache = new SimpleCache<string>(50)
      shortCache.set('expires', 'soon')

      expect(shortCache.get('expires')).toBe('soon')

      await Bun.sleep(60)

      expect(shortCache.get('expires')).toBeUndefined()
    })

    test('respects custom TTL per entry', async () => {
      cache.set('shortLived', 'value', 50)
      cache.set('longLived', 'value', 2000)

      await Bun.sleep(60)

      expect(cache.get('shortLived')).toBeUndefined()
      expect(cache.get('longLived')).toBe('value')
    })

    test('has() returns false for expired entries', async () => {
      const shortCache = new SimpleCache<string>(100)
      shortCache.set('expires', 'value')

      await Bun.sleep(150)

      expect(shortCache.has('expires')).toBe(false)
    })

    test('size() excludes expired entries', async () => {
      const shortCache = new SimpleCache<string>(100)
      shortCache.set('expires', 'value')
      shortCache.set('alsoExpires', 'value')

      expect(shortCache.size()).toBe(2)

      await Bun.sleep(150)

      expect(shortCache.size()).toBe(0)
    })
  })

  describe('type safety', () => {
    test('works with objects', () => {
      const objCache = new SimpleCache<{ name: string; count: number }>()
      objCache.set('user', { name: 'Alice', count: 42 })

      const result = objCache.get('user')
      expect(result?.name).toBe('Alice')
      expect(result?.count).toBe(42)
    })

    test('works with arrays', () => {
      const arrCache = new SimpleCache<string[]>()
      arrCache.set('items', ['a', 'b', 'c'])

      const result = arrCache.get('items')
      expect(result).toEqual(['a', 'b', 'c'])
    })
  })
})
