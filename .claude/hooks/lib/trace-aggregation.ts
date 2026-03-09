/**
 * Trace aggregation functions.
 * Computes statistics from arrays of ResolvedTraceEntry objects.
 */
import type { ResolvedTraceEntry } from "../trace-logger";

export interface AgentStats {
  count: number;
  tokens: number;
  cost: number;
}

export interface DayStats {
  sessions: number;
  tokens: number;
  cost: number;
}

export interface TraceAggregation {
  totalSessions: number;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  avgDuration: number;
  avgTokensPerSession: number;
  byAgent: Record<string, AgentStats>;
  bySkill: Record<string, { count: number }>;
  byModel: Record<string, AgentStats>;
  byStatus: Record<string, number>;
  byDay: Record<string, DayStats>;
}

function ensureAgentStats(
  map: Record<string, AgentStats>,
  key: string,
): AgentStats {
  if (!map[key]) map[key] = { count: 0, tokens: 0, cost: 0 };
  return map[key];
}

function addAgentStats(agg: TraceAggregation, entry: ResolvedTraceEntry): void {
  for (const agent of entry.agents) {
    const stats = ensureAgentStats(agg.byAgent, agent);
    stats.count++;
    stats.tokens += entry.tokens;
    stats.cost += entry.costUsd;
  }
}

function addSkillStats(agg: TraceAggregation, entry: ResolvedTraceEntry): void {
  for (const skill of entry.skills) {
    if (!agg.bySkill[skill]) agg.bySkill[skill] = { count: 0 };
    agg.bySkill[skill].count++;
  }
}

function addModelStats(agg: TraceAggregation, entry: ResolvedTraceEntry): void {
  const stats = ensureAgentStats(agg.byModel, entry.model);
  stats.count++;
  stats.tokens += entry.tokens;
  stats.cost += entry.costUsd;
}

function addDayStats(agg: TraceAggregation, entry: ResolvedTraceEntry): void {
  const day = entry.ts.split("T")[0];
  if (!agg.byDay[day]) agg.byDay[day] = { sessions: 0, tokens: 0, cost: 0 };
  agg.byDay[day].sessions++;
  agg.byDay[day].tokens += entry.tokens;
  agg.byDay[day].cost += entry.costUsd;
}

function addEntryStats(agg: TraceAggregation, entry: ResolvedTraceEntry): void {
  addAgentStats(agg, entry);
  addSkillStats(agg, entry);
  addModelStats(agg, entry);
  addDayStats(agg, entry);
}

export function aggregateTraces(entries: ResolvedTraceEntry[]): TraceAggregation {
  const agg: TraceAggregation = {
    totalSessions: entries.length,
    totalTokens: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    avgDuration: 0,
    avgTokensPerSession: 0,
    byAgent: {},
    bySkill: {},
    byModel: {},
    byStatus: {},
    byDay: {},
  };

  let totalDuration = 0;

  for (const entry of entries) {
    agg.totalTokens += entry.tokens;
    agg.totalInputTokens += entry.inputTokens;
    agg.totalOutputTokens += entry.outputTokens;
    agg.totalCost += entry.costUsd;
    totalDuration += entry.durationMs;
    agg.byStatus[entry.status] = (agg.byStatus[entry.status] ?? 0) + 1;
    addEntryStats(agg, entry);
  }

  if (entries.length > 0) {
    agg.avgDuration = Math.round(totalDuration / entries.length);
    agg.avgTokensPerSession = Math.round(agg.totalTokens / entries.length);
  }

  return agg;
}
