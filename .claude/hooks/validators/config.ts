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
interface HookInput {
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
 * Checks if a file path has a JSON extension.
 *
 * @param path - File path to check
 * @returns True if path ends with .json
 */
export function isJsonFile(path: string): boolean {
  return path.toLowerCase().endsWith(".json");
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
function getExtension(path: string): string {
  const lastDot = path.lastIndexOf(".");
  if (lastDot === -1 || lastDot === path.length - 1) {
    return "";
  }
  return path.slice(lastDot + 1).toLowerCase();
}

// =============================================================================
// Mode Flags
// =============================================================================

export const CAREFUL = process.env.CLAUDE_CAREFUL_MODE === "true";
export const COMPLEXITY_THRESHOLD = CAREFUL ? 15 : 25;
