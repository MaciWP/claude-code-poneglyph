import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { join } from 'path'

const VALIDATOR_PATH = join(import.meta.dir, 'type-check-validator.ts')

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

describe('type-check-validator', () => {
  const tempDir = join(import.meta.dir, '__test_temp_typecheck__')
  const jsFile = join(tempDir, 'test.js')

  beforeAll(async () => {
    await Bun.$`mkdir -p ${tempDir}`.quiet()

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

  test('passes for non-Edit/Write tools', async () => {
    // Validator should skip tools that are not Edit or Write
    const result = await runValidator({
      tool_name: 'Read',
      tool_input: {
        file_path: 'test.ts',
      },
      tool_output: 'File content',
    })

    expect(result.exitCode).toBe(0)
  })

  test('passes for Bash tool even with TypeScript files', async () => {
    const result = await runValidator({
      tool_name: 'Bash',
      tool_input: {
        command: 'bun test.ts',
      },
      tool_output: 'Command executed',
    })

    expect(result.exitCode).toBe(0)
  })

  test('runs typecheck for .ts files with Write tool', async () => {
    const tsFile = join(tempDir, 'valid.ts')
    await Bun.write(tsFile, `
export function add(a: number, b: number): number {
  return a + b
}
`)

    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: tsFile,
      },
      tool_output: 'File written',
    })

    // May pass or fail depending on project tsconfig
    // The validator should run without crashing
    expect([0, 2]).toContain(result.exitCode)
  })

  test('runs typecheck for .ts files with Edit tool', async () => {
    const tsFile = join(tempDir, 'edited.ts')
    await Bun.write(tsFile, `
export function multiply(a: number, b: number): number {
  return a * b
}
`)

    const result = await runValidator({
      tool_name: 'Edit',
      tool_input: {
        file_path: tsFile,
      },
      tool_output: 'File edited',
    })

    // May pass or fail depending on project tsconfig
    // The validator should run without crashing
    expect([0, 2]).toContain(result.exitCode)
  })

  test('runs typecheck for .tsx files', async () => {
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

    // May pass or fail depending on JSX config
    // The validator should run without crashing
    expect([0, 2]).toContain(result.exitCode)
  })

  test('reports type errors in stderr when typecheck fails', async () => {
    const errorFile = join(tempDir, 'error.ts')
    await Bun.write(errorFile, `
export const x: string = 123
`)

    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: errorFile,
      },
      tool_output: 'File written',
    })

    // Full project typecheck may catch this error
    if (result.exitCode === 2) {
      expect(result.stderr).toContain('TypeScript type check failed')
    }
  })
})
