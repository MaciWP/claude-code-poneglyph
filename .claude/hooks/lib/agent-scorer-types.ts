import type { TraceEntry } from "../trace-logger";

export type { TraceEntry };

export type TaskType =
  | "implementation"
  | "review"
  | "planning"
  | "exploration"
  | "debugging"
  | "refactoring"
  | "security"
  | "testing"
  | "documentation";

export interface AgentScore {
  agent: string;
  taskType: TaskType;
  compositeScore: number;
  successRate: number;
  retryEfficiency: number;
  costEfficiency: number;
  speedEfficiency: number;
  sampleSize: number;
  trend: Trend;
  lastUpdated: string;
  recentScores: number[];
}

export type Trend = "improving" | "declining" | "stable" | "insufficient_data";

export interface AgentMetrics {
  successRate: number;
  avgRetries: number;
  avgTokens: number;
  avgDuration: number;
  avgCost: number;
  sessionCount: number;
}

export interface RoutingSuggestion {
  agent: string;
  taskType: TaskType;
  score: number;
  trend: Trend;
  suggestion:
    | "confident"
    | "proceed"
    | "warning"
    | "strong_warning"
    | "no_data";
  message: string;
}

export const SCORES_PATH_SEGMENT = "agent-scores.jsonl";
export const ROLLING_WINDOW = 30;
export const MIN_SAMPLE_SIZE = 5;
export const TREND_THRESHOLD = 5;
export const TREND_MIN_HISTORY = 3;

export const SCORE_WEIGHTS = {
  successRate: 0.4,
  retryEfficiency: 0.2,
  costEfficiency: 0.2,
  speedEfficiency: 0.2,
} as const;

export const AGENT_TASK_TYPES: Record<string, TaskType> = {
  builder: "implementation",
  reviewer: "review",
  planner: "planning",
  scout: "exploration",
  "error-analyzer": "debugging",
  "refactor-agent": "refactoring",
  "security-auditor": "security",
  "test-watcher": "testing",
  "knowledge-sync": "documentation",
  architect: "planning",
  "task-decomposer": "planning",
  "code-quality": "review",
  "merge-resolver": "implementation",
  "bug-documenter": "documentation",
  "extension-architect": "implementation",
};
