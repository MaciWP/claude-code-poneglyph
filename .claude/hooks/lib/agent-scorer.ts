import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

import type {
  AgentScore,
  AgentMetrics,
  RoutingSuggestion,
  TaskType,
  Trend,
  ResolvedTraceEntry,
} from "./agent-scorer-types";
import { SCORES_PATH_SEGMENT, MIN_SAMPLE_SIZE } from "./agent-scorer-types";
import {
  classifyTaskType,
  extractMetrics,
  calculateCompositeScore,
  detectTrend,
  normalizeCostEfficiency,
  normalizeSpeedEfficiency,
  normalizeRetryEfficiency,
} from "./agent-scorer-calc";

export type {
  AgentScore,
  AgentMetrics,
  RoutingSuggestion,
  TaskType,
  Trend,
} from "./agent-scorer-types";
export {
  classifyTaskType,
  extractMetrics,
  calculateCompositeScore,
  detectTrend,
} from "./agent-scorer-calc";

const SCORES_PATH = join(homedir(), ".claude", SCORES_PATH_SEGMENT);

export function loadScores(): AgentScore[] {
  try {
    if (!existsSync(SCORES_PATH)) return [];
    const content = readFileSync(SCORES_PATH, "utf-8");
    const scores: AgentScore[] = [];

    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      try {
        scores.push(JSON.parse(line) as AgentScore);
      } catch {
        continue;
      }
    }

    return scores;
  } catch {
    return [];
  }
}

export function saveScores(scores: AgentScore[]): void {
  try {
    mkdirSync(join(homedir(), ".claude"), { recursive: true });
    const content = scores.map((s) => JSON.stringify(s)).join("\n") + "\n";
    writeFileSync(SCORES_PATH, content);
  } catch {
    // best effort
  }
}

function collectAgents(traces: ResolvedTraceEntry[]): string[] {
  const agents = new Set<string>();
  for (const trace of traces) {
    for (const agent of trace.agents) {
      agents.add(agent);
    }
  }
  return Array.from(agents);
}

function buildScoreEntry(agent: string, taskType: TaskType): AgentScore {
  return {
    agent,
    taskType,
    compositeScore: 0,
    successRate: 0,
    retryEfficiency: 0,
    costEfficiency: 0,
    speedEfficiency: 0,
    sampleSize: 0,
    trend: "insufficient_data",
    lastUpdated: new Date().toISOString(),
    recentScores: [],
  };
}

function findOrCreateEntry(
  scores: AgentScore[],
  agent: string,
  taskType: TaskType,
): AgentScore {
  let entry = scores.find((s) => s.agent === agent && s.taskType === taskType);

  if (!entry) {
    entry = buildScoreEntry(agent, taskType);
    scores.push(entry);
  }

  return entry;
}

function applyMetrics(
  entry: AgentScore,
  metrics: AgentMetrics,
  compositeScore: number,
): void {
  entry.compositeScore = compositeScore;
  entry.successRate = metrics.successRate;
  entry.retryEfficiency = normalizeRetryEfficiency(metrics.avgRetries);
  entry.costEfficiency = normalizeCostEfficiency(metrics.avgCost);
  entry.speedEfficiency = normalizeSpeedEfficiency(metrics.avgDuration);
  entry.sampleSize = metrics.sessionCount;
  entry.lastUpdated = new Date().toISOString();

  entry.recentScores.push(compositeScore);
  if (entry.recentScores.length > 10) {
    entry.recentScores = entry.recentScores.slice(-10);
  }

  entry.trend = detectTrend(entry.recentScores);
}

export function updateScores(traces: ResolvedTraceEntry[]): AgentScore[] {
  const scores = loadScores();
  const agents = collectAgents(traces);

  for (const agent of agents) {
    const taskType = classifyTaskType(agent);
    const metrics = extractMetrics(traces, agent);

    if (metrics.sessionCount === 0) continue;

    const compositeScore = calculateCompositeScore(metrics);
    const entry = findOrCreateEntry(scores, agent, taskType);
    applyMetrics(entry, metrics, compositeScore);
  }

  saveScores(scores);
  return scores;
}

function buildSuggestion(
  agent: string,
  taskType: TaskType,
  compositeScore: number,
  trend: Trend,
): RoutingSuggestion {
  if (compositeScore >= 80) {
    return {
      agent,
      taskType,
      score: compositeScore,
      trend,
      suggestion: "confident",
      message: `${agent} performing well (${compositeScore}/100)`,
    };
  }
  if (compositeScore >= 50) {
    return {
      agent,
      taskType,
      score: compositeScore,
      trend,
      suggestion: "proceed",
      message: `${agent} acceptable (${compositeScore}/100), consider additional skills`,
    };
  }
  if (compositeScore >= 30) {
    return {
      agent,
      taskType,
      score: compositeScore,
      trend,
      suggestion: "warning",
      message: `${agent} below average (${compositeScore}/100), review delegation`,
    };
  }
  return {
    agent,
    taskType,
    score: compositeScore,
    trend,
    suggestion: "strong_warning",
    message: `${agent} poor performance (${compositeScore}/100), consider alternative agent`,
  };
}

export function getRoutingSuggestion(
  agent: string,
  scores?: AgentScore[],
): RoutingSuggestion {
  const allScores = scores ?? loadScores();
  const taskType = classifyTaskType(agent);

  const scoreEntry = allScores.find(
    (s) => s.agent === agent && s.taskType === taskType,
  );

  if (!scoreEntry || scoreEntry.sampleSize < MIN_SAMPLE_SIZE) {
    const have = scoreEntry ? scoreEntry.sampleSize : 0;
    return {
      agent,
      taskType,
      score: -1,
      trend: "insufficient_data",
      suggestion: "no_data",
      message: `Insufficient data for ${agent} (need ${MIN_SAMPLE_SIZE} sessions, have ${have})`,
    };
  }

  return buildSuggestion(
    agent,
    taskType,
    scoreEntry.compositeScore,
    scoreEntry.trend,
  );
}
