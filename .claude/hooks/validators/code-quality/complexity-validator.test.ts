import { describe, test, expect } from 'bun:test'
import { join } from 'path'

const VALIDATOR_PATH = join(import.meta.dir, 'complexity-validator.ts')

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

describe('complexity-validator', () => {
  test('passes for non-TypeScript files', async () => {
    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: 'test.js',
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

  test('passes when content is not provided', async () => {
    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: 'test.ts',
      },
      tool_output: 'File written',
    })

    expect(result.exitCode).toBe(0)
  })

  test('passes for simple TypeScript code (low complexity)', async () => {
    const simpleCode = `
function add(a: number, b: number): number {
  return a + b
}

function greet(name: string): string {
  return \`Hello, \${name}!\`
}
`
    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: 'simple.ts',
        content: simpleCode,
      },
      tool_output: 'File written',
    })

    expect(result.exitCode).toBe(0)
  })

  test('passes for moderate complexity code (under threshold)', async () => {
    // This code has complexity around 10-15
    const moderateCode = `
function processData(data: unknown[]): Result {
  if (!data) {
    return { error: 'No data' }
  }

  if (data.length === 0) {
    return { error: 'Empty data' }
  }

  for (const item of data) {
    if (item && typeof item === 'object') {
      const value = item.value ?? 0
      if (value > 100) {
        console.log('High value')
      } else if (value > 50) {
        console.log('Medium value')
      } else {
        console.log('Low value')
      }
    }
  }

  return { success: true }
}
`
    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: 'moderate.ts',
        content: moderateCode,
      },
      tool_output: 'File written',
    })

    expect(result.exitCode).toBe(0)
  })

  test('blocks for high complexity code (over threshold)', async () => {
    // Generate code with complexity > 20
    const highComplexityCode = `
function processComplexData(data: unknown[], options: Options): Result {
  if (!data) { return { error: 'No data' } }
  if (!options) { return { error: 'No options' } }
  if (data.length === 0) { return { error: 'Empty' } }

  for (const item of data) {
    if (item && typeof item === 'object') {
      if ('type' in item) {
        switch (item.type) {
          case 'A':
            if (options.handleA && item.value > 0) {
              console.log('A')
            }
            break
          case 'B':
            if (options.handleB || options.handleAll) {
              console.log('B')
            }
            break
          case 'C':
            if (options.handleC && item.value !== null) {
              console.log('C')
            }
            break
          case 'D':
            console.log('D')
            break
        }
      } else if ('category' in item) {
        const cat = item.category === 'x' ? 1 : item.category === 'y' ? 2 : 3
        while (cat > 0 && item.process) {
          if (cat === 1 || cat === 2) {
            try {
              process(item)
            } catch (e) {
              console.error(e)
            }
          }
        }
      }
    }
  }
  return { success: true }
}
`
    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: 'complex.ts',
        content: highComplexityCode,
      },
      tool_output: 'File written',
    })

    expect(result.exitCode).toBe(2)
    expect(result.stderr).toContain('Cyclomatic complexity')
    expect(result.stderr).toContain('exceeds threshold')
  })

  test('handles .tsx files', async () => {
    const tsxCode = `
function Component({ items }: Props): JSX.Element {
  if (!items) {
    return <div>No items</div>
  }

  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  )
}
`
    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: 'component.tsx',
        content: tsxCode,
      },
      tool_output: 'File written',
    })

    expect(result.exitCode).toBe(0)
  })

  test('counts if statements correctly', async () => {
    // 1 base + 5 if = 6
    const code = `
function test(a: number): string {
  if (a > 100) { return 'huge' }
  if (a > 50) { return 'large' }
  if (a > 25) { return 'medium' }
  if (a > 10) { return 'small' }
  if (a > 0) { return 'tiny' }
  return 'zero'
}
`
    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: 'ifs.ts',
        content: code,
      },
      tool_output: 'File written',
    })

    expect(result.exitCode).toBe(0)
  })

  test('counts logical operators correctly', async () => {
    // 1 base + 2 if + 4 && + 4 || = 11
    const code = `
function validate(a: boolean, b: boolean, c: boolean, d: boolean): boolean {
  if (a && b && c && d) {
    return true
  }
  if (a || b || c || d) {
    return false
  }
  return true
}
`
    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: 'logical.ts',
        content: code,
      },
      tool_output: 'File written',
    })

    expect(result.exitCode).toBe(0)
  })

  test('counts switch/case correctly', async () => {
    // 1 base + 1 switch + 4 case = 6
    const code = `
function getColor(status: string): string {
  switch (status) {
    case 'success':
      return 'green'
    case 'warning':
      return 'yellow'
    case 'error':
      return 'red'
    case 'info':
      return 'blue'
    default:
      return 'gray'
  }
}
`
    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: 'switch.ts',
        content: code,
      },
      tool_output: 'File written',
    })

    expect(result.exitCode).toBe(0)
  })

  test('counts loops correctly', async () => {
    // 1 base + 1 for + 1 while + 1 do = 4
    const code = `
function loops(): void {
  for (let i = 0; i < 10; i++) {
    console.log(i)
  }

  let j = 0
  while (j < 5) {
    console.log(j)
    j++
  }

  let k = 0
  do {
    console.log(k)
    k++
  } while (k < 3)
}
`
    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: 'loops.ts',
        content: code,
      },
      tool_output: 'File written',
    })

    expect(result.exitCode).toBe(0)
  })

  test('counts ternary operators correctly', async () => {
    // 1 base + 2 ternary = 3
    const code = `
function ternary(a: boolean, b: boolean): string {
  const x = a ? 'yes' : 'no'
  const y = b ? 'true' : 'false'
  return x + y
}
`
    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: 'ternary.ts',
        content: code,
      },
      tool_output: 'File written',
    })

    expect(result.exitCode).toBe(0)
  })

  test('counts catch blocks correctly', async () => {
    // 1 base + 2 catch = 3
    const code = `
async function fetchData(): Promise<Data> {
  try {
    const response = await fetch('/api/data')
    return response.json()
  } catch (error) {
    console.error(error)
    try {
      return fallbackData()
    } catch (fallbackError) {
      throw fallbackError
    }
  }
}
`
    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: 'trycatch.ts',
        content: code,
      },
      tool_output: 'File written',
    })

    expect(result.exitCode).toBe(0)
  })

  test('stderr contains refactoring suggestions when blocked', async () => {
    // Generate extremely complex code to ensure it exceeds threshold of 25
    const veryComplexCode = `
function mega(a: number, b: number, c: number): number {
  if (a > 0) { if (b > 0) { if (c > 0) { return 1 } } }
  if (a < 0) { if (b < 0) { if (c < 0) { return -1 } } }
  if (a === 0 || b === 0 || c === 0) { return 0 }
  if (a > 100 || b > 100 || c > 100) { return 999 }
  switch (a) {
    case 1: case 2: case 3: case 4: case 5: case 6: return a
  }
  for (let i = 0; i < 10; i++) { if (i > 5 && i < 8) { console.log(i) } }
  while (a > 0 && b > 0) { a--; b-- }
  const x = a > b ? a : b
  const y = b > c ? b : c
  const z = a > c ? a : c
  try { console.log(x + y) } catch (e) { console.error(e) }
  return a && b && c && (a || b || c) ? 1 : 0
}
`
    const result = await runValidator({
      tool_name: 'Write',
      tool_input: {
        file_path: 'mega.ts',
        content: veryComplexCode,
      },
      tool_output: 'File written',
    })

    expect(result.exitCode).toBe(2)
    expect(result.stderr).toContain('Extracting complex logic')
    expect(result.stderr).toContain('early returns')
    expect(result.stderr).toContain('lookup objects')
  })
})
