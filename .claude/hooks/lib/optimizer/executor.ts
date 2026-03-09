import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
} from "fs";
import { join } from "path";
import { homedir } from "os";

import type {
  OptimizationProposal,
  OptimizationSnapshot,
  OptimizationMetrics,
} from "./types";

const HISTORY_DIR = join(homedir(), ".claude", "optimization-history");
const SUCCESS_RATE_DROP = 0.05;
const RECOVERY_RATE_DROP = 0.1;

function ensureHistoryDir(): void {
  mkdirSync(HISTORY_DIR, { recursive: true });
}

export function applyProposal(proposal: OptimizationProposal): {
  success: boolean;
  error?: string;
} {
  if (proposal.requiresHumanApproval) {
    return {
      success: false,
      error: "Requires human approval",
    };
  }

  try {
    ensureHistoryDir();
    const appliedPath = join(HISTORY_DIR, `applied-${proposal.id}.json`);
    writeFileSync(appliedPath, JSON.stringify(proposal, null, 2));
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

export function rollback(proposalId: string): {
  success: boolean;
  error?: string;
} {
  try {
    ensureHistoryDir();
    const appliedPath = join(HISTORY_DIR, `applied-${proposalId}.json`);

    if (!existsSync(appliedPath)) {
      return { success: false, error: "Proposal not found in history" };
    }

    const content = readFileSync(appliedPath, "utf-8");
    const proposal = JSON.parse(content) as OptimizationProposal;

    const rollbackPath = join(HISTORY_DIR, `rolledback-${proposalId}.json`);
    writeFileSync(
      rollbackPath,
      JSON.stringify(
        {
          ...proposal,
          rolledBackAt: new Date().toISOString(),
          restoredValue: proposal.currentValue,
        },
        null,
        2,
      ),
    );

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

export function saveSnapshot(snapshot: OptimizationSnapshot): void {
  try {
    ensureHistoryDir();
    const filename = `snapshot-${snapshot.timestamp.replace(/[:.]/g, "-")}.json`;
    const filepath = join(HISTORY_DIR, filename);
    writeFileSync(filepath, JSON.stringify(snapshot, null, 2));
  } catch {
    // best effort
  }
}

export function loadSnapshots(): OptimizationSnapshot[] {
  try {
    ensureHistoryDir();
    const files = readdirSync(HISTORY_DIR).filter((f) =>
      f.startsWith("snapshot-"),
    );

    const snapshots: OptimizationSnapshot[] = [];

    for (const file of files) {
      try {
        const content = readFileSync(join(HISTORY_DIR, file), "utf-8");
        snapshots.push(JSON.parse(content) as OptimizationSnapshot);
      } catch {
        continue;
      }
    }

    snapshots.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    return snapshots;
  } catch {
    return [];
  }
}

export function detectDegradation(
  before: OptimizationMetrics,
  after: OptimizationMetrics,
): boolean {
  const successDrop = before.agentSuccessRate - after.agentSuccessRate;
  if (successDrop > SUCCESS_RATE_DROP) return true;

  const recoveryDrop = before.errorRecoveryRate - after.errorRecoveryRate;
  if (recoveryDrop > RECOVERY_RATE_DROP) return true;

  return false;
}
