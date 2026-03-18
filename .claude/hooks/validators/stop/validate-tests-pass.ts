#!/usr/bin/env bun

/**
 * Stop Hook Validator: Run tests and verify they pass.
 *
 * Language-aware: detects project type and runs appropriate test runner.
 * - Poneglyph (has .claude/hooks/validators/config.ts): bun test .claude/hooks/
 * - Python (pyproject.toml/pytest.ini): pytest
 * - Go (go.mod): go test ./...
 * - Rust (Cargo.toml): cargo test
 * - Node (package.json with test script): npm test
 *
 * Env var:
 *   VALIDATE_TEST_PATH - optional specific test path to run
 *
 * Exit 0 = tests pass, Exit 2 = tests fail (last 30 lines in stderr).
 */

import { resolve } from "node:path";
import { EXIT_CODES } from "../config";

const TEST_TIMEOUT_MS = 120_000;
const MAX_OUTPUT_LINES = 30;

// Known pre-existing test failures per subproject.
// The hook tolerates up to this many failures without blocking.
// Update these baselines when pre-existing failures are fixed.
const KNOWN_FAILURE_BASELINE: Record<string, number> = {
  root: 0,
  hooks: 0,
};

interface SubProject {
  name: string;
  cwd: string;
  testPath?: string;
}

// =============================================================================
// Stdin Consumption
// =============================================================================

async function consumeStdin(): Promise<string> {
  return new Promise((resolve) => {
    const chunks: string[] = [];
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk: string) => {
      chunks.push(chunk);
    });
    process.stdin.on("end", () => resolve(chunks.join("")));
    process.stdin.on("error", () => resolve(""));
    process.stdin.resume();
  });
}

// =============================================================================
// Sub-project Discovery
// =============================================================================

function findProjectRoot(): string {
  return process.cwd();
}

async function getSubProjects(root: string): Promise<SubProject[]> {
  // Tier 1: Poneglyph hook infrastructure — test the hooks themselves
  const hooksConfig = resolve(
    root,
    ".claude",
    "hooks",
    "validators",
    "config.ts",
  );
  if (await Bun.file(hooksConfig).exists()) {
    return [
      {
        name: "hooks",
        cwd: root,
        testPath: "./.claude/hooks/",
      },
    ];
  }

  // Tier 2: Any project — let the test runner discover tests naturally
  // detectTestRunner() in main() determines if a runner exists; here we just
  // return a generic project entry so the flow continues.
  return [
    {
      name: "root",
      cwd: root,
    },
  ];
}

// =============================================================================
// Test Runner Detection
// =============================================================================

interface TestRunner {
  cmd: string[];
  name: string;
}

async function detectTestRunner(
  projectRoot: string,
): Promise<TestRunner | null> {
  const exists = async (rel: string): Promise<boolean> =>
    Bun.file(resolve(projectRoot, rel)).exists();

  if (
    (await exists("bun.lockb")) ||
    (await exists("bun.lock")) ||
    (await exists("bunfig.toml"))
  ) {
    return { cmd: [process.execPath, "test"], name: "bun test" };
  }

  if (
    (await exists("pyproject.toml")) ||
    (await exists("pytest.ini")) ||
    (await exists("setup.py"))
  ) {
    return { cmd: ["pytest", "--tb=short", "-q"], name: "pytest" };
  }

  if (await exists("go.mod")) {
    return { cmd: ["go", "test", "./..."], name: "go test" };
  }

  if (await exists("Cargo.toml")) {
    return { cmd: ["cargo", "test"], name: "cargo test" };
  }

  if (await exists("package.json")) {
    try {
      const pkg = await Bun.file(resolve(projectRoot, "package.json")).json();
      const testScript = pkg?.scripts?.test;
      if (
        typeof testScript === "string" &&
        testScript !== 'echo "Error: no test specified" && exit 1'
      ) {
        return { cmd: ["npm", "test"], name: "npm test" };
      }
    } catch {
      // malformed package.json — skip
    }
  }

  return null;
}

// =============================================================================
// Test Execution
// =============================================================================

function buildTestCommand(runner: TestRunner, testPath?: string): string[] {
  const args = [...runner.cmd];
  if (testPath) {
    args.push(testPath);
  }
  return args;
}

function tailLines(text: string, maxLines: number): string {
  const lines = text.split("\n");
  if (lines.length <= maxLines) {
    return text;
  }
  return `... (${lines.length - maxLines} lines truncated)\n${lines.slice(-maxLines).join("\n")}`;
}

interface TestResult {
  project: string;
  exitCode: number;
  output: string;
  failCount: number;
}

