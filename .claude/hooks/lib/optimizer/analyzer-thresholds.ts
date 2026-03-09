import type {
  OptimizationProposal,
  OptimizationMetrics,
  CollectedData,
} from "./types";

const COMPLEXITY_HIGH = 60;
const COMPLEXITY_LOW = 30;
const SUCCESS_THRESHOLD = 0.85;
const FAILURE_THRESHOLD = 0.4;
const THRESHOLD_STEP = 5;
const MIN_SAMPLES = 3;
const BUDGET_OVER_THRESHOLD = 0.25;
const BUDGET_STEP = 5;

function makeProposal(
  partial: Omit<OptimizationProposal, "id" | "timestamp">,
): OptimizationProposal {
  return {
    ...partial,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

export function analyzeComplexityThresholds(
  _metrics: OptimizationMetrics,
  raw: CollectedData,
): OptimizationProposal[] {
  const proposals: OptimizationProposal[] = [];
  const scores = raw.scores;

  if (scores.length < MIN_SAMPLES) return proposals;

  const highPerformers = scores.filter(
    (s) =>
      s.compositeScore >= COMPLEXITY_HIGH && s.successRate >= SUCCESS_THRESHOLD,
  );

  if (highPerformers.length >= MIN_SAMPLES) {
    proposals.push(
      makeProposal({
        target: "complexity-thresholds",
        risk: "low",
        description: `Raise high complexity threshold from ${COMPLEXITY_HIGH} to ${COMPLEXITY_HIGH + THRESHOLD_STEP}`,
        rationale: `${highPerformers.length} agents succeed at tasks scored >=${COMPLEXITY_HIGH} with >=${SUCCESS_THRESHOLD * 100}% success rate`,
        currentValue: { high: COMPLEXITY_HIGH },
        proposedValue: { high: COMPLEXITY_HIGH + THRESHOLD_STEP },
        expectedImpact: "Fewer tasks require planner, faster execution",
        requiresHumanApproval: false,
        confidence: Math.min(highPerformers.length / 10, 1),
      }),
    );
  }

  const lowPerformers = scores.filter(
    (s) =>
      s.compositeScore < COMPLEXITY_LOW && s.successRate < FAILURE_THRESHOLD,
  );

  if (lowPerformers.length >= MIN_SAMPLES) {
    proposals.push(
      makeProposal({
        target: "complexity-thresholds",
        risk: "low",
        description: `Lower low complexity threshold from ${COMPLEXITY_LOW} to ${COMPLEXITY_LOW - THRESHOLD_STEP}`,
        rationale: `${lowPerformers.length} agents fail at tasks scored <${COMPLEXITY_LOW} with <${FAILURE_THRESHOLD * 100}% success rate`,
        currentValue: { low: COMPLEXITY_LOW },
        proposedValue: { low: COMPLEXITY_LOW - THRESHOLD_STEP },
        expectedImpact: "More tasks get planner support",
        requiresHumanApproval: false,
        confidence: Math.min(lowPerformers.length / 10, 1),
      }),
    );
  }

  return proposals;
}

export function analyzeTokenBudgets(
  metrics: OptimizationMetrics,
  _raw: CollectedData,
): OptimizationProposal[] {
  const proposals: OptimizationProposal[] = [];
  const currentBudgets = {
    exploration: 20,
    implementation: 60,
    verification: 20,
  };

  if (metrics.agentSuccessRate > BUDGET_OVER_THRESHOLD) {
    const newExploration = currentBudgets.exploration + BUDGET_STEP;
    const newVerification = currentBudgets.verification - BUDGET_STEP;

    if (newVerification >= 10) {
      proposals.push(
        makeProposal({
          target: "token-budgets",
          risk: "low",
          description: `Increase exploration budget from ${currentBudgets.exploration}% to ${newExploration}%`,
          rationale: `Agent success rate (${(metrics.agentSuccessRate * 100).toFixed(1)}%) suggests exploration can be expanded`,
          currentValue: currentBudgets,
          proposedValue: {
            exploration: newExploration,
            implementation: currentBudgets.implementation,
            verification: newVerification,
          },
          expectedImpact: "Better context gathering, maintained verification",
          requiresHumanApproval: false,
          confidence: 0.6,
        }),
      );
    }
  }

  return proposals;
}

export function analyzeErrorRecoveryBudgets(
  _metrics: OptimizationMetrics,
  raw: CollectedData,
): OptimizationProposal[] {
  const proposals: OptimizationProposal[] = [];
  const errorPatterns = raw.errorPatterns;

  if (errorPatterns.length === 0) return proposals;

  const defaultBudgets: Record<string, number> = {
    TestFailure: 2,
    EditConflict: 1,
    ModuleNotFound: 1,
    CompilationError: 2,
  };

  for (const pattern of errorPatterns) {
    const budget = defaultBudgets[pattern.category] ?? 2;
    const fixes = pattern.fixes;

    if (fixes.length < 3) continue;

    const laterFixes = fixes.slice(budget);
    const laterSuccesses = laterFixes.filter((f) => f.succeeded).length;

    if (laterFixes.length > 0 && laterSuccesses / laterFixes.length > 0.5) {
      proposals.push(
        makeProposal({
          target: "error-recovery-retry",
          risk: "low",
          description: `Increase retry budget for ${pattern.category} from ${budget} to ${budget + 1}`,
          rationale: `${laterSuccesses}/${laterFixes.length} fixes after attempt ${budget} succeed for ${pattern.category}`,
          currentValue: { [pattern.category]: budget },
          proposedValue: { [pattern.category]: budget + 1 },
          expectedImpact: "Higher error recovery rate",
          requiresHumanApproval: false,
          confidence: laterSuccesses / laterFixes.length,
        }),
      );
    }

    const earlyFixes = fixes.slice(0, budget);
    const earlySuccesses = earlyFixes.filter((f) => f.succeeded).length;
    if (
      budget > 1 &&
      earlyFixes.length >= 3 &&
      earlySuccesses / earlyFixes.length < 0.2
    ) {
      proposals.push(
        makeProposal({
          target: "error-recovery-retry",
          risk: "low",
          description: `Decrease retry budget for ${pattern.category} from ${budget} to ${budget - 1}`,
          rationale: `Only ${earlySuccesses}/${earlyFixes.length} retries succeed for ${pattern.category}`,
          currentValue: { [pattern.category]: budget },
          proposedValue: { [pattern.category]: budget - 1 },
          expectedImpact: "Faster escalation, less wasted retries",
          requiresHumanApproval: false,
          confidence: 1 - earlySuccesses / earlyFixes.length,
        }),
      );
    }
  }

  return proposals;
}
