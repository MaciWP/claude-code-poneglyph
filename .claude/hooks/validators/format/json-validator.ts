#!/usr/bin/env bun

/**
 * JSON Format Validator for PostToolUse hooks.
 * Validates JSON syntax in files written by Claude Code.
 *
 * Exit codes:
 *   0 - Validation passed (or file is not JSON)
 *   2 - JSON syntax error detected
 */

import { readStdin, reportError, isJsonFile, EXIT_CODES } from '../config'

async function main(): Promise<void> {
  const input = await readStdin()
  const filePath = input.tool_input.file_path

  // Skip if no file path provided
  if (!filePath) {
    process.exit(EXIT_CODES.PASS)
  }

  // Skip if not a JSON file
  if (!isJsonFile(filePath)) {
    process.exit(EXIT_CODES.PASS)
  }

  // Determine content source: from tool_input.content or read from file
  let content: string

  if (input.tool_input.content !== undefined) {
    content = input.tool_input.content
  } else {
    try {
      const file = Bun.file(filePath)
      if (!(await file.exists())) {
        // File doesn't exist yet, nothing to validate
        process.exit(EXIT_CODES.PASS)
      }
      content = await file.text()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      reportError(`Failed to read ${filePath}: ${message}`)
    }
  }

  // Validate JSON syntax
  try {
    JSON.parse(content)
    process.exit(EXIT_CODES.PASS)
  } catch (error) {
    const message = error instanceof SyntaxError ? error.message : 'Invalid JSON'
    reportError(`JSON syntax error in ${filePath}: ${message}`)
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown error'
  reportError(`Validator error: ${message}`)
})
