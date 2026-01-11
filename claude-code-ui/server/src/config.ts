import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default('0.0.0.0'),
  SESSIONS_DIR: z.string().default('./storage/sessions'),
  STATIC_DIR: z.string().default('../../web/dist'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ALLOWED_WORK_DIRS: z.string().optional().transform(val => val?.split(',').map(d => d.trim()).filter(Boolean) || []),
})

export type EnvConfig = z.infer<typeof envSchema>

function loadConfig(): EnvConfig {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    console.error('❌ Invalid environment configuration:')
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
    }
    process.exit(1)
  }
  return result.data
}

export const config = loadConfig()
