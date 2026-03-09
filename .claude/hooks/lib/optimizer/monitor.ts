import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

import { loadScores } from "../agent-scorer";
import { loadPatterns } from "../pattern-learning";
import { loadPatterns as loadErrorPatterns } from "../error-patterns";
import { loadTrust } from "../agent-trust";
import { getBudgetForAgent } from "../attention/budgeter";
import { loadGraph } from "../knowledge/graph-storage";

import type { OptimizationMetrics, CollectedData } from "./types";

function computeAgentSuccessRate(scores: CollectedData["scores"]): number {
  if (scores.length === 0) return 0;
  const total = scores.reduce((sum, s) => sum + s.successRate, 0);
  return total / scores.length;
}

function computeAverageDuration(scores: CollectedData["scores"]): number {
  if (scores.length === 0) return 0;
  const total = scores.reduce((sum, s) => sum + s.speedEfficiency, 0);
  return total / scores.length;
}

function computeErrorRecoveryRate(
  errorPatterns: CollectedData["errorPatterns"],
): number {
  if (errorPatterns.length === 0) return 0;
  const total = errorPatterns.reduce((sum, p) => sum + p.successRate, 0);
  return total / errorPatterns.length;
}

function computeCostPerSession(scores: CollectedData["scores"]): number {
  if (scores.length === 0) return 0;
  const total = scores.reduce((sum, s) => sum + s.costEfficiency, 0);
  return total / scores.length;
}

function computeTrustDistribution(
  trustRecords: CollectedData["trustRecords"],
): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const record of trustRecords) {
    const key = `level_${record.level}`;
    dist[key] = (dist[key] ?? 0) + 1;
  }
  return dist;
}

function loadCostConfig(): Record<string, unknown> {
  try {
    const configPath = join(homedir(), ".claude", "config", "cost-budget.json");
    if (!existsSync(configPath)) {
      const localPath = join(
        process.cwd(),
        ".claude",
        "config",
        "cost-budget.json",
      );
      if (!existsSync(localPath)) return {};
      return JSON.parse(readFileSync(localPath, "utf-8")) as Record<
        string,
        unknown
      >;
    }
    return JSON.parse(readFileSync(configPath, "utf-8")) as Record<
      string,
      unknown
    >;
  } catch {
    return {};
  }
}

export async function collectData(): Promise<
  OptimizationMetrics & { raw: CollectedData }
> {
  let scores: CollectedData["scores"] = [];
  try {
    scores = loadScores();
  } catch {
    scores = [];
  }

  let patterns: CollectedData["patterns"] = [];
  try {
    patterns = await loadPatterns();
  } catch {
    patterns = [];
  }

  let errorPatterns: CollectedData["errorPatterns"] = [];
  try {
    errorPatterns = loadErrorPatterns();
  } catch {
    errorPatterns = [];
  }

  let trustRecords: CollectedData["trustRecords"] = [];
  try {
    trustRecords = loadTrust();
  } catch {
    trustRecords = [];
  }

  const budgetConfig = getBudgetForAgent("default");
  const costConfig = loadCostConfig();

  let knowledgeEntryCount = 0;
  try {
    knowledgeEntryCount = loadGraph().length;
  } catch {
    knowledgeEntryCount = 0;
  }

  const raw: CollectedData = {
    scores,
    patterns,
    errorPatterns,
    trustRecords,
    budgetConfig,
    costConfig,
    knowledgeEntryCount,
  };

  const metrics: OptimizationMetrics = {
    agentSuccessRate: computeAgentSuccessRate(scores),
    averageTaskDuration: computeAverageDuration(scores),
    errorRecoveryRate: computeErrorRecoveryRate(errorPatterns),
    costPerSession: computeCostPerSession(scores),
    patternCount: patterns.length,
    knowledgeEntryCount,
    trustLevelDistribution: computeTrustDistribution(trustRecords),
  };

  return { ...metrics, raw };
}
