import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { join } from 'path'

const VALIDATOR_PATH = join(import.meta.dir, 'import-validator.ts')

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

describe('import-validator', () => {
  const tempDir = join(import.meta.dir, '__test_temp_imports__')
  const mainFile = join(tempDir, 'main.ts')
  const utilsFile = join(tempDir, 'utils.ts')
  const subDir = join(tempDir, 'sub')
  const indexFile = join(subDir, 'index.ts')
  const jsFile = join(tempDir, 'test.js')

  beforeAll(async () => {
    await Bun.$`mkdir -p ${subDir}`.quiet()

    // Create utils.ts that can be imported
    await Bun.write(utilsFile, `
export function add(a: number, b: number): number {
  return a + b
}
`)

    // Create sub/index.ts for folder import testing
    await Bun.write(indexFile, `
export const VERSION = '1.0.0'
`)

    // Create main.ts with valid imports
    await Bun.write(mainFile, `
import { add } from './utils'
import { VERSION } from './sub'

console.log(add(1, 2), VERSION)
`)

    // Create a JS file for non-TS test
    await Bun.write(jsFile, `
import { add } from './utils'
console.log(add(1, 2))
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
        content: 'import { x } from "./missing"',
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

  test('passes for TypeScript file with valid relative imports', async () => {
    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: mainFile,
        content: `import { add } from './utils'\nconsole.log(add(1, 2))`,
      },
      tool_output: 'File written',
    })

    expect(result.exitCode).toBe(0)
  })

  test('passes for TypeScript file with valid folder import (index.ts)', async () => {
    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: mainFile,
        content: `import { VERSION } from './sub'\nconsole.log(VERSION)`,
      },
      tool_output: 'File written',
    })

    expect(result.exitCode).toBe(0)
  })

  test('passes for TypeScript file with node_modules import', async () => {
    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: mainFile,
        content: `import { describe, test } from 'bun:test'\nconsole.log(describe)`,
      },
      tool_output: 'File written',
    })

    expect(result.exitCode).toBe(0)
  })

  test('blocks for TypeScript file with unresolved relative import', async () => {
    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: mainFile,
        content: `import { missing } from './nonexistent'\nconsole.log(missing)`,
      },
      tool_output: 'File written',
    })

    expect(result.exitCode).toBe(2)
    expect(result.stderr).toContain('Unresolved relative imports')
    expect(result.stderr).toContain('./nonexistent')
  })

  test('blocks for multiple unresolved imports', async () => {
    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: mainFile,
        content: `import { a } from './missing1'\nimport { b } from './missing2'\nconsole.log(a, b)`,
      },
      tool_output: 'File written',
    })

    expect(result.exitCode).toBe(2)
    expect(result.stderr).toContain('./missing1')
    expect(result.stderr).toContain('./missing2')
  })

  test('passes for TypeScript file with no imports', async () => {
    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: mainFile,
        content: `const x = 1\nconsole.log(x)`,
      },
      tool_output: 'File written',
    })

    expect(result.exitCode).toBe(0)
  })

  test('handles .tsx files', async () => {
    const tsxFile = join(tempDir, 'component.tsx')
    await Bun.write(tsxFile, `
import { add } from './utils'
export function Component() {
  return <div>{add(1, 2)}</div>
}
`)

    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: tsxFile,
        content: `import { add } from './utils'\nexport const x = add(1, 2)`,
      },
      tool_output: 'File written',
    })

    expect(result.exitCode).toBe(0)
  })

  test('handles parent directory imports (..)', async () => {
    const nestedFile = join(subDir, 'nested.ts')

    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: nestedFile,
        content: `import { add } from '../utils'\nconsole.log(add(1, 2))`,
      },
      tool_output: 'File written',
    })

    expect(result.exitCode).toBe(0)
  })

  test('reads from file when content not provided', async () => {
    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: mainFile,
      },
      tool_output: 'File written',
    })

    // mainFile has valid imports from beforeAll
    expect(result.exitCode).toBe(0)
  })
})
