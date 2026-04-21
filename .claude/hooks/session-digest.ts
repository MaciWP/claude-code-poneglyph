#!/usr/bin/env bun

import { readHookStdin } from "./lib/hook-stdin";
import { recordError } from "./lib/error-patterns";
import { updateScores } from "./lib/agent-scorer";
import { minePatterns } from "./lib/pattern-learning";
import { extractAndRecordLessons } from "./lib/lesson-extractor";
import { existsSync, unlinkSync } from "node:fs";
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
import {
  createStore,
  closeStore,
  getSessionDbPath,
  getStoreStats,
} from "./lib/context-store";
import { persistToKnowledge } from "./lib/context-store/bridge";

const MINING_THRESHOLD = 10;
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

async function runBudgetCheck(): Promise<void> {
  const { checkBudget } = await import("./lib/cost-budget");
  const status = checkBudget();
  for (const alert of status.alerts) {
    log(`BUDGET: ${alert}`);
  }
}

async function runContextCheckpoint(
  trace: NonNullable<ReturnType<typeof parseTrace>>,
): Promise<void> {
  const dbPath = getSessionDbPath();
  if (!existsSync(dbPath)) return;

  const db = createStore(dbPath);

  try {
    const sessionId = `session-${process.ppid}`;
    const persisted = persistToKnowledge(db, sessionId, process.cwd());

    if (persisted > 0) {
      const stats = getStoreStats(db);
      log(
        `context checkpoint: ${stats.totalChunks} chunks, ${stats.totalTokens} tokens exported`,
      );
    }
  } finally {
    closeStore(db);
    try {
      unlinkSync(dbPath);
    } catch {
      // best-effort cleanup
    }
  }
}

async function main(): Promise<void> {
  const stdinRaw = await readHookStdin();
  try {
    const parsed = JSON.parse(stdinRaw) as Record<string, unknown>;
    if (parsed.stop_hook_active === true) {
      process.exit(0);
    }
  } catch {
    // stdin may be empty or invalid JSON — continue normally
  }

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

  try {
    runErrorRecording(trace);
  } catch (err) {
    log(`recordError failed: ${formatError(err)}`);
  }

  try {
    runScoreUpdate(trace);
  } catch (err) {
    log(`updateScores failed: ${formatError(err)}`);
  }

  try {
    const correction = extractAndRecordLessons(traceFile, trace.sessionId);
    if (correction) {
      log(`Auto-recorded lesson: ${correction.slice(0, 60)}`);
    }
  } catch (err) {
    log(`lessonExtraction failed: ${formatError(err)}`);
  }

  try {
    await runPatternMining();
  } catch (err) {
    log(`minePatterns failed: ${formatError(err)}`);
  }

  try {
    await runContextCheckpoint(trace);
  } catch (err) {
    log(`context checkpoint failed: ${formatError(err)}`);
  }

  try {
    await runBudgetCheck();
  } catch (err) {
    log(`budget check failed: ${formatError(err)}`);
  }

  process.exit(0);
}

main();
