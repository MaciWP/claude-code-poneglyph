export interface TrustEvent {
  timestamp: string;
  action: "promoted" | "demoted" | "reset" | "override";
  fromLevel: number;
  toLevel: number;
  reason: string;
}

export interface AgentTrust {
  agent: string;
  taskType: string;
  level: 0 | 1 | 2 | 3;
  score: number;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  totalSessions: number;
  criticalFailuresInLast50: number;
  lastFailure?: string;
  lastSuccess?: string;
  promotedAt?: string;
  demotedAt?: string;
  lastActivity: string;
  history: TrustEvent[];
}

export interface OversightDecision {
  useWorktree: boolean;
  requireReviewer: boolean;
  requireUserConfirmation: boolean;
  validationMode: string;
  spotCheck: boolean;
}

export interface FailureClassification {
  scorePenalty: number;
  demotionAction: string;
}

export interface PromotionResult {
  shouldPromote: boolean;
  newLevel: 0 | 1 | 2 | 3;
  reason: string;
}

export const PROMOTION_CRITERIA: Record<
  number,
  { successes: number; minScore: number; noCritical?: boolean }
> = {
  0: { successes: 5, minScore: 60 },
  1: { successes: 15, minScore: 75 },
  2: { successes: 30, minScore: 85, noCritical: true },
};

export const LEVEL_THRESHOLDS: Record<number, number> = {
  1: 60,
  2: 75,
  3: 85,
};

export const SPOT_CHECK_RATE = 0.2;
export const INACTIVITY_DAYS = 30;
export const INACTIVITY_CAP_LEVEL = 1;
export const TRUST_FILE = "agent-trust.jsonl";

export function buildDefaultTrust(agent: string, taskType: string): AgentTrust {
  return {
    agent,
    taskType,
    level: 0,
    score: 50,
    consecutiveSuccesses: 0,
    consecutiveFailures: 0,
    totalSessions: 0,
    criticalFailuresInLast50: 0,
    lastActivity: new Date().toISOString(),
    history: [],
  };
}
