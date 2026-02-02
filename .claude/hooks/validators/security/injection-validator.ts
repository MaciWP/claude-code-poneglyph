#!/usr/bin/env bun

/**
 * Injection Validator - PostToolUse Hook
 *
 * Detects potential code injection vulnerabilities in code files.
 * Scans for eval(), new Function(), dangerous exec/spawn calls,
 * SQL concatenation, innerHTML assignments, and document.write.
 *
 * - High severity patterns block the operation
 * - Medium severity patterns warn but allow the operation
 */

import { readStdin, reportError, isCodeFile, EXIT_CODES } from '../config'

// =============================================================================
// Injection Patterns
// =============================================================================

type Severity = 'high' | 'medium'

interface InjectionPattern {
  name: string
  pattern: RegExp
  severity: Severity
}

const INJECTION_PATTERNS: InjectionPattern[] = [
  { name: 'eval()', pattern: /\beval\s*\(/g, severity: 'high' },
  { name: 'new Function()', pattern: /new\s+Function\s*\(/g, severity: 'high' },
  { name: 'exec() with variable', pattern: /\bexec\s*\(\s*[^'"]/g, severity: 'medium' },
  { name: 'spawn() with variable', pattern: /\bspawn\s*\(\s*[^'"]/g, severity: 'medium' },
  {
    name: 'SQL concatenation',
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE).*['"`]\s*\+\s*\w+|['"`]\s*\+\s*\w+.*(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)/gi,
    severity: 'high',
  },
  { name: 'innerHTML assignment', pattern: /\.innerHTML\s*=/g, severity: 'medium' },
  { name: 'document.write', pattern: /document\.write\s*\(/g, severity: 'medium' },
]

// =============================================================================
// Path Ignore Patterns
// =============================================================================

const IGNORE_PATH_PATTERNS = ['test', 'spec', 'mock', 'fixture', 'node_modules']

// =============================================================================
// Detection Logic
// =============================================================================

interface InjectionFinding {
  patternName: string
  match: string
  severity: Severity
}

/**
 * Checks if a file path should be ignored for injection scanning.
 *
 * @param path - File path to check
 * @returns True if path contains any ignore patterns
 */
function shouldIgnorePath(path: string): boolean {
  const normalizedPath = path.toLowerCase().replace(/\\/g, '/')
  return IGNORE_PATH_PATTERNS.some((pattern) => normalizedPath.includes(pattern))
}

/**
 * Scans content for potential injection vulnerabilities.
 *
 * @param content - File content to scan
 * @returns Array of findings with pattern name, matched text, and severity
 */
function detectInjections(content: string): InjectionFinding[] {
  const findings: InjectionFinding[] = []

  for (const { name, pattern, severity } of INJECTION_PATTERNS) {
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0
    const matches = content.match(pattern)

    if (matches) {
      for (const match of matches) {
        // Truncate long matches for readability
        const displayMatch = match.length > 60 ? `${match.slice(0, 60)}...` : match
        findings.push({ patternName: name, match: displayMatch, severity })
      }
    }
  }

  return findings
}

/**
 * Formats findings into a human-readable error message.
 *
 * @param findings - Array of injection findings
 * @param filePath - Path of the file containing potential vulnerabilities
 * @returns Formatted error message
 */
function formatFindings(findings: InjectionFinding[], filePath: string): string {
  const highFindings = findings.filter((f) => f.severity === 'high')
  const mediumFindings = findings.filter((f) => f.severity === 'medium')

  const lines = [
    `SECURITY: Potential injection vulnerabilities detected in ${filePath}`,
    '',
  ]

  if (highFindings.length > 0) {
    lines.push('HIGH SEVERITY (blocking):')
    for (const { patternName, match } of highFindings) {
      lines.push(`  - ${patternName}: ${match}`)
    }
    lines.push('')
  }

  if (mediumFindings.length > 0) {
    lines.push('MEDIUM SEVERITY (warning):')
    for (const { patternName, match } of mediumFindings) {
      lines.push(`  - ${patternName}: ${match}`)
    }
    lines.push('')
  }

  lines.push('Recommendations:')
  lines.push('  - Avoid eval() and new Function() - use safe alternatives')
  lines.push('  - Use parameterized queries instead of string concatenation for SQL')
  lines.push('  - Use textContent instead of innerHTML for user content')
  lines.push('  - Use literal strings for exec/spawn commands when possible')

  return lines.join('\n')
}

/**
 * Formats warnings for medium severity findings that do not block.
 *
 * @param findings - Array of medium severity findings
 * @param filePath - Path of the file
 * @returns Formatted warning message
 */
function formatWarnings(findings: InjectionFinding[], filePath: string): string {
  const lines = [
    `WARNING: Potential injection risks detected in ${filePath}`,
    '',
    'MEDIUM SEVERITY (not blocking, but review recommended):',
  ]

  for (const { patternName, match } of findings) {
    lines.push(`  - ${patternName}: ${match}`)
  }

  return lines.join('\n')
}

// =============================================================================
// Main Execution
// =============================================================================

async function main(): Promise<void> {
  try {
    const input = await readStdin()

    // Only validate Write and Edit tools
    if (input.tool_name !== 'Write' && input.tool_name !== 'Edit') {
      process.exit(EXIT_CODES.PASS)
    }

    const filePath = input.tool_input.file_path
    if (!filePath) {
      process.exit(EXIT_CODES.PASS)
    }

    // Skip non-code files
    if (!isCodeFile(filePath)) {
      process.exit(EXIT_CODES.PASS)
    }

    // Skip test/mock/fixture files
    if (shouldIgnorePath(filePath)) {
      process.exit(EXIT_CODES.PASS)
    }

    // Get content from tool_input or read from file
    let content = input.tool_input.content

    if (!content) {
      const file = Bun.file(filePath)
      if (await file.exists()) {
        content = await file.text()
      } else {
        // File does not exist, nothing to validate
        process.exit(EXIT_CODES.PASS)
      }
    }

    // Scan for injection vulnerabilities
    const findings = detectInjections(content)

    if (findings.length === 0) {
      process.exit(EXIT_CODES.PASS)
    }

    // Check for high severity findings
    const highFindings = findings.filter((f) => f.severity === 'high')
    const mediumFindings = findings.filter((f) => f.severity === 'medium')

    if (highFindings.length > 0) {
      // High severity: block operation
      reportError(formatFindings(findings, filePath))
    }

    // Medium severity only: warn but do not block
    if (mediumFindings.length > 0) {
      console.warn(formatWarnings(mediumFindings, filePath))
    }

    process.exit(EXIT_CODES.PASS)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    reportError(`injection-validator failed: ${message}`)
  }
}

main()
