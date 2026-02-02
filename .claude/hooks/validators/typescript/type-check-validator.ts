#!/usr/bin/env bun

/**
 * TypeScript Type Check Validator for PostToolUse hooks.
 * Runs full project type checking after Edit or Write operations on TypeScript files.
 *
 * - Only runs for Edit or Write tools
 * - Only runs for .ts or .tsx files
 * - Runs project-wide tsc --noEmit
 * - Timeout: 60 seconds
 */

import { EXIT_CODES, readStdin, reportError, isTypeScriptFile } from '../config'

const TYPE_CHECK_TIMEOUT_MS = 60000

async function main(): Promise<void> {
  const input = await readStdin()

  // Only run for Edit or Write tools
  if (input.tool_name !== 'Edit' && input.tool_name !== 'Write') {
    process.exit(EXIT_CODES.PASS)
  }

  const filePath = input.tool_input.file_path

  // Only run for TypeScript files
  if (!filePath || !isTypeScriptFile(filePath)) {
    process.exit(EXIT_CODES.PASS)
  }

  // Run full project type check with bunx
  const proc = Bun.spawn(['bunx', 'tsc', '--noEmit', '--pretty', 'false'], {
    cwd: process.cwd(),
    stdout: 'pipe',
    stderr: 'pipe',
  })

  // Set up timeout
  const timeoutId = setTimeout(() => {
    proc.kill()
  }, TYPE_CHECK_TIMEOUT_MS)

  try {
    const exitCode = await proc.exited
    clearTimeout(timeoutId)

    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()
    const output = stdout || stderr

    if (exitCode !== 0) {
      reportError(`TypeScript type check failed:\n${output}`)
    }

    process.exit(EXIT_CODES.PASS)
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error'
  reportError(`Type check validator failed: ${message}`)
})
