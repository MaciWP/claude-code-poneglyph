import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { join } from 'path'

const VALIDATOR_PATH = join(import.meta.dir, 'syntax-validator.ts')

interface TestInput {
  tool_name: string
  tool_input: {
    file_path?: string
    content?: string
  }
  tool_output: string
}

async function runValidator(input: TestInput): Promise<{ exitCode: number; stderr: string }> {
  const inputJson = JSON.stringify(input)

  const proc = Bun.spawn(['bun', VALIDATOR_PATH], {
    stdin: new Blob([inputJson]),
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const exitCode = await proc.exited
  const stderr = await new Response(proc.stderr).text()

  return { exitCode, stderr }
}

describe('syntax-validator', () => {
  const tempDir = join(import.meta.dir, '__test_temp__')
  const validTsFile = join(tempDir, 'valid.ts')
  const invalidTsFile = join(tempDir, 'invalid.ts')
  const jsFile = join(tempDir, 'test.js')

  beforeAll(async () => {
    await Bun.$`mkdir -p ${tempDir}`.quiet()

    await Bun.write(validTsFile, `
export function add(a: number, b: number): number {
  return a + b
}
`)

    await Bun.write(invalidTsFile, `export const x: string = 123
console.log(x`)

    await Bun.write(jsFile, `
export function add(a, b) {
  return a + b
}
`)
  })

  afterAll(async () => {
    await Bun.$`rm -rf ${tempDir}`.quiet()
  })

  test('passes for non-TypeScript files', async () => {
    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: jsFile,
        content: 'console.log("hello")',
      },
      tool_output: 'File written',
    })

    expect(result.exitCode).toBe(0)
  })

  test('passes when file_path is not provided', async () => {
    const result = await runValidator({
      tool_name: 'Bash',
      tool_input: {
        command: 'echo hello',
      },
      tool_output: 'hello',
    })

    expect(result.exitCode).toBe(0)
  })

  test('passes for valid TypeScript file', async () => {
    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: validTsFile,
        content: 'export const x = 1',
      },
      tool_output: 'File written',
    })

    expect(result.exitCode).toBe(0)
  })

  test('blocks for TypeScript file with syntax errors', async () => {
    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: invalidTsFile,
      },
      tool_output: 'File written',
    })

    expect(result.exitCode).toBe(2)
    expect(result.stderr).toContain('TypeScript syntax error')
  })

  test('handles .tsx files', async () => {
    const tsxFile = join(tempDir, 'component.tsx')
    await Bun.write(tsxFile, `
export function Component(): JSX.Element {
  return <div>Hello</div>
}
`)

    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: tsxFile,
      },
      tool_output: 'File written',
    })

    // May pass or fail depending on JSX config, but should not crash
    expect([0, 2]).toContain(result.exitCode)
  })
})
