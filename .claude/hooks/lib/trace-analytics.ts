/**
 * Trace Analytics Module
 * Loads, queries, and aggregates trace data from JSONL files.
 */
import { homedir } from "os";
import { join } from "path";
import type { TraceEntry, ResolvedTraceEntry } from "../trace-logger";
import { aggregateTraces } from "./trace-aggregation";
import type { TraceAggregation } from "./trace-aggregation";

export type {
  AgentStats,
  DayStats,
  TraceAggregation,
} from "./trace-aggregation";
export { aggregateTraces } from "./trace-aggregation";

export interface TraceQuery {
  from?: Date;
  to?: Date;
  agents?: string[];
  skills?: string[];
  status?: string;
  model?: string;
}

const RESOLVED_DEFAULTS: ResolvedTraceEntry = {
  ts: "",
  sessionId: "unknown",
  prompt: "unknown",
  agents: [],
  skills: [],
  tokens: 0,
  inputTokens: 0,
  outputTokens: 0,
  costUsd: 0,
  durationMs: 0,
  model: "unknown",
  status: "unknown",
  toolCalls: 0,
  filesChanged: 0,
};

function normalizeEntry(entry: Partial<TraceEntry>): ResolvedTraceEntry {
  return {
    ...RESOLVED_DEFAULTS,
    ts: entry.ts ?? new Date().toISOString(),
    sessionId: entry.sessionId ?? "unknown",
    prompt: entry.prompt ?? "unknown",
    agents: entry.agents ?? [],
    skills: entry.skills ?? [],
    tokens: entry.tokens ?? 0,
    inputTokens: entry.inputTokens ?? 0,
    outputTokens: entry.outputTokens ?? 0,
    costUsd: entry.costUsd ?? 0,
    durationMs: entry.durationMs ?? 0,
    model: entry.model ?? "unknown",
    status: entry.status ?? "unknown",
    toolCalls: entry.toolCalls ?? 0,
    filesChanged: entry.filesChanged ?? 0,
    rawInput: entry.rawInput,
  };
}

function matchesDateRange(entryTs: string, from?: Date, to?: Date): boolean {
  const entryDate = new Date(entryTs);
  if (from && entryDate < from) return false;
  if (to) {
    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);
    if (entryDate > toEnd) return false;
  }
  return true;
}

function matchesArrayFilter(
  entryValues: string[],
  filterValues?: string[],
): boolean {
  if (!filterValues) return true;
  if (filterValues.length === 0) return true;
  return entryValues.some((v) => filterValues.includes(v));
}

function matchesQuery(entry: ResolvedTraceEntry, query: TraceQuery): boolean {
  if (!matchesDateRange(entry.ts, query.from, query.to)) return false;
  if (!matchesArrayFilter(entry.agents, query.agents)) return false;
  if (!matchesArrayFilter(entry.skills, query.skills)) return false;
  if (query.status && entry.status !== query.status) return false;
  if (query.model && entry.model !== query.model) return false;
  return true;
}

function getDateRange(from?: Date, to?: Date): string[] {
  const dates: string[] = [];
  const msPerYear = 365 * 24 * 60 * 60 * 1000;
  const start = from ? new Date(from) : new Date(Date.now() - msPerYear);
  const end = to ? new Date(to) : new Date();
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);

  while (current <= endDate) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

async function parseTraceFile(
  filePath: string,
): Promise<Partial<TraceEntry>[]> {
  const file = Bun.file(filePath);
  if (!(await file.exists())) return [];

  const content = await file.text();
  const results: Partial<TraceEntry>[] = [];
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    try {
      results.push(JSON.parse(line) as Partial<TraceEntry>);
    } catch {
      continue;
    }
  }
  return results;
}

export async function loadTraces(
  query: TraceQuery = {},
): Promise<ResolvedTraceEntry[]> {
  const tracesDir = join(homedir(), ".claude", "traces");
  const entries: ResolvedTraceEntry[] = [];
  const dates = getDateRange(query.from, query.to);

  for (const dateStr of dates) {
    const filePath = join(tracesDir, `${dateStr}.jsonl`);
    const rawEntries = await parseTraceFile(filePath);
    for (const raw of rawEntries) {
      const entry = normalizeEntry(raw);
      if (matchesQuery(entry, query)) {
        entries.push(entry);
      }
    }
  }

  return entries;
}

export async function queryTraces(
  query: TraceQuery = {},
): Promise<TraceAggregation> {
  const entries = await loadTraces(query);
  return aggregateTraces(entries);
}
