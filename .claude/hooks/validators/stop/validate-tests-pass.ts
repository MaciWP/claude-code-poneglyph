#!/usr/bin/env bun

/**
 * Stop Hook Validator: Run tests and verify they pass.
 *
 * Reads stdin JSON (consumes to avoid broken pipe) but does not use it.
 * Env var:
 *   VALIDATE_TEST_PATH - optional specific test path to run
 *
 * Runs tests per-subproject so each picks up its own bunfig.toml
 * (e.g. web needs happy-dom preload for React component tests).
 * Exit 0 = tests pass, Exit 2 = tests fail (last 30 lines in stderr).
 */

import { resolve } from "path";
import { EXIT_CODES } from "../config";

const TEST_TIMEOUT_MS = 120_000;
const MAX_OUTPUT_LINES = 30;

// Known pre-existing test failures per subproject.
// The hook tolerates up to this many failures without blocking.
// Update these baselines when pre-existing failures are fixed.
const KNOWN_FAILURE_BASELINE: Record<string, number> = {
  server: 5,
  web: 0,
};

interface SubProject {
  name: string;
  cwd: string;
}

// =============================================================================
// Stdin Consumption
// =============================================================================

async function consumeStdin(): Promise<void> {
  return new Promise((resolve) => {
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", () => {});
    process.stdin.on("end", resolve);
    process.stdin.on("error", resolve);
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
  const candidates: SubProject[] = [
    { name: "server", cwd: resolve(root, "claude-code-ui", "server") },
    { name: "web", cwd: resolve(root, "claude-code-ui", "web") },
  ];

  const valid: SubProject[] = [];
  for (const candidate of candidates) {
    const pkgFile = Bun.file(resolve(candidate.cwd, "package.json"));
    if (await pkgFile.exists()) {
      valid.push(candidate);
    }
  }

  return valid;
}

// =============================================================================
// Test Execution
// =============================================================================

function buildTestCommand(testPath?: string): string[] {
  const args = ["bun", "test"];
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

// Parses bun test summary line: " N fail" from output like "5 fail"
function parseFailCount(output: string): number {
  const match = output.match(/(\d+)\s+fail/);
  return match ? parseInt(match[1], 10) : 0;
}

// Checks if failures exceed the known baseline for the project
function hasNewFailures(result: TestResult): boolean {
  const baseline = KNOWN_FAILURE_BASELINE[result.project] ?? 0;
  return result.failCount > baseline;
}

async function runTestsInProject(
  project: SubProject,
  testPath?: string,
): Promise<TestResult> {
  const command = buildTestCommand(testPath);

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
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  await consumeStdin();

  const testPath = process.env.VALIDATE_TEST_PATH;
  const root = findProjectRoot();
  const subProjects = await getSubProjects(root);

  if (subProjects.length === 0) {
    // Fallback: run bun test from root (no subprojects found)
    const command = buildTestCommand(testPath);
    const proc = Bun.spawn(command, {
      cwd: root,
      stdout: "pipe",
      stderr: "pipe",
    });

    const timeoutId = setTimeout(() => {
      proc.kill();
    }, TEST_TIMEOUT_MS);

    const exitCode = await proc.exited;
    clearTimeout(timeoutId);

    if (exitCode === 0) {
      process.exit(EXIT_CODES.PASS);
    }

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const combined = [stdout, stderr].filter(Boolean).join("\n");
    console.error(
      `VALIDATION FAILED: Tests did not pass (exit code ${exitCode}):\n\n${tailLines(combined, MAX_OUTPUT_LINES)}`,
    );
    process.exit(EXIT_CODES.BLOCK);
  }

  // If VALIDATE_TEST_PATH is set, determine which subproject it belongs to
  if (testPath) {
    const normalizedPath = testPath.replace(/\\/g, "/");
    const matched = subProjects.find((sp) => {
      const normalizedCwd = sp.cwd.replace(/\\/g, "/");
      return (
        normalizedPath.startsWith(normalizedCwd) ||
        normalizedPath.includes(`claude-code-ui/${sp.name}`)
      );
    });

    if (matched) {
      const result = await runTestsInProject(matched, testPath);
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

  // Run tests in each subproject sequentially
  const newFailures: TestResult[] = [];

  for (const project of subProjects) {
    const result = await runTestsInProject(project);
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
