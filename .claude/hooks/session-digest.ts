#!/usr/bin/env bun

import { recordError } from "./lib/error-patterns";
import { updateScores } from "./lib/agent-scorer";
import { minePatterns } from "./lib/pattern-learning";
import {
  findLatestTraceFile,
  readLastLine,
  parseTrace,
  countTraceFiles,
  formatError,
} from "./lib/session-digest-helpers";
import {
  hasErrorIndicators,
  extractErrorMessage,
  resolveTrace,
} from "./lib/session-digest-resolve";

const MINING_THRESHOLD = 50;
const TAG = "[session-digest]";

function log(message: string): void {
  process.stderr.write(`${TAG} ${message}\n`);
}

function runErrorRecording(trace: ReturnType<typeof parseTrace>): void {
  if (!trace) return;
  if (!hasErrorIndicators(trace)) return;

  const errorMsg = extractErrorMessage(trace);
  recordError(errorMsg);
  log(`Recorded error pattern: ${errorMsg.slice(0, 80)}`);
}

function runScoreUpdate(trace: ReturnType<typeof parseTrace>): void {
  if (!trace) return;

  const resolved = resolveTrace(trace);
  updateScores([resolved]);
  log("Updated agent scores");
}

async function runPatternMining(): Promise<void> {
  const fileCount = countTraceFiles();
  if (fileCount <= MINING_THRESHOLD) return;

  const patterns = await minePatterns();
  log(`Mined ${patterns.length} patterns from ${fileCount} trace files`);
}

async function main(): Promise<void> {
  const traceFile = findLatestTraceFile();
  if (!traceFile) {
    log("No trace files found, skipping");
    process.exit(0);
  }

  const lastLine = readLastLine(traceFile);
  if (!lastLine) {
    log("Empty trace file, skipping");
    process.exit(0);
  }

  const trace = parseTrace(lastLine);
  if (!trace) {
    log("Failed to parse trace, skipping");
    process.exit(0);
  }

  try { runErrorRecording(trace); } catch (err) {
    log(`recordError failed: ${formatError(err)}`);
  }

  try { runScoreUpdate(trace); } catch (err) {
    log(`updateScores failed: ${formatError(err)}`);
  }

  try { await runPatternMining(); } catch (err) {
    log(`minePatterns failed: ${formatError(err)}`);
  }

  process.exit(0);
}

main();
