import { describe, test, expect } from 'bun:test'
import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default('0.0.0.0'),
  SESSIONS_DIR: z.string().default('./storage/sessions'),
  STATIC_DIR: z.string().default('../../web/dist'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

describe('Config Schema', () => {
  describe('defaults', () => {
    test('uses default PORT when not set', () => {
      const result = envSchema.parse({})
      expect(result.PORT).toBe(8080)
    })

    test('uses default HOST when not set', () => {
      const result = envSchema.parse({})
      expect(result.HOST).toBe('0.0.0.0')
    })

    test('uses default SESSIONS_DIR when not set', () => {
      const result = envSchema.parse({})
      expect(result.SESSIONS_DIR).toBe('./storage/sessions')
    })

    test('uses default NODE_ENV when not set', () => {
      const result = envSchema.parse({})
      expect(result.NODE_ENV).toBe('development')
    })

    test('uses default LOG_LEVEL when not set', () => {
      const result = envSchema.parse({})
      expect(result.LOG_LEVEL).toBe('info')
    })
  })

  describe('coercion', () => {
    test('coerces string PORT to number', () => {
      const result = envSchema.parse({ PORT: '3000' })
      expect(result.PORT).toBe(3000)
      expect(typeof result.PORT).toBe('number')
    })

    test('coerces numeric string to number', () => {
      const result = envSchema.parse({ PORT: '9999' })
      expect(result.PORT).toBe(9999)
    })
  })

  describe('validation', () => {
    test('accepts valid NODE_ENV values', () => {
      const dev = envSchema.parse({ NODE_ENV: 'development' })
      expect(dev.NODE_ENV).toBe('development')

      const prod = envSchema.parse({ NODE_ENV: 'production' })
      expect(prod.NODE_ENV).toBe('production')

      const test = envSchema.parse({ NODE_ENV: 'test' })
      expect(test.NODE_ENV).toBe('test')
    })

    test('rejects invalid NODE_ENV values', () => {
      expect(() => envSchema.parse({ NODE_ENV: 'staging' })).toThrow()
    })

    test('accepts valid LOG_LEVEL values', () => {
      const levels = ['debug', 'info', 'warn', 'error'] as const
      for (const level of levels) {
        const result = envSchema.parse({ LOG_LEVEL: level })
        expect(result.LOG_LEVEL).toBe(level)
      }
    })

    test('rejects invalid LOG_LEVEL values', () => {
      expect(() => envSchema.parse({ LOG_LEVEL: 'trace' })).toThrow()
    })
  })

  describe('custom values', () => {
    test('uses provided PORT', () => {
      const result = envSchema.parse({ PORT: 3000 })
      expect(result.PORT).toBe(3000)
    })

    test('uses provided HOST', () => {
      const result = envSchema.parse({ HOST: 'localhost' })
      expect(result.HOST).toBe('localhost')
    })

    test('uses provided SESSIONS_DIR', () => {
      const result = envSchema.parse({ SESSIONS_DIR: '/custom/path' })
      expect(result.SESSIONS_DIR).toBe('/custom/path')
    })
  })
})
