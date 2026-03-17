import { describe, test, expect } from 'bun:test'

/**
 * Tests for secrets-validator.ts
 *
 * Tests the PostToolUse hook that detects hardcoded secrets in code files.
 */

const VALIDATOR_PATH = '.claude/hooks/validators/security/secrets-validator.ts'

interface HookInput {
  tool_name: string
  tool_input: {
    file_path?: string
    content?: string
  }
  tool_output: string
}

async function runValidator(input: HookInput): Promise<{
  exitCode: number
  stderr: string
  stdout: string
}> {
  const proc = Bun.spawn([process.execPath, 'run', VALIDATOR_PATH], {
    stdin: new Blob([JSON.stringify(input)]),
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const exitCode = await proc.exited
  const stderr = await new Response(proc.stderr).text()
  const stdout = await new Response(proc.stdout).text()

  return { exitCode, stderr, stdout }
}

// Test fake keys — intentionally short/invalid to avoid GitHub Push Protection
const FAKE_AWS_KEY = 'AKIAIOSFODNN7EXAMPLE'
const FAKE_STRIPE_KEY = 'sk_live_' + 'a'.repeat(20)
const FAKE_OPENAI_KEY = 'sk-' + 'a'.repeat(20)
const FAKE_GITHUB_TOKEN = 'ghp_' + 'A'.repeat(36)

describe('secrets-validator', () => {
  describe('tool filtering', () => {
    test('passes for non-Write/Edit tools', async () => {
      const { exitCode } = await runValidator({
        tool_name: 'Read',
        tool_input: { file_path: 'src/index.ts' },
        tool_output: 'file content',
      })

      expect(exitCode).toBe(0)
    })

    test('passes for Write tool on non-code files', async () => {
      const { exitCode } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'README.md',
          content: 'password = "supersecret123"',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(0)
    })
  })

  describe('path filtering', () => {
    test('ignores test files', async () => {
      const { exitCode } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/auth.test.ts',
          content: `const token = "${FAKE_OPENAI_KEY}"`,
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(0)
    })

    test('ignores spec files', async () => {
      const { exitCode } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/auth.spec.ts',
          content: `const key = "${FAKE_AWS_KEY}"`,
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(0)
    })

    test('ignores mock files', async () => {
      const { exitCode } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/__mocks__/config.ts',
          content: 'password = "testpassword123"',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(0)
    })

    test('ignores node_modules', async () => {
      const { exitCode } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'node_modules/some-pkg/index.ts',
          content: `const key = "${FAKE_AWS_KEY}"`,
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(0)
    })

    test('ignores .env.example files', async () => {
      const { exitCode } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: '.env.example.ts',
          content: 'password = "placeholder1234"',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(0)
    })
  })

  describe('AWS Access Key', () => {
    test('blocks AWS access key', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/config.ts',
          content: `const key = "${FAKE_AWS_KEY}"`,
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('AWS Access Key')
      expect(stderr).toContain('BLOCKED')
    })
  })

  describe('Private Key', () => {
    test('blocks private key', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/crypto.ts',
          content: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAK...',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('Private Key')
    })
  })

  describe('JWT Token', () => {
    test('blocks JWT token', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/auth.ts',
          content: 'const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc"',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('JWT Token')
    })
  })

  describe('Hardcoded Secret', () => {
    test('blocks hardcoded password', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/db.ts',
          content: 'password = "mySecretPassword123"',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('Hardcoded Secret')
    })

    test('blocks hardcoded api_key', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/api.ts',
          content: "api_key = 'abcdefghijklmnop'",
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('Hardcoded Secret')
    })

    test('blocks hardcoded token', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/service.ts',
          content: 'token: "a1b2c3d4e5f6g7h8"',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('Hardcoded Secret')
    })

    test('passes short values (< 8 chars)', async () => {
      const { exitCode } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/config.ts',
          content: 'password = "short"',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(0)
    })
  })

  describe('MongoDB Connection String', () => {
    test('blocks MongoDB connection string', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/db.ts',
          content: 'const uri = "mongodb+srv://admin:pass1234@cluster.example.net"',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('MongoDB Connection String')
    })
  })

  describe('PostgreSQL Connection String', () => {
    test('blocks PostgreSQL connection string', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/db.ts',
          content: 'const uri = "postgres://user:pass@localhost:5432/db"',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('PostgreSQL Connection String')
    })
  })

  describe('API Key (Stripe/OpenAI)', () => {
    test('blocks Stripe secret key', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/payment.ts',
          content: `const key = "${FAKE_STRIPE_KEY}"`,
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('API Key (Stripe/OpenAI)')
    })

    test('blocks OpenAI key', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/ai.ts',
          content: `const key = "${FAKE_OPENAI_KEY}"`,
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('API Key (Stripe/OpenAI)')
    })
  })

  describe('GitHub Token', () => {
    test('blocks GitHub personal access token', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/github.ts',
          content: `const token = "${FAKE_GITHUB_TOKEN}"`,
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('GitHub Token')
    })
  })

  describe('clean code', () => {
    test('passes clean TypeScript code', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/service.ts',
          content: `
            import { config } from './config'

            export function getDbUrl(): string {
              return process.env.DATABASE_URL ?? 'localhost'
            }
          `,
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(0)
      expect(stderr).toBe('')
    })

    test('passes environment variable usage', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/config.ts',
          content: `
            const password = process.env.DB_PASSWORD
            const apiKey = Bun.env.API_KEY
          `,
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(0)
      expect(stderr).toBe('')
    })
  })

  describe('Edit tool', () => {
    test('validates Edit tool same as Write', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Edit',
        tool_input: {
          file_path: 'src/config.ts',
          content: `const key = "${FAKE_AWS_KEY}"`,
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('AWS Access Key')
    })
  })
})
