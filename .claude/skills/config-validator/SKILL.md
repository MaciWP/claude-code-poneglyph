---
name: config-validator
description: |
  Type-safe configuration validation with Zod and Bun.env for environment variables.
  Use proactively when: loading env vars, setting up config, validating settings.
  Keywords - env, config, validation, zod, environment, settings, bun env
activation:
  keywords:
    - env
    - config
    - validation
    - zod
    - environment
    - settings
    - bun env
for_agents: [builder]
version: "1.0"
---

# Config Validator

Type-safe configuration and environment variable validation for Bun/Elysia projects.

## When to Use This Skill

- Loading environment variables from `.env` files
- Setting up application configuration
- Need type-safe config validation
- Want to fail fast on missing/invalid config
- Documenting required configuration
- Setting default values for optional config
- Separating dev/staging/production configs

## Patterns

### 1. Basic Env Loading - Fail Fast

```typescript
// WRONG - No validation, silent failures
const port = process.env.PORT
const apiKey = process.env.API_KEY
// port could be undefined or "abc"
// apiKey could be empty

// CORRECT - Validate and fail fast
import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  API_KEY: z.string().min(1, 'API_KEY is required'),
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
})

function loadConfig() {
  const result = envSchema.safeParse(Bun.env)

  if (!result.success) {
    console.error('Configuration validation failed:')
    result.error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`)
    })
    process.exit(1)
  }

  return result.data
}

export const config = loadConfig()
```

### 2. Complex Validation - URLs, Patterns

```typescript
// WRONG - No URL validation
const databaseUrl = Bun.env.DATABASE_URL // Could be "hello" or malformed

// CORRECT - Full validation with patterns
const envSchema = z.object({
  // Database - must be valid PostgreSQL URL
  DATABASE_URL: z
    .string()
    .url()
    .startsWith('postgresql://', 'Must be PostgreSQL URL'),

  // Redis - validate URL format
  REDIS_URL: z
    .string()
    .url()
    .startsWith('redis://')
    .optional(),

  // API Key - must have correct prefix
  ANTHROPIC_API_KEY: z
    .string()
    .startsWith('sk-ant-', 'Invalid Anthropic API key format')
    .optional(),

  // JWT Secret - minimum length for security
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters'),

  // Port - integer in valid range
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),

  // Boolean coercion
  DEBUG: z.coerce.boolean().default(false),
})
```

### 3. Production Refinements

```typescript
// WRONG - Same validation for all environments
const schema = z.object({
  JWT_SECRET: z.string().min(16),
})

// CORRECT - Stricter in production
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'staging', 'production']),
    JWT_SECRET: z.string().min(32),
    DEBUG: z.coerce.boolean().default(false),
  })
  .refine(
    (data) => {
      // In production, require longer secret
      if (data.NODE_ENV === 'production') {
        return data.JWT_SECRET.length >= 64
      }
      return true
    },
    {
      message: 'JWT_SECRET must be at least 64 characters in production',
      path: ['JWT_SECRET'],
    }
  )
  .refine(
    (data) => {
      // No debug in production
      if (data.NODE_ENV === 'production' && data.DEBUG) {
        return false
      }
      return true
    },
    {
      message: 'DEBUG must be false in production',
      path: ['DEBUG'],
    }
  )
```

### 4. Grouped Configuration

```typescript
// WRONG - Flat config object
const config = {
  dbUrl: Bun.env.DATABASE_URL,
  dbPool: Bun.env.DATABASE_POOL_SIZE,
  redisUrl: Bun.env.REDIS_URL,
  redisMaxConn: Bun.env.REDIS_MAX_CONNECTIONS,
  // ... messy flat structure
}

// CORRECT - Grouped by concern
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(8080),
})

const databaseSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_SIZE: z.coerce.number().int().min(1).max(100).default(10),
  DATABASE_TIMEOUT_MS: z.coerce.number().int().default(30000),
})

const redisSchema = z.object({
  REDIS_URL: z.string().url().optional(),
  REDIS_MAX_CONNECTIONS: z.coerce.number().int().default(50),
})

const authSchema = z.object({
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('30m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
})

// Combined config with groups
export const config = {
  app: envSchema.parse(Bun.env),
  database: databaseSchema.parse(Bun.env),
  redis: redisSchema.parse(Bun.env),
  auth: authSchema.parse(Bun.env),
}

// Usage: config.database.DATABASE_URL
```

### 5. File-Based Config with Env Override

```typescript
// WRONG - Only env vars
const config = loadFromEnv()

// CORRECT - File + env override pattern
interface Config {
  port: number
  apiKey: string
  features: {
    enableSignup: boolean
    maxUsersPerOrg: number
  }
}

async function loadConfig(): Promise<Config> {
  // 1. Load defaults from file
  const configFile = Bun.file('./config.json')
  let fileConfig: Partial<Config> = {}

  if (await configFile.exists()) {
    fileConfig = await configFile.json()
  }

  // 2. Override with env vars
  return {
    port: Number(Bun.env.PORT) || fileConfig.port || 8080,
    apiKey: Bun.env.API_KEY || fileConfig.apiKey || '',
    features: {
      enableSignup:
        Bun.env.ENABLE_SIGNUP !== undefined
          ? Bun.env.ENABLE_SIGNUP === 'true'
          : fileConfig.features?.enableSignup ?? true,
      maxUsersPerOrg:
        Number(Bun.env.MAX_USERS_PER_ORG) ||
        fileConfig.features?.maxUsersPerOrg ||
        50,
    },
  }
}
```

### 6. Type Export Pattern

```typescript
// config.ts
import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
})

