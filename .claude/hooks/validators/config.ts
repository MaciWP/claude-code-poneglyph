#!/usr/bin/env bun

/**
 * Shared configuration and utilities for PostToolUse validators.
 * All validators use this module for consistent stdin parsing and error reporting.
 */

// =============================================================================
// Interfaces
// =============================================================================

/**
 * Input structure received from Claude Code hooks via stdin.
 * Contains information about the tool that was executed.
 */
export interface HookInput {
  tool_name: string;
  tool_input: {
    file_path?: string;
    content?: string;
    command?: string;
  };
  tool_output: string;
  /** Tool execution time in ms. Available since Claude Code v2.1.119. */
  duration_ms?: number;
  session_id?: string;
  hook_event_name?: string;
}

// =============================================================================
// Exit Codes
// =============================================================================

/**
 * Exit codes for PostToolUse validators.
 * PASS (0): Validation passed, continue normally.
 * BLOCK (2): Validation failed, Claude sees stderr and can auto-fix.
 */
export const EXIT_CODES = {
  PASS: 0,
  BLOCK: 2,
} as const;

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Reads raw text from stdin using Node-style streams.
 * This works correctly when the script is spawned as a subprocess.
 *
 * @returns Raw stdin text
 */
async function readStdinRaw(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = [];

    process.stdin.setEncoding("utf8");

    process.stdin.on("data", (chunk: string) => {
      chunks.push(chunk);
    });

    process.stdin.on("end", () => {
      resolve(chunks.join(""));
    });

    process.stdin.on("error", reject);

    process.stdin.resume();
  });
}

/**
 * Reads and parses JSON input from stdin.
 * Uses Node-style stream reading for compatibility when spawned as subprocess.
 *
 * @returns Parsed HookInput object
 * @throws Error if stdin is empty or JSON parsing fails
 */
export async function readStdin(): Promise<HookInput> {
  try {
    const stdin = await readStdinRaw();

    if (!stdin.trim()) {
      throw new Error("Empty stdin received");
    }

    const input = JSON.parse(stdin) as HookInput;

    if (!input.tool_name) {
      throw new Error("Missing tool_name in input");
    }

    return input;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to read stdin: ${message}`);
  }
}

/**
 * Reports an error to stderr and exits with BLOCK code.
 * Claude Code will see this message and can attempt to auto-fix.
 *
 * @param message - Error message to report
 * @returns Never (process exits)
 */
export function reportError(message: string): never {
  console.error(message);
  process.exit(EXIT_CODES.BLOCK);
}

/**
 * Checks if a file path has a TypeScript extension.
 *
 * @param path - File path to check
 * @returns True if path ends with .ts or .tsx
 */
export function isTypeScriptFile(path: string): boolean {
  const normalized = path.toLowerCase();
  return normalized.endsWith(".ts") || normalized.endsWith(".tsx");
}

/**
 * Checks if a file path has a JSON extension.
 *
 * @param path - File path to check
 * @returns True if path ends with .json
 */
export function isJsonFile(path: string): boolean {
  return path.toLowerCase().endsWith(".json");
}

/**
 * Checks if a file path has a JavaScript extension.
 *
 * @param path - File path to check
 * @returns True if path ends with .js or .jsx
 */
export function isJavaScriptFile(path: string): boolean {
  const normalized = path.toLowerCase();
  return normalized.endsWith(".js") || normalized.endsWith(".jsx");
}

const CODE_EXTENSIONS = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "py",
  "go",
  "java",
  "rs",
  "c",
  "cpp",
  "cs",
  "rb",
  "php",
  "swift",
  "kt",
]);

/**
 * Checks if a file path is a code file across supported languages.
 *
 * @param path - File path to check
 * @returns True if path has a recognized code extension
 */
export function isCodeFile(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase();
  return ext ? CODE_EXTENSIONS.has(ext) : false;
}

/**
 * Extracts the file extension from a path.
 *
 * @param path - File path to extract extension from
 * @returns Extension without the dot, or empty string if none
 */
export function getExtension(path: string): string {
  const lastDot = path.lastIndexOf(".");
  if (lastDot === -1 || lastDot === path.length - 1) {
    return "";
  }
  return path.slice(lastDot + 1).toLowerCase();
}

/**
 * Normalizes a file path for consistent comparison.
 * Converts backslashes to forward slashes and lowercases.
 *
 * @param path - File path to normalize
 * @returns Normalized path
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").toLowerCase();
}

// =============================================================================
// Language Detection
// =============================================================================

export type LanguageFamily =
  | "typescript"
  | "javascript"
  | "python"
  | "go"
  | "rust"
  | "java"
  | "ruby"
  | "php"
  | "swift"
  | "kotlin"
  | "c"
  | "csharp"
  | "unknown";

const EXTENSION_TO_FAMILY: Record<string, LanguageFamily> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  go: "go",
  rs: "rust",
  java: "java",
  rb: "ruby",
  php: "php",
  swift: "swift",
  kt: "kotlin",
  c: "c",
  cpp: "c",
  h: "c",
  cs: "csharp",
};

/**
 * Returns the language family for a file based on its extension.
 */
export function getLanguageFamily(path: string): LanguageFamily {
  const ext = getExtension(path);
  return EXTENSION_TO_FAMILY[ext] ?? "unknown";
}

const BIOME_EXTENSIONS = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "json",
  "css",
  "graphql",
]);

/**
 * Checks if a file is supported by Biome linter.
 */
export function isBiomeSupported(path: string): boolean {
  const ext = getExtension(path);
  return BIOME_EXTENSIONS.has(ext);
}

/**
 * Checks if a file path has a Python extension.
 */
export function isPythonFile(path: string): boolean {
  return path.toLowerCase().endsWith(".py");
}

// =============================================================================
// Mode Flags
// =============================================================================

export const CAREFUL = process.env.CLAUDE_CAREFUL_MODE === "true";
export const FREEZE = process.env.CLAUDE_FREEZE_MODE === "true";
export const COMPLEXITY_THRESHOLD = CAREFUL ? 15 : 25;
