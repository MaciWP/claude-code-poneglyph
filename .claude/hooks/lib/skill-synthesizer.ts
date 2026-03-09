/**
 * Skill Synthesis pipeline (SPEC-014).
 * Thin orchestrator that coordinates content, gates, and I/O modules.
 */

import type { WorkflowPattern } from "./pattern-learning-types";
import type { SynthesisResult } from "./skill-synthesizer-types";
import {
  extractKeywords,
  generateSkillName,
  generateContent,
} from "./skill-synthesizer-content";
import { buildSkill } from "./skill-synthesizer-builders";
import {
  runQualityGates,
  calculateKeywordOverlap,
} from "./skill-synthesizer-gates";
import {
  writeDraft,
  loadExistingSkillKeywords,
  appendLog,
  loadSynthesisLog,
} from "./skill-synthesizer-io";

export type {
  SynthesizedSkill,
  SynthesisResult,
  QualityGateResult,
  SynthesisLog,
} from "./skill-synthesizer-types";

export {
  extractKeywords,
  generateSkillName,
  generateContent,
} from "./skill-synthesizer-content";

export { buildSkill } from "./skill-synthesizer-builders";

export {
  runQualityGates,
  calculateKeywordOverlap,
} from "./skill-synthesizer-gates";

export {
  writeDraft,
  loadExistingSkillKeywords,
  loadSynthesisLog,
} from "./skill-synthesizer-io";

const CONFIDENCE_THRESHOLD = 0.85;
const SAMPLE_SIZE_THRESHOLD = 20;

function nowIso(): string {
  return new Date().toISOString();
}

export function checkTrigger(pattern: WorkflowPattern): {
  triggered: boolean;
  reason: string;
} {
  if (pattern.confidence < CONFIDENCE_THRESHOLD) {
    const pct = (pattern.confidence * 100).toFixed(0);
    return {
      triggered: false,
      reason: `confidence ${pct}% below ${(CONFIDENCE_THRESHOLD * 100).toFixed(0)}% threshold`,
    };
  }
  if (pattern.sampleSize < SAMPLE_SIZE_THRESHOLD) {
    return {
      triggered: false,
      reason: `Only ${pattern.sampleSize} traces; need >${SAMPLE_SIZE_THRESHOLD}`,
    };
  }
  return { triggered: true, reason: "Pattern meets synthesis thresholds" };
}

function buildSkippedResult(
  name: string | null,
  reason: string,
): SynthesisResult {
  return {
    status: "skipped",
    skillName: name,
    reason,
    draftPath: null,
    gateResults: [],
  };
}

export function synthesizeSkill(pattern: WorkflowPattern): SynthesisResult {
  const trigger = checkTrigger(pattern);
  if (!trigger.triggered) {
    const result = buildSkippedResult(null, trigger.reason);
    appendLog({ timestamp: nowIso(), patternId: pattern.id, result });
    return result;
  }

  const name = generateSkillName(pattern);
  const keywords = extractKeywords(pattern);
  const content = generateContent(pattern);
  const skill = buildSkill(pattern, name, keywords, content);
  const existingKws = loadExistingSkillKeywords();
  const gateResults = runQualityGates(skill, existingKws);

  const failedGates = gateResults.filter((g) => !g.passed);
  if (failedGates.length > 0) {
    const reasons = failedGates.map((g) => `${g.gate}: ${g.detail}`);
    const result: SynthesisResult = {
      status: "skipped",
      skillName: name,
      reason: reasons.join("; "),
      draftPath: null,
      gateResults,
    };
    appendLog({ timestamp: nowIso(), patternId: pattern.id, result });
    return result;
  }

  const draftPath = writeDraft(skill);
  const result: SynthesisResult = {
    status: "created",
    skillName: name,
    reason: "All quality gates passed",
    draftPath,
    gateResults,
  };
  appendLog({ timestamp: nowIso(), patternId: pattern.id, result });
  return result;
}
