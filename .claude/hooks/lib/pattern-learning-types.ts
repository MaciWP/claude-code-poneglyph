/**
 * Type definitions and constants for Pattern Learning module.
 */

export type PatternType =
  | "sequence"
  | "skill_combo"
  | "decomposition"
  | "recovery";

export interface PatternOutcome {
  successRate: number;
  avgTokens: number;
  avgDuration: number;
  avgCost: number;
  avgRetries: number;
}

export interface WorkflowPattern {
  id: string;
  type: PatternType;
  pattern: {
    agents?: string[];
    skills?: string[];
    taskType?: string;
    complexityRange?: [number, number];
    recoverySteps?: string[];
  };
  outcome: PatternOutcome;
  confidence: number;
  effectSize: number;
  sampleSize: number;
  firstSeen: string;
  lastSeen: string;
}

export interface MiningConfig {
  minSupport: number;
  minConfidence: number;
  minEffectSize: number;
  maxPatterns: number;
  timeWindowDays: number;
}

export const DEFAULT_CONFIG: MiningConfig = {
  minSupport: 5,
  minConfidence: 0.8,
  minEffectSize: 0.1,
  maxPatterns: 100,
  timeWindowDays: 30,
};

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
