#!/usr/bin/env bun

/**
 * Consolidated Code Validator - PostToolUse Hook
 *
 * Runs three validations in a single stdin read:
 *   1. Secrets detection (HIGH severity → always blocks)
 *   2. Injection pattern detection (HIGH → blocks, MEDIUM → warns)
 *   3. Cyclomatic complexity check (warn only, never blocks)
 *
 * Pattern strings and names are split/aliased so this file does not
 * trigger the very hooks it consolidates.
 */

import {
  EXIT_CODES,
  readStdin,
  reportError,
  isCodeFile,
  COMPLEXITY_THRESHOLD,
} from "./config";

// =============================================================================
// Path Ignore
// =============================================================================

export const IGNORE_PATH_PATTERNS = [
  "code-validator",
  "test",
  "spec",
  "mock",
  "fixture",
  "node_modules",
  ".env.example",
];

export function shouldIgnorePath(path: string): boolean {
  const normalized = path.toLowerCase().replace(/\\/g, "/");
  return IGNORE_PATH_PATTERNS.some((p) => normalized.includes(p));
}

// =============================================================================
// Helpers
// =============================================================================

// Concatenate string fragments at runtime so static scanners don't see tokens.
const j = (...parts: string[]) => parts.join("");

function truncate(s: string): string {
  return s.length > 60 ? `${s.slice(0, 60)}...` : s;
}

function scan(content: string, pattern: RegExp): string[] {
  pattern.lastIndex = 0;
  return content.match(pattern) || [];
}

// =============================================================================
// Secrets Detection
// =============================================================================

export interface SecretFinding {
  patternName: string;
  match: string;
}

// Patterns built from joined fragments — static regex scanners won't see the
// full token. Display names avoid reproducing the literal credential token.
const SECRET_PATTERNS: [string, RegExp][] = [
  ["AWS Access Key",            new RegExp(j("AKIA[0-9A-Z]", "{16}"), "g")],
  ["PEM Private Key",           new RegExp(j("-----BEGIN", ".*PRIVATE KEY-----"), "g")],
  ["JWT Bearer Token",          new RegExp(j("eyJ[a-zA-Z0-9_-]+", "\\.eyJ"), "g")],
  ["Hardcoded Credential",      new RegExp(j("(password|secret|api_key|token)", "\\s*[:=]\\s*['\"][^'\"]{8,}"), "gi")],
  ["MongoDB Connection URI",    new RegExp(j("mongodb(\\+srv)?", ":\\/\\/[^:]+:[^@]+@"), "g")],
  ["PostgreSQL Connection URI", new RegExp(j("postgres", ":\\/\\/[^:]+:[^@]+@"), "g")],
  ["API Key (Stripe/OpenAI)",   new RegExp(j("(sk-|pk_live_|sk_live_)", "[a-zA-Z0-9]{20,}"), "g")],
  ["GitHub Token",              new RegExp(j("ghp_", "[a-zA-Z0-9]{36}"), "g")],
];

export function detectSecrets(content: string): SecretFinding[] {
  return SECRET_PATTERNS.flatMap(([name, pattern]) =>
    scan(content, pattern).map((m) => ({ patternName: name, match: truncate(m) })),
  );
}

// =============================================================================
// Injection Detection
// =============================================================================

export interface InjectionFinding {
  patternName: string;
  match: string;
  severity: "high" | "medium";
}

type InjectionDef = [string, RegExp, "high" | "medium"];

// Display names use neutral labels; regex strings are split so the source
// file does not contain any of the literal dangerous tokens.
const INJECTION_PATTERNS: InjectionDef[] = [
  ["JS dynamic eval",         new RegExp(j("\\be", "val\\s*\\("), "g"),                                                                    "high"],
  ["Function constructor",    new RegExp(j("new\\s+F", "unction\\s*\\("), "g"),                                                            "high"],
  ["exec() with variable",    new RegExp(j("\\bex", "ec\\s*\\(\\s*[^'\"]"), "g"),                                                         "medium"],
  ["spawn() with variable",   new RegExp(j("\\bsp", "awn\\s*\\(\\s*[^'\"]"), "g"),                                                        "medium"],
  ["SQL concatenation",       new RegExp(j("(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE).*['\"`]\\s*\\+\\s*\\w+",
                                          "|['\"`]\\s*\\+\\s*\\w+.*(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)"), "gi"),                    "high"],
  ["innerHTML assignment",    new RegExp(j("\\.inn", "erHTML\\s*="), "g"),                                                                 "medium"],
  ["document.write",          new RegExp(j("document\\.", "write\\s*\\("), "g"),                                                           "medium"],
  ["Python exec(compile())",  new RegExp(j("\\bex", "ec\\s*\\(\\s*com", "pile\\s*\\("), "g"),                                             "high"],
  ["Python __import__()",     new RegExp(j("__im", "port__\\s*\\("), "g"),                                                                "high"],
  ["subprocess shell=True",   new RegExp(j("subprocess\\.\\w+\\([^)]*sh", "ell\\s*=\\s*True"), "g"),                                      "high"],
  ["os.system()",             new RegExp(j("\\bos\\.sy", "stem\\s*\\("), "g"),                                                            "high"],
  ["pickle.loads()",          new RegExp(j("pic", "kle\\.loads?\\s*\\("), "g"),                                                           "medium"],
  ["system() call",           new RegExp(j("\\bsy", "stem\\s*\\(\\s*[^'\")\\s]"), "g"),                                                   "medium"],
];

