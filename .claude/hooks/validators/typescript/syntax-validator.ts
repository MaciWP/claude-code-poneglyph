#!/usr/bin/env bun

/**
 * TypeScript Syntax Validator for PostToolUse hooks.
 * Runs tsc --noEmit to check for syntax errors in TypeScript files.
 */

import { EXIT_CODES, readStdin, reportError, isTypeScriptFile } from '../config'

async function main(): Promise<void> {
  const input = await readStdin()

  const filePath = input.tool_input.file_path
  if (!filePath) {
    process.exit(EXIT_CODES.PASS)
  }

  if (!isTypeScriptFile(filePath)) {
    process.exit(EXIT_CODES.PASS)
  }

  const proc = Bun.spawn(['tsc', '--noEmit', '--pretty', 'false', filePath], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const exitCode = await proc.exited
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const output = stdout || stderr

  if (exitCode !== 0) {
    reportError(`TypeScript syntax error:\n${output}`)
  }

  process.exit(EXIT_CODES.PASS)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error'
  reportError(`Validator failed: ${message}`)
})
