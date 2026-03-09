import type {
  OptimizationProposal,
  OptimizationMetrics,
  CollectedData,
} from "./types";

const MIN_PATTERN_SAMPLES = 2;
const SYNERGY_CONFIDENCE = 0.7;
const FAILURE_RATE_THRESHOLD = 0.6;
const SUCCESS_RATE_THRESHOLD = 0.8;
const PROMOTION_STUCK_SESSIONS = 20;
const DEMOTION_HIGH_RATE = 0.3;

function makeProposal(
  partial: Omit<OptimizationProposal, "id" | "timestamp">,
): OptimizationProposal {
  return {
    ...partial,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

export function analyzeSkillKeywords(
  _metrics: OptimizationMetrics,
  raw: CollectedData,
): OptimizationProposal[] {
  const proposals: OptimizationProposal[] = [];
  const patterns = raw.patterns;

  const skillCombos = patterns.filter(
    (p) => p.type === "skill_combo" && p.confidence >= SYNERGY_CONFIDENCE,
  );

  for (const combo of skillCombos) {
    const skills = combo.pattern.skills;
    if (!skills || skills.length < 2) continue;

    proposals.push(
      makeProposal({
        target: "skill-keywords",
        risk: "medium",
        description: `Add synergy pair: ${skills[0]} + ${skills[1]}`,
        rationale: `Pattern observed ${combo.sampleSize} times with ${(combo.confidence * 100).toFixed(0)}% confidence`,
        currentValue: { synergyPairs: "existing" },
        proposedValue: { newSynergy: [skills[0], skills[1]] },
        expectedImpact: "Better skill co-loading",
        requiresHumanApproval: true,
        confidence: combo.confidence,
      }),
    );
  }

  const lowConfidence = patterns.filter(
    (p) =>
      p.type === "skill_combo" &&
      p.confidence < 0.4 &&
      p.sampleSize >= MIN_PATTERN_SAMPLES,
  );

  for (const pattern of lowConfidence) {
    const skills = pattern.pattern.skills;
    if (!skills || skills.length === 0) continue;

    proposals.push(
      makeProposal({
        target: "skill-keywords",
        risk: "medium",
        description: `Review keywords for skill: ${skills[0]}`,
        rationale: `Skill loaded ${pattern.sampleSize} times but confidence only ${(pattern.confidence * 100).toFixed(0)}%`,
        currentValue: { skill: skills[0] },
        proposedValue: { action: "review-keywords" },
        expectedImpact: "Reduce unnecessary skill loading",
        requiresHumanApproval: true,
        confidence: 1 - pattern.confidence,
      }),
    );
  }

  return proposals;
}

export function analyzeAgentRouting(
  _metrics: OptimizationMetrics,
  raw: CollectedData,
): OptimizationProposal[] {
  const proposals: OptimizationProposal[] = [];
  const scores = raw.scores;

  if (scores.length === 0) return proposals;

  const failingAgents = scores.filter(
    (s) => s.successRate < FAILURE_RATE_THRESHOLD && s.sampleSize >= 5,
  );

  for (const agent of failingAgents) {
    proposals.push(
      makeProposal({
        target: "agent-routing",
        risk: "medium",
        description: `Review routing for ${agent.agent} on ${agent.taskType} tasks`,
        rationale: `Success rate ${(agent.successRate * 100).toFixed(0)}% across ${agent.sampleSize} sessions`,
        currentValue: { agent: agent.agent, taskType: agent.taskType },
        proposedValue: { action: "consider-alternative" },
        expectedImpact: "Improved task success rate",
        requiresHumanApproval: true,
        confidence: 1 - agent.successRate,
      }),
    );
  }

  const excellingAgents = scores.filter(
    (s) => s.successRate >= SUCCESS_RATE_THRESHOLD && s.sampleSize >= 10,
  );

  for (const agent of excellingAgents) {
    const trustMatch = raw.trustRecords.find(
      (t) => t.agent === agent.agent && t.level >= 2,
    );
    if (trustMatch) {
      proposals.push(
        makeProposal({
          target: "agent-routing",
          risk: "medium",
          description: `Expand routing for ${agent.agent} (high trust + high success)`,
          rationale: `Trust level ${trustMatch.level}, success rate ${(agent.successRate * 100).toFixed(0)}%`,
          currentValue: { agent: agent.agent, taskType: agent.taskType },
          proposedValue: { action: "expand-routing" },
          expectedImpact: "Better agent utilization",
          requiresHumanApproval: true,
          confidence: agent.successRate * 0.9,
        }),
      );
    }
  }

  return proposals;
}

export function analyzeTrustThresholds(
  _metrics: OptimizationMetrics,
  raw: CollectedData,
): OptimizationProposal[] {
  const proposals: OptimizationProposal[] = [];
  const trustRecords = raw.trustRecords;

  if (trustRecords.length === 0) return proposals;

  const stuckAgents = trustRecords.filter(
    (t) => t.level === 0 && t.totalSessions >= PROMOTION_STUCK_SESSIONS,
  );

  if (stuckAgents.length >= 2) {
    proposals.push(
      makeProposal({
        target: "trust-thresholds",
        risk: "high",
        description: "Lower Level 1 promotion threshold",
        rationale: `${stuckAgents.length} agents stuck at Level 0 after ${PROMOTION_STUCK_SESSIONS}+ sessions`,
        currentValue: { level1: 60 },
        proposedValue: { level1: 55 },
        expectedImpact: "Allow deserving agents to promote",
        requiresHumanApproval: true,
        confidence: Math.min(stuckAgents.length / 5, 1),
      }),
    );
  }

  const demotedRecently = trustRecords.filter(
    (t) => t.demotedAt && t.history.some((h) => h.action === "demoted"),
  );

  const demotionRate =
    trustRecords.length > 0 ? demotedRecently.length / trustRecords.length : 0;

  if (demotionRate > DEMOTION_HIGH_RATE) {
    proposals.push(
      makeProposal({
        target: "trust-thresholds",
        risk: "high",
        description: "Raise demotion score thresholds",
        rationale: `Demotion rate ${(demotionRate * 100).toFixed(0)}% exceeds ${DEMOTION_HIGH_RATE * 100}% threshold`,
        currentValue: { demotionRate },
        proposedValue: { action: "raise-demotion-thresholds" },
        expectedImpact: "More stable trust levels",
        requiresHumanApproval: true,
        confidence: demotionRate,
      }),
    );
  }

  return proposals;
}
