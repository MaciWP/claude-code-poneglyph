/**
 * Recovery pattern mining: extracts multi-session recovery chains
 * from error traces followed by successful completions.
 */

import type { TraceEntry } from "../trace-logger";
import type { ErrorPattern } from "./error-patterns";
import type { WorkflowPattern } from "./pattern-learning-types";
import { generateId } from "./pattern-learning-types";
import {
  calculateConfidence,
  calculateOutcome,
} from "./pattern-learning-utils";
import { computeBaselineRate } from "./pattern-learning-miners";

interface RecoveryEntry {
  count: number;
  traces: TraceEntry[];
}

function sortByTimestamp(traces: TraceEntry[]): TraceEntry[] {
  return traces
    .slice()
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
}

function isRecoveryCandidate(
  candidate: TraceEntry,
  errorSessionId: string,
): boolean {
  if (candidate.sessionId === errorSessionId) return false;
  if (candidate.status !== "completed") return false;
  if (candidate.agents.length === 0) return false;
  return true;
}

function buildRecoveryMap(sorted: TraceEntry[]): Map<string, RecoveryEntry> {
  const recoveryMap = new Map<string, RecoveryEntry>();

  for (let i = 0; i < sorted.length; i++) {
    const errorTrace = sorted[i];
    if (errorTrace.status === "completed") continue;

    const limit = Math.min(i + 4, sorted.length);
    for (let j = i + 1; j < limit; j++) {
      const candidate = sorted[j];
      if (!isRecoveryCandidate(candidate, errorTrace.sessionId)) continue;

      const key = candidate.agents.join(" -> ");
      const entry = recoveryMap.get(key);
      if (entry) {
        entry.count++;
        entry.traces.push(candidate);
      } else {
        recoveryMap.set(key, { count: 1, traces: [candidate] });
      }
      break;
    }
  }

  return recoveryMap;
}

function buildRecoveryPattern(
  key: string,
  data: RecoveryEntry,
  baselineRate: number,
): WorkflowPattern {
  const agents = key.split(" -> ");
  const outcome = calculateOutcome(data.traces);
  const confidence = calculateConfidence(data.count, data.count, baselineRate);

  return {
    id: generateId(),
    type: "recovery",
    pattern: {
      recoverySteps: agents,
      agents,
    },
    outcome,
    confidence,
    effectSize: outcome.successRate - baselineRate,
    sampleSize: data.count,
    firstSeen: data.traces[0].ts,
    lastSeen: data.traces[data.traces.length - 1].ts,
  };
}

export function mineRecoveryPatterns(
  traces: TraceEntry[],
  _errorPatterns: ErrorPattern[],
): WorkflowPattern[] {
  const sorted = sortByTimestamp(traces);
  const recoveryMap = buildRecoveryMap(sorted);
  const baselineRate = computeBaselineRate(traces);
  const patterns: WorkflowPattern[] = [];

  for (const [key, data] of recoveryMap) {
    if (data.count < 3) continue;
    patterns.push(buildRecoveryPattern(key, data, baselineRate));
  }

  return patterns;
}
