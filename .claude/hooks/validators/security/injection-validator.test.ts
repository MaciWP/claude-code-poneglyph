import { describe, test, expect } from 'bun:test'

/**
 * Tests for injection-validator.ts
 *
 * Tests the PostToolUse hook that detects potential code injection vulnerabilities.
 */

const VALIDATOR_PATH = '.claude/hooks/validators/security/injection-validator.ts'

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
  const proc = Bun.spawn(['bun', 'run', VALIDATOR_PATH], {
    stdin: new Blob([JSON.stringify(input)]),
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const exitCode = await proc.exited
  const stderr = await new Response(proc.stderr).text()
  const stdout = await new Response(proc.stdout).text()

  return { exitCode, stderr, stdout }
}

describe('injection-validator', () => {
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
          content: 'eval("dangerous")',
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
          file_path: 'src/parser.test.ts',
          content: 'eval(code)',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(0)
    })

    test('ignores spec files', async () => {
      const { exitCode } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/parser.spec.ts',
          content: 'eval(code)',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(0)
    })

    test('ignores mock files', async () => {
      const { exitCode } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/__mocks__/util.ts',
          content: 'eval(code)',
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
          content: 'eval("some code")',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(0)
    })
  })

  describe('high severity: eval()', () => {
    test('blocks eval() usage', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/parser.ts',
          content: 'const result = eval(code)',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('eval()')
      expect(stderr).toContain('HIGH SEVERITY')
    })

    test('blocks eval() with whitespace', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/runtime.ts',
          content: 'eval  (userInput)',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('eval()')
    })
  })

  describe('high severity: new Function()', () => {
    test('blocks new Function() usage', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/compiler.ts',
          content: 'const fn = new Function("return " + code)',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('new Function()')
      expect(stderr).toContain('HIGH SEVERITY')
    })

    test('blocks new Function with whitespace', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/util.ts',
          content: 'const fn = new   Function  (body)',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('new Function()')
    })
  })

  describe('high severity: SQL concatenation', () => {
    test('blocks SQL string concatenation with SELECT', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/db.ts',
          content: 'const query = "SELECT * FROM users WHERE id = " + userId',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('SQL concatenation')
      expect(stderr).toContain('HIGH SEVERITY')
    })

    test('blocks SQL string concatenation with INSERT', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/repository.ts',
          content: 'const sql = "INSERT INTO users VALUES(" + values + ")"',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('SQL concatenation')
    })

    test('blocks SQL string concatenation with DELETE', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/cleanup.ts',
          content: '`DELETE FROM logs WHERE id = ` + id',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('SQL concatenation')
    })
  })

  describe('medium severity: exec() with variable', () => {
    test('warns on exec() with variable argument', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/shell.ts',
          content: 'exec(command)',
        },
        tool_output: 'success',
      })

      // Medium severity should not block
      expect(exitCode).toBe(0)
      expect(stderr).toContain('MEDIUM SEVERITY')
      expect(stderr).toContain('exec() with variable')
    })

    test('passes exec() with string literal', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/build.ts',
          content: 'exec("npm install")',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(0)
      expect(stderr).not.toContain('exec')
    })
  })

  describe('medium severity: spawn() with variable', () => {
    test('warns on spawn() with variable argument', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/process.ts',
          content: 'spawn(cmd, args)',
        },
        tool_output: 'success',
      })

      // Medium severity should not block
      expect(exitCode).toBe(0)
      expect(stderr).toContain('MEDIUM SEVERITY')
      expect(stderr).toContain('spawn() with variable')
    })

    test('passes spawn() with string literal', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/worker.ts',
          content: 'spawn("node", ["script.js"])',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(0)
      expect(stderr).not.toContain('spawn')
    })
  })

  describe('medium severity: innerHTML', () => {
    test('warns on innerHTML assignment', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/ui.ts',
          content: 'element.innerHTML = content',
        },
        tool_output: 'success',
      })

      // Medium severity should not block
      expect(exitCode).toBe(0)
      expect(stderr).toContain('innerHTML assignment')
    })
  })

  describe('medium severity: document.write', () => {
    test('warns on document.write()', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/legacy.ts',
          content: 'document.write(html)',
        },
        tool_output: 'success',
      })

      // Medium severity should not block
      expect(exitCode).toBe(0)
      expect(stderr).toContain('document.write')
    })
  })

  describe('mixed severity findings', () => {
    test('blocks when high severity found alongside medium', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/dangerous.ts',
          content: `
            eval(code)
            element.innerHTML = html
          `,
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('HIGH SEVERITY')
      expect(stderr).toContain('MEDIUM SEVERITY')
      expect(stderr).toContain('eval()')
      expect(stderr).toContain('innerHTML assignment')
    })
  })

  describe('clean code', () => {
    test('passes for clean TypeScript code', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/service.ts',
          content: `
            import { db } from './db'

            export async function getUser(id: string) {
              return db.query.users.findFirst({
                where: eq(users.id, id)
              })
            }
          `,
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(0)
      expect(stderr).toBe('')
    })

    test('passes for parameterized SQL queries', async () => {
      const { exitCode, stderr } = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/repository.ts',
          content: `
            const result = await db.execute(
              'SELECT * FROM users WHERE id = ?',
              [userId]
            )
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
          file_path: 'src/runtime.ts',
          content: 'const result = eval(dynamicCode)',
        },
        tool_output: 'success',
      })

      expect(exitCode).toBe(2)
      expect(stderr).toContain('eval()')
    })
  })
})