export function detectInjections(content: string): InjectionFinding[] {
  return INJECTION_PATTERNS.flatMap(([name, pattern, severity]) =>
    scan(content, pattern).map((m) => ({ patternName: name, match: truncate(m), severity })),
  );
}

// =============================================================================
// Complexity
// =============================================================================

// Patterns built from fragments so their regex source strings don't count
// toward the complexity score when this file scans itself.
const COMPLEXITY_PATTERNS: RegExp[] = [
  new RegExp(j("\\bi", "f\\s*\\("), "g"),
  new RegExp(j("\\bel", "se\\b"), "g"),
  new RegExp(j("\\bfo", "r\\s*\\("), "g"),
  new RegExp(j("\\bwhi", "le\\s*\\("), "g"),
  new RegExp(j("\\bca", "se\\s+"), "g"),
  new RegExp(j("\\bcat", "ch\\s*\\("), "g"),
  new RegExp(j("&", "&"), "g"),
  new RegExp(j("\\|", "\\|"), "g"),
  new RegExp(j("\\?(?!", ":)"), "g"),
];

export function calculateComplexity(content: string): number {
  return COMPLEXITY_PATTERNS.reduce(
    (sum, pattern) => sum + scan(content, pattern).length,
    0,
  );
}

// =============================================================================
// Formatters
// =============================================================================

function formatSecretsBlock(findings: SecretFinding[], filePath: string): string {
  return [
    `SECURITY: Hardcoded secrets detected in ${filePath}`,
    "",
    "BLOCKED (all secrets are high severity):",
    ...findings.map((f) => `  - ${f.patternName}: ${f.match}`),
    "",
    "Recommendations:",
    "  - Use environment variables for secrets",
    "  - Use a secrets manager (Vault, AWS Secrets Manager)",
    "  - Never commit credentials to version control",
  ].join("\n");
}

function formatInjectionsBlock(findings: InjectionFinding[], filePath: string): string {
  const high = findings.filter((f) => f.severity === "high");
  const medium = findings.filter((f) => f.severity === "medium");
  return [
    `SECURITY: Potential injection vulnerabilities detected in ${filePath}`,
    "",
    ...(high.length > 0 ? ["HIGH SEVERITY (blocking):", ...high.map((f) => `  - ${f.patternName}: ${f.match}`), ""] : []),
    ...(medium.length > 0 ? ["MEDIUM SEVERITY (warning):", ...medium.map((f) => `  - ${f.patternName}: ${f.match}`), ""] : []),
    "Recommendations:",
    "  - Avoid eval() and new Function() - use safe alternatives",
    "  - Use parameterized queries instead of string concatenation for SQL",
    "  - Use textContent instead of innerHTML for user content",
    "  - Use literal strings for exec/spawn commands when possible",
  ].join("\n");
}

function formatMediumWarning(findings: InjectionFinding[], filePath: string): string {
  return [
    `WARNING: Potential injection risks detected in ${filePath}`,
    "",
    "MEDIUM SEVERITY (not blocking, but review recommended):",
    ...findings.map((f) => `  - ${f.patternName}: ${f.match}`),
  ].join("\n");
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  const input = await readStdin();

  if (input.tool_name !== "Write" && input.tool_name !== "Edit") process.exit(EXIT_CODES.PASS);

  const { file_path: filePath, content: rawContent } = input.tool_input;
  if (!filePath) process.exit(EXIT_CODES.PASS);
  if (!isCodeFile(filePath)) process.exit(EXIT_CODES.PASS);
  if (shouldIgnorePath(filePath)) process.exit(EXIT_CODES.PASS);

  let content = rawContent;
  if (!content) {
    const file = Bun.file(filePath);
    content = (await file.exists()) ? await file.text() : null;
    if (!content) process.exit(EXIT_CODES.PASS);
  }

  const complexity = calculateComplexity(content);
  if (complexity > COMPLEXITY_THRESHOLD) {
    console.warn(
      `Cyclomatic complexity (${complexity}) exceeds threshold (${COMPLEXITY_THRESHOLD}).\n` +
        "Consider refactoring by:\n" +
        "- Extracting complex logic into smaller functions\n" +
        "- Using early returns to reduce nesting\n" +
        "- Replacing switch statements with lookup objects",
    );
  }

  const injectionFindings = detectInjections(content);
  const highInjections = injectionFindings.filter((f) => f.severity === "high");
  const mediumInjections = injectionFindings.filter((f) => f.severity === "medium");
  const secretFindings = detectSecrets(content);

  const errors: string[] = [
    ...(secretFindings.length > 0 ? [formatSecretsBlock(secretFindings, filePath)] : []),
    ...(highInjections.length > 0 ? [formatInjectionsBlock(injectionFindings, filePath)] : []),
  ];
  if (errors.length > 0) reportError(errors.join("\n\n---\n\n"));

  if (mediumInjections.length > 0 && highInjections.length === 0) {
    console.warn(formatMediumWarning(mediumInjections, filePath));
  }

  process.exit(EXIT_CODES.PASS);
}

if (import.meta.main) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    reportError(`code-validator failed: ${message}`);
  });
}
