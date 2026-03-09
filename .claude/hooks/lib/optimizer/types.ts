import type { AgentScore } from "../agent-scorer-types";
import type { WorkflowPattern } from "../pattern-learning-types";
import type { ErrorPattern } from "../error-patterns";
import type { AgentTrust } from "../agent-trust-types";
import type { BudgetConfig } from "../attention/budgeter";

export type RiskLevel = "low" | "medium" | "high";

export type OptimizationTarget =
  | "complexity-thresholds"
  | "skill-keywords"
  | "agent-routing"
  | "token-budgets"
  | "trust-thresholds"
  | "error-recovery-retry";

export interface OptimizationProposal {
  id: string;
  target: OptimizationTarget;
  risk: RiskLevel;
  description: string;
  rationale: string;
  currentValue: unknown;
  proposedValue: unknown;
  expectedImpact: string;
  requiresHumanApproval: boolean;
  confidence: number;
  timestamp: string;
}

export interface OptimizationSnapshot {
  id: string;
  timestamp: string;
  proposals: OptimizationProposal[];
  applied: string[];
  rolledBack: string[];
  metrics: OptimizationMetrics;
}

export interface OptimizationMetrics {
  agentSuccessRate: number;
  averageTaskDuration: number;
  errorRecoveryRate: number;
  costPerSession: number;
  patternCount: number;
  knowledgeEntryCount: number;
  trustLevelDistribution: Record<string, number>;
}

export interface OrchestrationConfig {
  complexityThresholds: { low: number; high: number };
  tokenBudgets: {
    exploration: number;
    implementation: number;
    verification: number;
  };
  errorRetryBudgets: Record<string, number>;
  trustPromotionThresholds: {
    level1: number;
    level2: number;
    level3: number;
  };
}

export interface CollectedData {
  scores: AgentScore[];
  patterns: WorkflowPattern[];
  errorPatterns: ErrorPattern[];
  trustRecords: AgentTrust[];
  budgetConfig: BudgetConfig;
  costConfig: Record<string, unknown>;
  knowledgeEntryCount: number;
}
