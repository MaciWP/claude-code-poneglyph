#!/usr/bin/env bun

/**
 * Cyclomatic Complexity Validator for PostToolUse hooks.
 * Analyzes TypeScript/TSX files and blocks if complexity exceeds threshold.
 *
 * Complexity is calculated by counting branching constructs:
 * - if, else
 * - for, while
 * - case, catch
 * - && (logical AND), || (logical OR)
 * - ternary operators (? but not optional chaining ?:)
 */

import { EXIT_CODES, readStdin, reportError, isTypeScriptFile } from '../config'

const COMPLEXITY_THRESHOLD = 25

/**
 * Regex patterns for complexity-increasing constructs.
 * Each match adds 1 to the complexity score.
 */
const COMPLEXITY_PATTERNS: RegExp[] = [
  /\bif\s*\(/g,
  /\belse\b/g,
  /\bfor\s*\(/g,
  /\bwhile\s*\(/g,
  /\bcase\s+/g,
  /\bcatch\s*\(/g,
  /&&/g,
  /\|\|/g,
  /\?(?!:)/g, // ternary, not optional chaining
]

/**
 * Calculates the cyclomatic complexity of the given code content.
 * Counts occurrences of branching constructs.
 *
 * @param content - Source code to analyze
 * @returns Complexity score (count of branching constructs)
 */
function calculateComplexity(content: string): number {
  let complexity = 0

  for (const pattern of COMPLEXITY_PATTERNS) {
    const matches = content.match(pattern)
    complexity += matches?.length ?? 0
  }

  return complexity
}

/**
 * Main validator entry point.
 * Reads stdin for hook input, validates complexity, and exits appropriately.
 */
async function main(): Promise<void> {
  const input = await readStdin()

  const filePath = input.tool_input.file_path
  if (!filePath) {
    process.exit(EXIT_CODES.PASS)
  }

  if (!isTypeScriptFile(filePath)) {
    process.exit(EXIT_CODES.PASS)
  }

  const content = input.tool_input.content
  if (!content) {
    process.exit(EXIT_CODES.PASS)
  }

  const complexity = calculateComplexity(content)

  if (complexity > COMPLEXITY_THRESHOLD) {
    reportError(
      `Cyclomatic complexity (${complexity}) exceeds threshold (${COMPLEXITY_THRESHOLD}).\n` +
        `Consider refactoring by:\n` +
        `- Extracting complex logic into smaller functions\n` +
        `- Using early returns to reduce nesting\n` +
        `- Replacing switch statements with lookup objects`
    )
  }

  process.exit(EXIT_CODES.PASS)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error'
  reportError(`Complexity validator failed: ${message}`)
})
