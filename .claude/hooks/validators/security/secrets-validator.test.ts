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
}> {
  const proc = Bun.spawn(['bun', 'run', VALIDATOR_PATH], {
    stdin: new Blob([JSON.stringify(input)]),
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const exitCode = await proc.exited
  const stderr = await new Response(proc.stderr).text()

  return { exitCode, stderr }
}

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
          content: 'const apiKey = "sk_test_12345678901234567890"',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(0)
    })

    test('ignores node_modules', async () => {
      const { exitCode } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'node_modules/some-package/index.ts',
          content: 'const secret = "AKIAIOSFODNN7EXAMPLE"',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(0)
    })
  })

  describe('AWS key detection', () => {
    test('detects AWS Access Key', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/config.ts',
          content: 'const AWS_KEY = "AKIAIOSFODNN7EXAMPLE"',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('AWS Access Key')
      expect(stderr).toContain('AKIAIOSFODNN7EXAMPLE')
    })
  })

  describe('GitHub token detection', () => {
    test('detects GitHub personal access token (ghp_)', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/api.ts',
          content: 'const token = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij"',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('GitHub Token')
    })
  })

  describe('Private key detection', () => {
    test('detects RSA private key', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/keys.ts',
          content: 'const key = "-----BEGIN RSA PRIVATE KEY-----"',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('Private Key')
    })
  })

  describe('JWT detection', () => {
    test('detects JWT token', async () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/auth.ts',
          content: 'const token = "' + jwt + '"',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('JWT Token')
    })
  })

  describe('Password detection', () => {
    test('detects password assignment', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/db.ts',
          content: 'const password = "supersecret123"',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('Password Assignment')
    })

    test('passes for short passwords (under 8 chars)', async () => {
      const { exitCode } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/config.ts',
          content: 'const password = "short"',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(0)
    })
  })

  describe('clean code', () => {
    test('passes for clean TypeScript code', async () => {
      const { exitCode } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/service.ts',
          content: 'export function getApiKey(): string { return process.env.API_KEY ?? "" }',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(0)
    })
  })

  describe('Edit tool', () => {
    test('validates Edit tool same as Write', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Edit',
        tool_input: {
          file_path: 'src/config.ts',
          content: 'const secret = "AKIAIOSFODNN7EXAMPLE"',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('AWS Access Key')
    })
  })
})
