import type {
  ResolvedTraceEntry,
  AgentMetrics,
  TaskType,
  Trend,
} from "./agent-scorer-types";
import {
  AGENT_TASK_TYPES,
  ROLLING_WINDOW,
  SCORE_WEIGHTS,
  TREND_THRESHOLD,
  TREND_MIN_HISTORY,
} from "./agent-scorer-types";

const ERROR_STATUSES = new Set(["error", "failed", "timeout", "interrupted"]);

export function classifyTaskType(agent: string): TaskType {
  return AGENT_TASK_TYPES[agent] ?? "implementation";
}

export function extractMetrics(
  traces: ResolvedTraceEntry[],
  agent: string,
): AgentMetrics {
  const agentTraces = traces.filter((t) => t.agents.includes(agent));

  if (agentTraces.length === 0) {
    return {
      successRate: 0,
      avgRetries: 0,
      avgTokens: 0,
      avgDuration: 0,
      avgCost: 0,
      sessionCount: 0,
    };
  }

  const recent = agentTraces.slice(-ROLLING_WINDOW);
  const count = recent.length;
  const succeeded = recent.filter((t) => !ERROR_STATUSES.has(t.status)).length;
  const successRate = succeeded / count;

  let totalRetries = 0;
  for (const trace of recent) {
    const agentCount = trace.agents.filter((a) => a === agent).length;
    totalRetries += Math.max(0, agentCount - 1);
  }
  const avgRetries = totalRetries / count;
  const avgTokens = recent.reduce((sum, t) => sum + t.tokens, 0) / count;
  const avgDuration = recent.reduce((sum, t) => sum + t.durationMs, 0) / count;
  const avgCost = recent.reduce((sum, t) => sum + t.costUsd, 0) / count;

  return {
    successRate,
    avgRetries,
    avgTokens,
    avgDuration,
    avgCost,
    sessionCount: count,
  };
}

export function normalizeCostEfficiency(avgCost: number): number {
  if (avgCost <= 0) return 1.0;
  return Math.min(1.0, 1.0 / (1.0 + avgCost * 10));
}

export function normalizeSpeedEfficiency(avgDurationMs: number): number {
  if (avgDurationMs <= 0) return 1.0;
  const seconds = avgDurationMs / 1000;
  return Math.min(1.0, 60 / (60 + seconds));
}

export function normalizeRetryEfficiency(avgRetries: number): number {
  return Math.min(1.0, 1.0 / (1.0 + avgRetries));
}

export function calculateCompositeScore(metrics: AgentMetrics): number {
  const retryEff = normalizeRetryEfficiency(metrics.avgRetries);
  const costEff = normalizeCostEfficiency(metrics.avgCost);
  const speedEff = normalizeSpeedEfficiency(metrics.avgDuration);

  const score =
    metrics.successRate * SCORE_WEIGHTS.successRate +
    retryEff * SCORE_WEIGHTS.retryEfficiency +
    costEff * SCORE_WEIGHTS.costEfficiency +
    speedEff * SCORE_WEIGHTS.speedEfficiency;

  return Math.round(score * 100);
}

export function detectTrend(recentScores: number[]): Trend {
  if (recentScores.length < TREND_MIN_HISTORY) return "insufficient_data";

  const last3 = recentScores.slice(-3);
  const avg = last3.reduce((a, b) => a + b, 0) / last3.length;
  const current = recentScores[recentScores.length - 1];
  const diff = current - avg;

  if (diff > TREND_THRESHOLD) return "improving";
  if (diff < -TREND_THRESHOLD) return "declining";
  return "stable";
}
