import { describe, test, expect } from 'bun:test'
import {
  EXIT_CODES,
  isTypeScriptFile,
  isJsonFile,
  isJavaScriptFile,
  isCodeFile,
  getExtension,
  normalizePath,
  type HookInput,
  type ExitCode,
} from './config'

describe('EXIT_CODES', () => {
  test('PASS is 0', () => {
    expect(EXIT_CODES.PASS).toBe(0)
  })

  test('BLOCK is 2', () => {
    expect(EXIT_CODES.BLOCK).toBe(2)
  })
})

describe('isTypeScriptFile', () => {
  test('returns true for .ts files', () => {
    expect(isTypeScriptFile('file.ts')).toBe(true)
    expect(isTypeScriptFile('path/to/file.ts')).toBe(true)
    expect(isTypeScriptFile('FILE.TS')).toBe(true)
  })

  test('returns true for .tsx files', () => {
    expect(isTypeScriptFile('component.tsx')).toBe(true)
    expect(isTypeScriptFile('Component.TSX')).toBe(true)
  })

  test('returns false for non-TypeScript files', () => {
    expect(isTypeScriptFile('file.js')).toBe(false)
    expect(isTypeScriptFile('file.json')).toBe(false)
    expect(isTypeScriptFile('file.txt')).toBe(false)
    expect(isTypeScriptFile('typescript')).toBe(false)
  })
})

describe('isJsonFile', () => {
  test('returns true for .json files', () => {
    expect(isJsonFile('config.json')).toBe(true)
    expect(isJsonFile('path/to/data.JSON')).toBe(true)
  })

  test('returns false for non-JSON files', () => {
    expect(isJsonFile('file.ts')).toBe(false)
    expect(isJsonFile('file.jsonl')).toBe(false)
    expect(isJsonFile('json')).toBe(false)
  })
})

describe('isJavaScriptFile', () => {
  test('returns true for .js files', () => {
    expect(isJavaScriptFile('file.js')).toBe(true)
    expect(isJavaScriptFile('FILE.JS')).toBe(true)
  })

  test('returns true for .jsx files', () => {
    expect(isJavaScriptFile('component.jsx')).toBe(true)
  })

  test('returns false for non-JavaScript files', () => {
    expect(isJavaScriptFile('file.ts')).toBe(false)
    expect(isJavaScriptFile('file.json')).toBe(false)
  })
})

describe('isCodeFile', () => {
  test('returns true for TypeScript and JavaScript files', () => {
    expect(isCodeFile('file.ts')).toBe(true)
    expect(isCodeFile('file.tsx')).toBe(true)
    expect(isCodeFile('file.js')).toBe(true)
    expect(isCodeFile('file.jsx')).toBe(true)
  })

  test('returns false for non-code files', () => {
    expect(isCodeFile('file.json')).toBe(false)
    expect(isCodeFile('file.md')).toBe(false)
    expect(isCodeFile('file.css')).toBe(false)
  })
})

describe('getExtension', () => {
  test('returns extension without dot', () => {
    expect(getExtension('file.ts')).toBe('ts')
    expect(getExtension('file.test.ts')).toBe('ts')
    expect(getExtension('FILE.JSON')).toBe('json')
  })

  test('returns empty string for files without extension', () => {
    expect(getExtension('Makefile')).toBe('')
    expect(getExtension('README')).toBe('')
  })

  test('returns empty string for files ending with dot', () => {
    expect(getExtension('file.')).toBe('')
  })
})

describe('normalizePath', () => {
  test('converts backslashes to forward slashes', () => {
    expect(normalizePath('path\\to\\file.ts')).toBe('path/to/file.ts')
    expect(normalizePath('C:\\Users\\test\\file.ts')).toBe('c:/users/test/file.ts')
  })

  test('lowercases the path', () => {
    expect(normalizePath('Path/To/File.TS')).toBe('path/to/file.ts')
  })

  test('handles mixed slashes', () => {
    expect(normalizePath('path/to\\file.ts')).toBe('path/to/file.ts')
  })
})

describe('HookInput type', () => {
  test('can create valid HookInput object', () => {
    const input: HookInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/path/to/file.ts',
        content: 'const x = 1;',
      },
      tool_output: 'File written successfully',
    }

    expect(input.tool_name).toBe('Write')
    expect(input.tool_input.file_path).toBe('/path/to/file.ts')
  })

  test('tool_input fields are optional', () => {
    const input: HookInput = {
      tool_name: 'Bash',
      tool_input: {
        command: 'ls -la',
      },
      tool_output: 'total 0',
    }

    expect(input.tool_input.file_path).toBeUndefined()
    expect(input.tool_input.content).toBeUndefined()
    expect(input.tool_input.command).toBe('ls -la')
  })
})

describe('ExitCode type', () => {
  test('accepts valid exit codes', () => {
    const pass: ExitCode = 0
    const block: ExitCode = 2

    expect(pass).toBe(EXIT_CODES.PASS)
    expect(block).toBe(EXIT_CODES.BLOCK)
  })
})
