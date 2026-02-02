#!/usr/bin/env bun

/**
 * Secrets Validator - PostToolUse Hook
 *
 * Detects hardcoded secrets in code files to prevent accidental commits.
 * Scans for AWS keys, GitHub tokens, API keys, private keys, JWTs, and passwords.
 */

import { readStdin, reportError, isCodeFile, EXIT_CODES } from '../config'

// =============================================================================
// Secret Patterns
// =============================================================================

interface SecretPattern {
  name: string
  pattern: RegExp
}

const SECRET_PATTERNS: SecretPattern[] = [
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g },
  { name: 'AWS Secret Key', pattern: /[A-Za-z0-9/+=]{40}/g },
  { name: 'GitHub Token', pattern: /gh[ps]_[A-Za-z0-9]{36,}/g },
  {
    name: 'Generic API Key',
    pattern: /api[_-]?key['":\s]*[=:]\s*['"][A-Za-z0-9]{20,}['"]/gi,
  },
  {
    name: 'Private Key',
    pattern: /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/g,
  },
  {
    name: 'JWT Token',
    pattern: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*/g,
  },
  { name: 'Password Assignment', pattern: /password\s*[=:]\s*['"][^'"]{8,}['"]/gi },
]

// =============================================================================
// Path Ignore Patterns
// =============================================================================

const IGNORE_PATH_PATTERNS = [
  'test',
  'spec',
  'mock',
  'fixture',
  'node_modules',
]

// =============================================================================
// Detection Logic
// =============================================================================

interface SecretFinding {
  patternName: string
  match: string
}

/**
 * Checks if a file path should be ignored for secrets scanning.
 *
 * @param path - File path to check
 * @returns True if path contains any ignore patterns
 */
function shouldIgnorePath(path: string): boolean {
  const normalizedPath = path.toLowerCase().replace(/\\\\/g, '/')
  return IGNORE_PATH_PATTERNS.some((pattern) => normalizedPath.includes(pattern))
}

/**
 * Scans content for hardcoded secrets.
 *
 * @param content - File content to scan
 * @returns Array of findings with pattern name and matched text
 */
function detectSecrets(content: string): SecretFinding[] {
  const findings: SecretFinding[] = []

  for (const { name, pattern } of SECRET_PATTERNS) {
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0
    const matches = content.match(pattern)

    if (matches) {
      for (const match of matches) {
        // Truncate long matches for readability
        const displayMatch = match.length > 50 ? `${match.slice(0, 50)}...` : match
        findings.push({ patternName: name, match: displayMatch })
      }
    }
  }

  return findings
}

/**
 * Formats findings into a human-readable error message.
 *
 * @param findings - Array of secret findings
 * @param filePath - Path of the file containing secrets
 * @returns Formatted error message
 */
function formatFindings(findings: SecretFinding[], filePath: string): string {
  const lines = [
    `SECURITY: Potential secrets detected in ${filePath}`,
    '',
    'Findings:',
  ]

  for (const { patternName, match } of findings) {
    lines.push(`  - ${patternName}: ${match}`)
  }

  lines.push('')
  lines.push('Please remove hardcoded secrets and use environment variables instead.')

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

    // Scan for secrets
    const findings = detectSecrets(content)

    if (findings.length > 0) {
      reportError(formatFindings(findings, filePath))
    }

    process.exit(EXIT_CODES.PASS)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    reportError(`secrets-validator failed: ${message}`)
  }
}

main()