// Export the type for use elsewhere
export type Config = z.infer<typeof envSchema>

// Validate and export config
function loadConfig(): Config {
  const result = envSchema.safeParse(Bun.env)
  if (!result.success) {
    console.error('Config validation failed:')
    for (const error of result.error.errors) {
      console.error(`  ${error.path}: ${error.message}`)
    }
    process.exit(1)
  }
  return result.data
}

export const config = loadConfig()

// Usage in other files
// import { config, type Config } from './config'
```

## Checklist

- [ ] All env vars validated with Zod schema
- [ ] App fails fast on startup if config invalid
- [ ] Required vs optional vars clearly distinguished
- [ ] Default values provided for optional vars
- [ ] Numbers coerced with `z.coerce.number()`
- [ ] Booleans coerced with `z.coerce.boolean()`
- [ ] URLs validated with `z.string().url()`
- [ ] API keys validated with prefix patterns
- [ ] Production has stricter requirements (refine)
- [ ] Config type exported for TypeScript
- [ ] `.env.example` file documents all vars
- [ ] Secrets never logged or exposed

## Anti-Patterns

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| `process.env.X` without check | Undefined at runtime | Use Zod validation |
| `Number(process.env.X)` | Returns NaN silently | Use `z.coerce.number()` |
| Same config all environments | Insecure in production | Use `.refine()` for prod |
| Logging config values | Exposes secrets | Log only safe values |
| Optional required vars | App crashes later | Require at startup |
| Flat config object | Hard to organize | Group by concern |
| No `.env.example` | Unclear requirements | Document all vars |
| Hardcoded secrets | Security risk | Always use env vars |

## Examples

### Complete Elysia Config

```typescript
// server/src/config.ts
import { z } from 'zod'

const envSchema = z
  .object({
    // Application
    NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(8080),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    // Database
    DATABASE_URL: z.string().url().startsWith('postgresql://'),

    // Auth
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().default('30m'),

    // External APIs
    ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-').optional(),

    // Features
    ENABLE_SIGNUP: z.coerce.boolean().default(true),
    ENABLE_ANALYTICS: z.coerce.boolean().default(false),
  })
  .refine(
    (data) => {
      if (data.NODE_ENV === 'production') {
        return data.JWT_SECRET.length >= 64
      }
      return true
    },
    { message: 'JWT_SECRET must be 64+ chars in production', path: ['JWT_SECRET'] }
  )

export type Config = z.infer<typeof envSchema>

function loadConfig(): Config {
  const result = envSchema.safeParse(Bun.env)

  if (!result.success) {
    console.error('Configuration validation failed:')
    result.error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`)
    })
    process.exit(1)
  }

  // Log safe config values (never secrets)
  console.log('Config loaded:', {
    NODE_ENV: result.data.NODE_ENV,
    PORT: result.data.PORT,
    LOG_LEVEL: result.data.LOG_LEVEL,
    ENABLE_SIGNUP: result.data.ENABLE_SIGNUP,
  })

  return result.data
}

export const config = loadConfig()
```

### .env.example Template

```bash
# .env.example - Copy to .env and fill values

# Application
NODE_ENV=development
PORT=8080
LOG_LEVEL=info

# Database (required)
DATABASE_URL=postgresql://user:password@localhost:5432/mydb

# Authentication (required)
JWT_SECRET=your-secret-key-at-least-32-characters-long
JWT_EXPIRES_IN=30m

# External APIs (optional)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Feature Flags
ENABLE_SIGNUP=true
ENABLE_ANALYTICS=false
```

### Using Config in Elysia

```typescript
// server/src/index.ts
import { Elysia } from 'elysia'
import { config } from './config'

const app = new Elysia()
  .get('/health', () => ({
    status: 'ok',
    environment: config.NODE_ENV,
    timestamp: Date.now(),
  }))
  .get('/config', () => ({
    // Only expose safe values
    environment: config.NODE_ENV,
    features: {
      signup: config.ENABLE_SIGNUP,
      analytics: config.ENABLE_ANALYTICS,
    },
  }))
  .listen(config.PORT)

console.log(`Server running on port ${config.PORT} (${config.NODE_ENV})`)
```

---

**Version**: 1.0
**Stack**: Bun, Zod, TypeScript
