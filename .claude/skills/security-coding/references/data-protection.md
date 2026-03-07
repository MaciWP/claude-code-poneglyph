# Data Protection

Environment configuration validation and encryption at rest.

## Environment Configuration

```typescript
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  DATABASE_URL: z.string().url(),
  ENCRYPTION_KEY: z.string().length(64, 'ENCRYPTION_KEY must be 64 hex chars'),
  CORS_ORIGIN: z.string().url().optional(),
})

function loadEnv() {
  const result = envSchema.safeParse(Bun.env)
  if (!result.success) {
    console.error('Invalid environment configuration:')
    console.error(result.error.format())
    process.exit(1)
  }
  return result.data
}

export const env = loadEnv()
```

## Encryption at Rest

```typescript
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16
const SALT_LENGTH = 32

function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, 32)
}

export function encrypt(plaintext: string, masterKey: string): string {
  const salt = randomBytes(SALT_LENGTH)
  const key = deriveKey(masterKey, salt)
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ])
  const tag = cipher.getAuthTag()

  // Format: salt + iv + tag + ciphertext
  return Buffer.concat([salt, iv, tag, encrypted]).toString('base64')
}

export function decrypt(ciphertext: string, masterKey: string): string {
  const data = Buffer.from(ciphertext, 'base64')

  const salt = data.subarray(0, SALT_LENGTH)
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
  const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

  const key = deriveKey(masterKey, salt)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  return decipher.update(encrypted) + decipher.final('utf8')
}
```

## Required Environment Variables

```bash
# .env
JWT_SECRET=<min-32-char-random-string>
ENCRYPTION_KEY=<64-char-hex-string>
DATABASE_URL=<connection-string>
ANTHROPIC_API_KEY=<api-key>
```

## Security Headers Middleware

```typescript
import { Elysia } from 'elysia'

export const securityHeaders = new Elysia()
  .onBeforeHandle(({ set }) => {
    set.headers['X-Content-Type-Options'] = 'nosniff'
    set.headers['X-Frame-Options'] = 'DENY'
    set.headers['X-XSS-Protection'] = '1; mode=block'
    set.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    set.headers['Content-Security-Policy'] = "default-src 'self'"
  })
```

## Key Rules

| Rule | Why |
|------|-----|
| Validate env at startup | Fail fast, not at runtime |
| AES-256-GCM for encryption | Authenticated encryption prevents tampering |
| Derive keys with scrypt | Don't use raw env string as crypto key |
| Random salt per encryption | Same plaintext produces different ciphertext |
| Never log secrets | API keys, passwords, encryption keys |
