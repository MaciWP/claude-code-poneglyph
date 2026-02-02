#!/usr/bin/env bun

/**
 * TypeScript Import Validator for PostToolUse hooks.
 * Validates that relative imports in TypeScript files resolve to existing files.
 */

import * as path from 'path'
import { EXIT_CODES, readStdin, reportError, isTypeScriptFile } from '../config'

/**
 * Extensions to try when resolving import paths.
 * Covers TypeScript files, JavaScript files, and index files.
 */
const EXTENSIONS = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js']

/**
 * Regex pattern to extract import specifiers from TypeScript code.
 * Matches: import ... from 'specifier' or import ... from "specifier"
 */
const IMPORT_REGEX = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g

/**
 * Checks if an import specifier is a relative import.
 *
 * @param specifier - The import path to check
 * @returns True if the import starts with . or ..
 */
function isRelativeImport(specifier: string): boolean {
  return specifier.startsWith('.')
}

/**
 * Checks if a file exists at the given path using Bun.file().
 *
 * @param filePath - Absolute path to check
 * @returns True if the file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  const file = Bun.file(filePath)
  return file.exists()
}

/**
 * Attempts to resolve a relative import to an existing file.
 * Tries multiple extensions to find a match.
 *
 * @param baseDir - Directory containing the importing file
 * @param importSpecifier - The relative import path
 * @returns The resolved path if found, null otherwise
 */
async function resolveImport(
  baseDir: string,
  importSpecifier: string
): Promise<string | null> {
  const basePath = path.resolve(baseDir, importSpecifier)

  for (const ext of EXTENSIONS) {
    const fullPath = basePath + ext
    if (await fileExists(fullPath)) {
      return fullPath
    }
  }

  return null
}

/**
 * Extracts all import specifiers from TypeScript content.
 *
 * @param content - TypeScript file content
 * @returns Array of import specifiers found
 */
function extractImports(content: string): string[] {
  const imports: string[] = []
  let match: RegExpExecArray | null

  while ((match = IMPORT_REGEX.exec(content)) !== null) {
    imports.push(match[1])
  }

  return imports
}

async function main(): Promise<void> {
  const input = await readStdin()

  const filePath = input.tool_input.file_path
  if (!filePath) {
    process.exit(EXIT_CODES.PASS)
  }

  if (!isTypeScriptFile(filePath)) {
    process.exit(EXIT_CODES.PASS)
  }

  // Get content from tool_input or read from file
  let content: string
  if (input.tool_input.content) {
    content = input.tool_input.content
  } else {
    try {
      const file = Bun.file(filePath)
      content = await file.text()
    } catch {
      // File doesn't exist yet or can't be read, skip validation
      process.exit(EXIT_CODES.PASS)
    }
  }

  const imports = extractImports(content)
  const baseDir = path.dirname(filePath)
  const unresolvedImports: string[] = []

  for (const importSpecifier of imports) {
    if (!isRelativeImport(importSpecifier)) {
      continue
    }

    const resolved = await resolveImport(baseDir, importSpecifier)
    if (!resolved) {
      unresolvedImports.push(importSpecifier)
    }
  }

  if (unresolvedImports.length > 0) {
    const importList = unresolvedImports.map((i) => `  - ${i}`).join('\n')
    reportError(
      `Unresolved relative imports in ${filePath}:\n${importList}\n\nEnsure the imported files exist or fix the import paths.`
    )
  }

  process.exit(EXIT_CODES.PASS)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error'
  reportError(`Validator failed: ${message}`)
})
