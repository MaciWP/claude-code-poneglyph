import type {
  AgentTrust,
  TrustEvent,
  OversightDecision,
  FailureClassification,
  PromotionResult,
} from "./agent-trust-types";
import {
  PROMOTION_CRITERIA,
  LEVEL_THRESHOLDS,
  SPOT_CHECK_RATE,
  INACTIVITY_DAYS,
  INACTIVITY_CAP_LEVEL,
} from "./agent-trust-types";

const FAILURE_MAP: Record<string, FailureClassification> = {
  critical: { scorePenalty: -15, demotionAction: "immediate_level_0" },
  major: { scorePenalty: -5, demotionAction: "check_consecutive" },
  minor: { scorePenalty: -1, demotionAction: "none" },
};

const DEMOTION_LEVEL: Record<string, (level: number) => number> = {
  critical_failure: () => 0,
  consecutive_major: (level) => Math.max(0, level - 1),
  score_below_threshold: (level) => Math.max(0, level - 1),
};

export function classifyFailure(
  severity: "minor" | "major" | "critical",
): FailureClassification {
  return FAILURE_MAP[severity];
}

export function checkPromotion(trust: AgentTrust): PromotionResult {
  const criteria = PROMOTION_CRITERIA[trust.level];

  if (!criteria) {
    return {
      shouldPromote: false,
      newLevel: trust.level,
      reason: "already at max level",
    };
  }

  if (trust.consecutiveSuccesses < criteria.successes) {
    return {
      shouldPromote: false,
      newLevel: trust.level,
      reason: `need ${criteria.successes} consecutive successes, have ${trust.consecutiveSuccesses}`,
    };
  }

  if (trust.score <= criteria.minScore) {
    return {
      shouldPromote: false,
      newLevel: trust.level,
      reason: `score ${trust.score} not above threshold ${criteria.minScore}`,
    };
  }

  if (criteria.noCritical && trust.criticalFailuresInLast50 > 0) {
    return {
      shouldPromote: false,
      newLevel: trust.level,
      reason: `${trust.criticalFailuresInLast50} critical failures in last 50 sessions`,
    };
  }

  const newLevel = (trust.level + 1) as 0 | 1 | 2 | 3;
  return {
    shouldPromote: true,
    newLevel,
    reason: `met criteria: ${criteria.successes} successes, score ${trust.score} > ${criteria.minScore}`,
  };
}

export function demote(trust: AgentTrust, reason: string): AgentTrust {
  const fromLevel = trust.level;
  const resolver = DEMOTION_LEVEL[reason] ?? DEMOTION_LEVEL.consecutive_major;
  trust.level = resolver(trust.level) as 0 | 1 | 2 | 3;

  const event: TrustEvent = {
    timestamp: new Date().toISOString(),
    action: "demoted",
    fromLevel,
    toLevel: trust.level,
    reason,
  };
  trust.history.push(event);
  trust.demotedAt = new Date().toISOString();

  return trust;
}

export function applySuccess(trust: AgentTrust): void {
  trust.consecutiveSuccesses += 1;
  trust.consecutiveFailures = 0;
  trust.score = Math.min(100, trust.score + 2);
  trust.lastSuccess = new Date().toISOString();
}

export function applyFailure(
  trust: AgentTrust,
  severity: "minor" | "major" | "critical",
): void {
  const classification = classifyFailure(severity);
  trust.score = Math.max(0, trust.score + classification.scorePenalty);
  trust.lastFailure = new Date().toISOString();

  if (severity === "minor") return;

  trust.consecutiveFailures += 1;
  trust.consecutiveSuccesses = 0;

  if (severity === "critical") {
    trust.criticalFailuresInLast50 += 1;
    demote(trust, "critical_failure");
    return;
  }

  if (trust.consecutiveFailures >= 2) {
    demote(trust, "consecutive_major");
  }
}

export function checkScoreThreshold(trust: AgentTrust): void {
  const threshold = LEVEL_THRESHOLDS[trust.level];
  if (threshold === undefined) return;
  if (trust.score < threshold) {
    demote(trust, "score_below_threshold");
  }
}

export function determineOversight(trust: AgentTrust): OversightDecision {
  const levelDecisions: Record<number, OversightDecision> = {
    0: {
      useWorktree: true,
      requireReviewer: true,
      requireUserConfirmation: true,
      validationMode: "strict",
      spotCheck: false,
    },
    1: {
      useWorktree: true,
      requireReviewer: true,
      requireUserConfirmation: false,
      validationMode: "standard",
      spotCheck: false,
    },
    2: {
      useWorktree: false,
      requireReviewer: Math.random() < SPOT_CHECK_RATE,
      requireUserConfirmation: false,
      validationMode: "standard",
      spotCheck: true,
    },
    3: {
      useWorktree: false,
      requireReviewer: false,
      requireUserConfirmation: false,
      validationMode: "light",
      spotCheck: true,
    },
  };

  return levelDecisions[trust.level] ?? levelDecisions[0];
}

export function checkInactivity(trust: AgentTrust): AgentTrust {
  if (trust.level <= INACTIVITY_CAP_LEVEL) return trust;

  const lastActivity = new Date(trust.lastActivity);
  const now = new Date();
  const diffMs = now.getTime() - lastActivity.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays > INACTIVITY_DAYS) {
    const fromLevel = trust.level;
    trust.level = INACTIVITY_CAP_LEVEL as 0 | 1 | 2 | 3;
    trust.history.push({
      timestamp: new Date().toISOString(),
      action: "demoted",
      fromLevel,
      toLevel: trust.level,
      reason: `inactive for ${Math.floor(diffDays)} days, capped at level ${INACTIVITY_CAP_LEVEL}`,
    });
    trust.demotedAt = new Date().toISOString();
  }

  return trust;
}
