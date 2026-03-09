/**
 * Utility functions for Pattern Learning module.
 */

import type { ResolvedTraceEntry } from "../trace-logger";
import type { PatternOutcome } from "./pattern-learning-types";

export function estimateComplexity(trace: ResolvedTraceEntry): number {
  const agentCount = trace.agents.length;
  const tokenNormalized = Math.min(trace.tokens / 50000, 1);
  const raw = agentCount * 20 + tokenNormalized * 20 + trace.filesChanged * 5;
  return Math.min(100, Math.round(raw));
}

export function calculateConfidence(
  successes: number,
  total: number,
  baselineRate: number = 0,
): number {
  if (total === 0) return 0;
  const z = 1.96;
  const p = successes / total;
  const denominator = 1 + (z * z) / total;
  const center = p + (z * z) / (2 * total);
  const spread = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total);
  const wilson = (center - spread) / denominator;
  const result = wilson - baselineRate;
  return Math.max(0, Math.min(1, result));
}

export function containsSubsequence(arr: string[], sub: string[]): boolean {
  let j = 0;
  for (let i = 0; i < arr.length && j < sub.length; i++) {
    if (arr[i] === sub[j]) j++;
  }
  return j === sub.length;
}

export function generateSubsets(arr: string[], k: number): string[][] {
  if (k > arr.length) return [];
  if (k === 0) return [[]];
  if (k === arr.length) return [arr.slice()];

  const results: string[][] = [];

  function backtrack(start: number, current: string[]): void {
    if (current.length === k) {
      results.push(current.slice());
      return;
    }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return results;
}

export function calculateOutcome(traces: ResolvedTraceEntry[]): PatternOutcome {
  const count = traces.length;
  if (count === 0) {
    return {
      successRate: 0,
      avgTokens: 0,
      avgDuration: 0,
      avgCost: 0,
      avgRetries: 0,
    };
  }

  const successes = traces.filter((t) => t.status === "completed").length;
  const totalTokens = traces.reduce((s, t) => s + t.tokens, 0);
  const totalDuration = traces.reduce((s, t) => s + t.durationMs, 0);
  const totalCost = traces.reduce((s, t) => s + t.costUsd, 0);

  return {
    successRate: successes / count,
    avgTokens: Math.round(totalTokens / count),
    avgDuration: Math.round(totalDuration / count),
    avgCost: totalCost / count,
    avgRetries: 0,
  };
}
