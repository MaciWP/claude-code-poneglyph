/**
 * Mining functions for agent sequences, skill combinations,
 * and decomposition patterns.
 */

import type { ResolvedTraceEntry } from "../trace-logger";
import type { WorkflowPattern } from "./pattern-learning-types";
import { generateId } from "./pattern-learning-types";
import {
  estimateComplexity,
  calculateConfidence,
  generateSubsets,
  calculateOutcome,
} from "./pattern-learning-utils";

export {
  mineSpawnSuccessPatterns,
  toExpertiseBucket,
} from "./pattern-learning-spawn";
export type {
  SpawnRecord,
  SpawnScoreRecord,
  SpawnSuccessPattern,
  MemoryBucket,
} from "./pattern-learning-spawn";

export interface CountEntry {
  count: number;
  traces: ResolvedTraceEntry[];
}

export function computeBaselineRate(traces: ResolvedTraceEntry[]): number {
  if (traces.length === 0) return 0;
  const successes = traces.filter((t) => t.status === "completed").length;
  return successes / traces.length;
}

function buildSequenceKeys(agents: string[]): string[] {
  const keys: string[] = [];
  const maxLen = Math.min(3, agents.length);
  for (let len = 2; len <= maxLen; len++) {
    for (let i = 0; i <= agents.length - len; i++) {
      keys.push(agents.slice(i, i + len).join(" -> "));
    }
  }
  return keys;
}

export function accumulateCounts(
  map: Map<string, CountEntry>,
  key: string,
  trace: ResolvedTraceEntry,
): void {
  const entry = map.get(key);
  if (entry) {
    entry.count++;
    entry.traces.push(trace);
  } else {
    map.set(key, { count: 1, traces: [trace] });
  }
}

function buildPatternFromCounts(
  key: string,
  data: CountEntry,
  type: "sequence" | "skill_combo",
  separator: string,
  baselineRate: number,
): WorkflowPattern {
  const items = key.split(separator);
  const successes = data.traces.filter((t) => t.status === "completed").length;
  const outcome = calculateOutcome(data.traces);
  const confidence = calculateConfidence(successes, data.count, baselineRate);

  return {
    id: generateId(),
    type,
    pattern: type === "sequence" ? { agents: items } : { skills: items },
    outcome,
    confidence,
    effectSize: outcome.successRate - baselineRate,
    sampleSize: data.count,
    firstSeen: data.traces[0].ts,
    lastSeen: data.traces[data.traces.length - 1].ts,
  };
}

function collectPatterns(
  counts: Map<string, CountEntry>,
  minSupport: number,
  type: "sequence" | "skill_combo",
  separator: string,
  baselineRate: number,
): WorkflowPattern[] {
  const patterns: WorkflowPattern[] = [];
  const entries = Array.from(counts);
  for (let i = 0; i < entries.length; i++) {
    const [key, data] = entries[i];
    if (data.count < minSupport) continue;
    patterns.push(
      buildPatternFromCounts(key, data, type, separator, baselineRate),
    );
  }
  return patterns;
}

export function mineAgentSequences(
  traces: ResolvedTraceEntry[],
  minSupport: number = 5,
): WorkflowPattern[] {
  const counts = new Map<string, CountEntry>();
  const baselineRate = computeBaselineRate(traces);

  for (const trace of traces) {
    if (trace.agents.length < 2) continue;
    for (const key of buildSequenceKeys(trace.agents)) {
      accumulateCounts(counts, key, trace);
    }
  }

  return collectPatterns(counts, minSupport, "sequence", " -> ", baselineRate);
}

export function mineSkillCombinations(
  traces: ResolvedTraceEntry[],
  minSupport: number = 5,
): WorkflowPattern[] {
  const counts = new Map<string, CountEntry>();
  const baselineRate = computeBaselineRate(traces);

  for (const trace of traces) {
    if (trace.skills.length < 2) continue;
    const sorted = trace.skills.slice().sort();
    for (const subset of generateSubsets(sorted, 2)) {
      accumulateCounts(counts, subset.join(" + "), trace);
    }
  }

  return collectPatterns(
    counts,
    minSupport,
    "skill_combo",
    " + ",
    baselineRate,
  );
}

function findTopAgent(traces: ResolvedTraceEntry[]): string {
  const agentCounts: Record<string, number> = {};
  for (const t of traces) {
    for (const a of t.agents) {
      agentCounts[a] = (agentCounts[a] || 0) + 1;
    }
  }
  let topAgent = "builder";
  let topCount = 0;
  const keys = Object.keys(agentCounts);
  for (let i = 0; i < keys.length; i++) {
    if (agentCounts[keys[i]] > topCount) {
      topAgent = keys[i];
      topCount = agentCounts[keys[i]];
    }
  }
  return topAgent;
}

function isInRange(
  trace: ResolvedTraceEntry,
  low: number,
  high: number,
): boolean {
  const c = estimateComplexity(trace);
  return c >= low && c <= high;
}

export function mineDecompositionPatterns(
  traces: ResolvedTraceEntry[],
): WorkflowPattern[] {
  const ranges: Array<[number, number]> = [
    [0, 29],
    [30, 59],
    [60, 100],
  ];
  const patterns: WorkflowPattern[] = [];
  const baselineRate = computeBaselineRate(traces);

  for (const [low, high] of ranges) {
    const rangeTraces = traces.filter((t) => isInRange(t, low, high));
    if (rangeTraces.length < 3) continue;

    const successes = rangeTraces.filter(
      (t) => t.status === "completed",
    ).length;
    const outcome = calculateOutcome(rangeTraces);
    const confidence = calculateConfidence(
      successes,
      rangeTraces.length,
      baselineRate,
    );

    patterns.push({
      id: generateId(),
      type: "decomposition",
      pattern: {
        complexityRange: [low, high],
        taskType: findTopAgent(rangeTraces),
      },
      outcome,
      confidence,
      effectSize: outcome.successRate - baselineRate,
      sampleSize: rangeTraces.length,
      firstSeen: rangeTraces[0].ts,
      lastSeen: rangeTraces[rangeTraces.length - 1].ts,
    });
  }

  return patterns;
}
