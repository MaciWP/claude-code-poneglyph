#!/usr/bin/env bun

/**
 * Lint Validator for PostToolUse hooks.
 * Runs Biome linter on code files and blocks if there are lint errors.
 *
 * Uses `bunx biome check` with `--no-errors-on-unmatched` to gracefully handle
 * files that Biome doesn't recognize or cannot lint.
 */

import { EXIT_CODES, readStdin, reportError, isCodeFile } from '../config'

/**
 * Executes Biome linter on the specified file.
 * Returns the exit code and output from the linter.
 *
 * @param filePath - Absolute path to the file to lint
 * @returns Object containing exitCode and output string
 */
async function runBiomeLint(filePath: string): Promise<{ exitCode: number; output: string }> {
  try {
    const proc = Bun.spawn(['bunx', 'biome', 'check', filePath, '--no-errors-on-unmatched'], {
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ])

    const exitCode = await proc.exited
    const output = stdout + stderr

    return { exitCode, output }
  } catch {
    // Biome not available or spawn failed - pass silently
    return { exitCode: 0, output: '' }
  }
}

/**
 * Main validator entry point.
 * Reads stdin for hook input, runs Biome lint, and exits appropriately.
 */
async function main(): Promise<void> {
  const input = await readStdin()

  const filePath = input.tool_input.file_path
  if (!filePath) {
    process.exit(EXIT_CODES.PASS)
  }

  if (!isCodeFile(filePath)) {
    process.exit(EXIT_CODES.PASS)
  }

  const { exitCode, output } = await runBiomeLint(filePath)

  if (exitCode !== 0) {
    reportError(
      `Biome lint check failed:\n${output}\n` +
        `Fix the lint errors before continuing.`
    )
  }

  process.exit(EXIT_CODES.PASS)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error'
  reportError(`Lint validator failed: ${message}`)
})
