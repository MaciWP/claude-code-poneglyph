#!/usr/bin/env bun

/**
 * Secrets Validator - PostToolUse Hook
 *
 * Detects hardcoded secrets, API keys, and credentials in code files.
 * All detected patterns block the operation (high severity).
 */

import { readStdin, reportError, isCodeFile, EXIT_CODES } from "../config";

// =============================================================================
// Secret Patterns
// =============================================================================

interface SecretPattern {
  name: string;
  pattern: RegExp;
}

const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: "AWS Access Key",
    pattern: /AKIA[0-9A-Z]{16}/g,
  },
  {
    name: "Private Key",
    pattern: /-----BEGIN.*PRIVATE KEY-----/g,
  },
  {
    name: "JWT Token",
    pattern: /eyJ[a-zA-Z0-9_-]+\.eyJ/g,
  },
  {
    name: "Hardcoded Secret",
    pattern: /(password|secret|api_key|token)\s*[:=]\s*['"][^'"]{8,}/gi,
  },
  {
    name: "MongoDB Connection String",
    pattern: /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/g,
  },
  {
    name: "PostgreSQL Connection String",
    pattern: /postgres:\/\/[^:]+:[^@]+@/g,
  },
  {
    name: "API Key (Stripe/OpenAI)",
    pattern: /(sk-|pk_live_|sk_live_)[a-zA-Z0-9]{20,}/g,
  },
  {
    name: "GitHub Token",
    pattern: /ghp_[a-zA-Z0-9]{36}/g,
  },
];

// =============================================================================
// Path Ignore Patterns
// =============================================================================

const IGNORE_PATH_PATTERNS = [
  "test",
  "spec",
  "mock",
  "fixture",
  "node_modules",
  ".env.example",
];

// =============================================================================
// Detection Logic
// =============================================================================

interface SecretFinding {
  patternName: string;
  match: string;
}

/**
 * Checks if a file path should be ignored for secrets scanning.
 */
function shouldIgnorePath(path: string): boolean {
  const normalizedPath = path.toLowerCase().replace(/\\/g, "/");
  return IGNORE_PATH_PATTERNS.some((pattern) =>
    normalizedPath.includes(pattern),
  );
}

/**
 * Scans content for hardcoded secrets.
 */
function detectSecrets(content: string): SecretFinding[] {
  const findings: SecretFinding[] = [];

  for (const { name, pattern } of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = content.match(pattern);

    if (matches) {
      for (const match of matches) {
        const displayMatch =
          match.length > 60 ? `${match.slice(0, 60)}...` : match;
        findings.push({ patternName: name, match: displayMatch });
      }
    }
  }

  return findings;
}

/**
 * Formats findings into a human-readable error message.
 */
function formatFindings(findings: SecretFinding[], filePath: string): string {
  const lines = [
    `SECURITY: Hardcoded secrets detected in ${filePath}`,
    "",
    "BLOCKED (all secrets are high severity):",
  ];

  for (const { patternName, match } of findings) {
    lines.push(`  - ${patternName}: ${match}`);
  }

  lines.push("");
  lines.push("Recommendations:");
  lines.push("  - Use environment variables for secrets");
  lines.push("  - Use a secrets manager (Vault, AWS Secrets Manager)");
  lines.push("  - Never commit credentials to version control");

  return lines.join("\n");
}

// =============================================================================
// Main Execution
// =============================================================================

async function main(): Promise<void> {
  try {
    const input = await readStdin();

    // Only validate Write and Edit tools
    if (input.tool_name !== "Write" && input.tool_name !== "Edit") {
      process.exit(EXIT_CODES.PASS);
    }

    const filePath = input.tool_input.file_path;
    if (!filePath) {
      process.exit(EXIT_CODES.PASS);
    }

    // Skip non-code files
    if (!isCodeFile(filePath)) {
      process.exit(EXIT_CODES.PASS);
    }

    // Skip test/mock/fixture files
    if (shouldIgnorePath(filePath)) {
      process.exit(EXIT_CODES.PASS);
    }

    // Get content from tool_input or read from file
    let content = input.tool_input.content;

    if (!content) {
      const file = Bun.file(filePath);
      if (await file.exists()) {
        content = await file.text();
      } else {
        process.exit(EXIT_CODES.PASS);
      }
    }

    // Scan for secrets
    const findings = detectSecrets(content);

    if (findings.length === 0) {
      process.exit(EXIT_CODES.PASS);
    }

    // All secrets are high severity — block
    reportError(formatFindings(findings, filePath));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    reportError(`secrets-validator failed: ${message}`);
  }
}

main();
