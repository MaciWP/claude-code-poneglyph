#!/usr/bin/env bun

import { recordError } from "./lib/error-patterns";
import { updateScores } from "./lib/agent-scorer";
import { minePatterns, loadPatterns } from "./lib/pattern-learning";
import { optimize } from "./lib/optimizer";
import {
  generateBudgetReport,
  formatBudgetReport,
} from "./lib/attention/budget-reporter";
import {
  generateSuggestions,
  saveSuggestions,
} from "./lib/routing-suggestions";
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

async function runSkillSynthesis(): Promise<void> {
  const { loadPatterns: loadPatternsForSynthesis } = await import(
    "./lib/pattern-learning"
  );
  const { synthesizeSkill } = await import("./lib/skill-synthesizer");

  const patterns = await loadPatternsForSynthesis();
  if (patterns.length === 0) return;

  let created = 0;
  for (const pattern of patterns) {
    try {
      const result = synthesizeSkill(pattern);
      if (result && result.status === "created") created++;
    } catch {
      // best-effort — skip failed synthesis
    }
  }

  if (created > 0) {
    log(`synthesis: ${created} skill drafts created`);
  }
}

async function runOptimizer(): Promise<void> {
  const snapshot = await optimize();
  const applied = snapshot.applied.length;
  const pending = snapshot.proposals.filter(
    (p) => p.requiresHumanApproval,
  ).length;
  const degraded = snapshot.rolledBack.length > 0 ? " (degradation detected)" : "";
  log(
    `optimizer: ${snapshot.proposals.length} proposals, ${applied} auto-applied, ${pending} pending${degraded}`,
  );
}

async function runBudgetReport(
  trace: NonNullable<ReturnType<typeof parseTrace>>,
): Promise<void> {
  const agentUsages: Array<{ agent: string; contextSize: number }> = [];
  if (trace.agents && trace.agents.length > 0) {
    for (const agent of trace.agents) {
      agentUsages.push({
        agent,
        contextSize: trace.inputTokens || 0,
      });
    }
  }
  if (agentUsages.length === 0) return;
  const report = generateBudgetReport(
    trace.sessionId || "unknown",
    agentUsages,
  );
  log(formatBudgetReport(report));
}

async function runRoutingSuggestions(): Promise<void> {
  const patterns = await loadPatterns();
  if (patterns.length === 0) return;
  const suggestions = generateSuggestions(patterns);
  if (suggestions.length === 0) return;
  saveSuggestions(suggestions);
  const seqCount = suggestions.filter(
    (s) => s.type === "agent_sequence",
  ).length;
  const comboCount = suggestions.filter(
    (s) => s.type === "skill_combo",
  ).length;
  const routeCount = suggestions.filter(
    (s) => s.type === "complexity_routing",
  ).length;
  log(
    `routing: ${suggestions.length} suggestions (${seqCount} sequences, ${comboCount} skill combos, ${routeCount} routing)`,
  );
}

async function runBudgetCheck(): Promise<void> {
  const { checkBudget } = await import("./lib/cost-budget");
  const status = checkBudget();
  for (const alert of status.alerts) {
    log(`BUDGET: ${alert}`);
  }
}

async function runTrustUpdate(
  trace: NonNullable<ReturnType<typeof parseTrace>>,
): Promise<void> {
  const agents = trace.agents;
  if (!agents || agents.length === 0) return;

  const { updateAfterSession } = await import("./lib/agent-trust");

  const success = trace.status === "completed";
  for (const agent of agents) {
    updateAfterSession(agent, "session", success);
  }

  log(
    `trust: updated ${agents.length} agent(s) (${success ? "success" : "failure"})`,
  );
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

  try {
    await runSkillSynthesis();
  } catch (err) {
    log(`skill synthesis failed: ${formatError(err)}`);
  }

  try {
    await runOptimizer();
  } catch (err) {
    log(`optimizer failed: ${formatError(err)}`);
  }

  try {
    await runBudgetReport(trace);
  } catch (err) {
    log(`budget report failed: ${formatError(err)}`);
  }

  try {
    await runRoutingSuggestions();
  } catch (err) {
    log(`routing suggestions failed: ${formatError(err)}`);
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

  try {
    await runTrustUpdate(trace);
  } catch (err) {
    log(`trust update failed: ${formatError(err)}`);
  }

  process.exit(0);
}

main();
