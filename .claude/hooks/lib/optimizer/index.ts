import { collectData } from "./monitor";
import { generateProposals } from "./proposer";
import {
  applyProposal,
  saveSnapshot,
  loadSnapshots,
  detectDegradation,
} from "./executor";
import type { OptimizationSnapshot } from "./types";

export async function optimize(): Promise<OptimizationSnapshot> {
  const { raw, ...metrics } = await collectData();

  const proposals = generateProposals(metrics, raw);

  const applied: string[] = [];
  for (const proposal of proposals) {
    if (!proposal.requiresHumanApproval) {
      const result = applyProposal(proposal);
      if (result.success) applied.push(proposal.id);
    }
  }

  const snapshot: OptimizationSnapshot = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    proposals,
    applied,
    rolledBack: [],
    metrics,
  };

  saveSnapshot(snapshot);

  const history = loadSnapshots();
  if (history.length > 1) {
    const previous = history[history.length - 2];
    if (detectDegradation(previous.metrics, metrics)) {
      snapshot.rolledBack = [...applied];
    }
  }

  return snapshot;
}

export * from "./types";
export { collectData } from "./monitor";
export { generateProposals, classifyRisk, formatRationale } from "./proposer";
export {
  applyProposal,
  rollback,
  saveSnapshot,
  loadSnapshots,
  detectDegradation,
} from "./executor";
export {
  analyzeComplexityThresholds,
  analyzeTokenBudgets,
  analyzeErrorRecoveryBudgets,
} from "./analyzer-thresholds";
export {
  analyzeSkillKeywords,
  analyzeAgentRouting,
  analyzeTrustThresholds,
} from "./analyzer-routing";
