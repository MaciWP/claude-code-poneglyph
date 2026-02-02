import { describe, test, expect } from 'bun:test'
import { join } from 'path'

const VALIDATOR_PATH = join(import.meta.dir, 'json-validator.ts')

interface TestInput {
  tool_name: string
  tool_input: {
    file_path?: string
    content?: string
  }
  tool_output: string
}

async function runValidator(input: TestInput): Promise<{ exitCode: number; stderr: string }> {
  const proc = Bun.spawn(['bun', 'run', VALIDATOR_PATH], {
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  })

  // Write to stdin using Bun's FileSink API
  proc.stdin.write(JSON.stringify(input))
  proc.stdin.end()

  const exitCode = await proc.exited
  const stderr = await new Response(proc.stderr).text()

  return { exitCode, stderr }
}

describe('json-validator', () => {
  describe('non-JSON files', () => {
    test('passes for TypeScript files', async () => {
      const result = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/index.ts',
          content: 'const x = 1;',
        },
        tool_output: 'ok',
      })

      expect(result.exitCode).toBe(0)
    })

    test('passes for JavaScript files', async () => {
      const result = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'script.js',
          content: 'console.log("hello");',
        },
        tool_output: 'ok',
      })

      expect(result.exitCode).toBe(0)
    })

    test('passes when no file_path provided', async () => {
      const result = await runValidator({
        tool_name: 'Bash',
        tool_input: {},
        tool_output: 'ok',
      })

      expect(result.exitCode).toBe(0)
    })
  })

  describe('valid JSON files', () => {
    test('passes for valid JSON object', async () => {
      const result = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'config.json',
          content: '{"name": "test", "version": "1.0.0"}',
        },
        tool_output: 'ok',
      })

      expect(result.exitCode).toBe(0)
    })

    test('passes for valid JSON array', async () => {
      const result = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'data.json',
          content: '[1, 2, 3, "four"]',
        },
        tool_output: 'ok',
      })

      expect(result.exitCode).toBe(0)
    })

    test('passes for valid JSON with nested structures', async () => {
      const result = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'complex.json',
          content: JSON.stringify({
            users: [
              { id: 1, name: 'Alice' },
              { id: 2, name: 'Bob' },
            ],
            settings: {
              theme: 'dark',
              notifications: true,
            },
          }),
        },
        tool_output: 'ok',
      })

      expect(result.exitCode).toBe(0)
    })

    test('passes for valid JSON primitives', async () => {
      // JSON allows primitives at root level
      const primitives = ['"hello"', '123', 'true', 'false', 'null']

      for (const primitive of primitives) {
        const result = await runValidator({
          tool_name: 'Write',
          tool_input: {
            file_path: 'test.json',
            content: primitive,
          },
          tool_output: 'ok',
        })

        expect(result.exitCode).toBe(0)
      }
    })
  })

  describe('invalid JSON files', () => {
    test('blocks for trailing comma', async () => {
      const result = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'bad.json',
          content: '{"name": "test",}',
        },
        tool_output: 'ok',
      })

      expect(result.exitCode).toBe(2)
      expect(result.stderr).toContain('JSON syntax error')
      expect(result.stderr).toContain('bad.json')
    })

    test('blocks for single quotes', async () => {
      const result = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'invalid.json',
          content: "{'name': 'test'}",
        },
        tool_output: 'ok',
      })

      expect(result.exitCode).toBe(2)
      expect(result.stderr).toContain('JSON syntax error')
    })

    test('blocks for unquoted keys', async () => {
      const result = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'nokeys.json',
          content: '{name: "test"}',
        },
        tool_output: 'ok',
      })

      expect(result.exitCode).toBe(2)
      expect(result.stderr).toContain('JSON syntax error')
    })

    test('blocks for unclosed brace', async () => {
      const result = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'unclosed.json',
          content: '{"name": "test"',
        },
        tool_output: 'ok',
      })

      expect(result.exitCode).toBe(2)
      expect(result.stderr).toContain('JSON syntax error')
    })

    test('blocks for invalid escape sequence', async () => {
      const result = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'escape.json',
          content: '{"path": "C:\\invalid"}',
        },
        tool_output: 'ok',
      })

      expect(result.exitCode).toBe(2)
      expect(result.stderr).toContain('JSON syntax error')
    })

    test('blocks for completely invalid content', async () => {
      const result = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'garbage.json',
          content: 'this is not json at all',
        },
        tool_output: 'ok',
      })

      expect(result.exitCode).toBe(2)
      expect(result.stderr).toContain('JSON syntax error')
    })

    test('blocks for empty content', async () => {
      const result = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'empty.json',
          content: '',
        },
        tool_output: 'ok',
      })

      expect(result.exitCode).toBe(2)
      expect(result.stderr).toContain('JSON syntax error')
    })
  })

  describe('file extension handling', () => {
    test('handles uppercase .JSON extension', async () => {
      const result = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'CONFIG.JSON',
          content: '{"valid": true}',
        },
        tool_output: 'ok',
      })

      expect(result.exitCode).toBe(0)
    })

    test('handles paths with directories', async () => {
      const result = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/config/settings.json',
          content: '{"debug": false}',
        },
        tool_output: 'ok',
      })

      expect(result.exitCode).toBe(0)
    })

    test('ignores .jsonl files', async () => {
      const result = await runValidator({
        tool_name: 'Write',
        tool_input: {
          file_path: 'logs.jsonl',
          content: 'not valid json',
        },
        tool_output: 'ok',
      })

      // .jsonl is NOT .json, so it should pass (ignored)
      expect(result.exitCode).toBe(0)
    })
  })
})