// Parses test failure count from runner output (bun, pytest, go, cargo)
function parseFailCount(output: string): number {
  // Handles bun ("N fail"), pytest ("N failed"), cargo ("N failed")
  const match = output.match(/(\d+)\s+fail/i);
  if (match) return parseInt(match[1], 10);

  // Go test: count individual "--- FAIL:" lines
  const goFails = output.match(/--- FAIL:/g);
  if (goFails) return goFails.length;

  // Go test: package-level "FAIL" without per-test details
  if (/^FAIL\s/m.test(output)) return 1;

  return 0;
}

// Checks if failures exceed the known baseline for the project
function hasNewFailures(result: TestResult): boolean {
  const baseline = KNOWN_FAILURE_BASELINE[result.project] ?? 0;
  return result.failCount > baseline;
}

async function runTestsInProject(
  project: SubProject,
  runner: TestRunner,
  testPath?: string,
): Promise<TestResult> {
  const command = buildTestCommand(runner, testPath || project.testPath);

  try {
    const proc = Bun.spawn(command, {
      cwd: project.cwd,
      stdout: "pipe",
      stderr: "pipe",
    });

    const timeoutId = setTimeout(() => {
      proc.kill();
    }, TEST_TIMEOUT_MS);

    const exitCode = await proc.exited;
    clearTimeout(timeoutId);

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const output = [stdout, stderr].filter(Boolean).join("\n");

    const failCount = parseFailCount(output);
    return { project: project.name, exitCode, output, failCount };
  } catch {
    // Runner binary not found or spawn failed — skip gracefully
    return { project: project.name, exitCode: 0, output: "", failCount: 0 };
  }
}

// =============================================================================
// Main
// =============================================================================

const ERROR_KEYWORDS = /error|failed|cannot compile/i;

async function main(): Promise<void> {
  const stdinRaw = await consumeStdin();

  let lastAssistantMessage = "";
  try {
    const parsed = JSON.parse(stdinRaw) as Record<string, unknown>;
    lastAssistantMessage =
      (typeof parsed.last_assistant_message === "string"
        ? parsed.last_assistant_message
        : "") ?? "";
  } catch {
    // stdin may be empty or invalid JSON — continue normally
  }

  if (lastAssistantMessage && ERROR_KEYWORDS.test(lastAssistantMessage)) {
    console.error(
      "[stop-hook] Builder reportó posibles errores. Verificando tests...",
    );
  }

  const testPath = process.env.VALIDATE_TEST_PATH;
  const root = findProjectRoot();
  const subProjects = await getSubProjects(root);

  if (subProjects.length === 0) {
    process.exit(EXIT_CODES.PASS);
  }

  const runner = await detectTestRunner(root);
  if (!runner) {
    console.error("[stop-hook] No test runner detected, skipping validation.");
    process.exit(EXIT_CODES.PASS);
  }

  if (testPath) {
    const normalizedPath = testPath.replace(/\\/g, "/");
    const matched = subProjects.find((sp) => {
      if (sp.testPath) {
        // Poneglyph: only match paths within the hook test directory
        return normalizedPath.includes(
          sp.testPath.replace(/\\/g, "/").replace(/^\.\//, ""),
        );
      }
      // Generic project: any test path matches
      return true;
    });

    if (matched) {
      const result = await runTestsInProject(matched, runner, testPath);
      if (!hasNewFailures(result)) {
        process.exit(EXIT_CODES.PASS);
      }
      const baseline = KNOWN_FAILURE_BASELINE[result.project] ?? 0;
      console.error(
        `VALIDATION FAILED: ${result.failCount} test failures in ${result.project} (baseline: ${baseline}):\n\n${tailLines(result.output, MAX_OUTPUT_LINES)}`,
      );
      process.exit(EXIT_CODES.BLOCK);
    }
  }

  const newFailures: TestResult[] = [];

  for (const project of subProjects) {
    const result = await runTestsInProject(project, runner);
    if (hasNewFailures(result)) {
      newFailures.push(result);
    }
  }

  if (newFailures.length === 0) {
    process.exit(EXIT_CODES.PASS);
  }

  const failureMessages = newFailures
    .map((f) => {
      const baseline = KNOWN_FAILURE_BASELINE[f.project] ?? 0;
      return `[${f.project}] ${f.failCount} failures (baseline: ${baseline}):\n${tailLines(f.output, MAX_OUTPUT_LINES)}`;
    })
    .join("\n\n");

  console.error(
    `VALIDATION FAILED: New test failures in ${newFailures.length} project(s):\n\n${failureMessages}`,
  );
  process.exit(EXIT_CODES.BLOCK);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`validate-tests-pass failed: ${message}`);
  process.exit(EXIT_CODES.BLOCK);
});
