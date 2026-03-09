import type {
  OptimizationProposal,
  OptimizationMetrics,
  OptimizationTarget,
  RiskLevel,
  CollectedData,
} from "./types";
import {
  analyzeComplexityThresholds,
  analyzeTokenBudgets,
  analyzeErrorRecoveryBudgets,
} from "./analyzer-thresholds";
import {
  analyzeSkillKeywords,
  analyzeAgentRouting,
  analyzeTrustThresholds,
} from "./analyzer-routing";

const RISK_MAP: Record<OptimizationTarget, RiskLevel> = {
  "complexity-thresholds": "low",
  "skill-keywords": "medium",
  "agent-routing": "medium",
  "token-budgets": "low",
  "trust-thresholds": "high",
  "error-recovery-retry": "low",
};

export function classifyRisk(target: OptimizationTarget): RiskLevel {
  return RISK_MAP[target];
}

function deduplicateProposals(
  proposals: OptimizationProposal[],
): OptimizationProposal[] {
  const seen = new Set<string>();
  const result: OptimizationProposal[] = [];

  for (const proposal of proposals) {
    const key = `${proposal.target}:${proposal.description}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(proposal);
  }

  return result;
}

export function formatRationale(proposal: OptimizationProposal): string {
  const lines: string[] = [
    `[${proposal.risk.toUpperCase()} RISK] ${proposal.description}`,
    `Rationale: ${proposal.rationale}`,
    `Current: ${JSON.stringify(proposal.currentValue)}`,
    `Proposed: ${JSON.stringify(proposal.proposedValue)}`,
    `Expected impact: ${proposal.expectedImpact}`,
    `Confidence: ${(proposal.confidence * 100).toFixed(0)}%`,
  ];

  if (proposal.requiresHumanApproval) {
    lines.push("** Requires human approval **");
  }

  return lines.join("\n");
}

export function generateProposals(
  metrics: OptimizationMetrics,
  raw: CollectedData,
): OptimizationProposal[] {
  const allProposals: OptimizationProposal[] = [
    ...analyzeComplexityThresholds(metrics, raw),
    ...analyzeSkillKeywords(metrics, raw),
    ...analyzeAgentRouting(metrics, raw),
    ...analyzeTokenBudgets(metrics, raw),
    ...analyzeTrustThresholds(metrics, raw),
    ...analyzeErrorRecoveryBudgets(metrics, raw),
  ];

  for (const proposal of allProposals) {
    proposal.risk = classifyRisk(proposal.target);
    proposal.requiresHumanApproval = proposal.risk !== "low";
  }

  const deduplicated = deduplicateProposals(allProposals);
  deduplicated.sort((a, b) => b.confidence - a.confidence);

  return deduplicated;
}
