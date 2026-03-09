/**
 * Quality gates for skill synthesis (SPEC-014).
 * Each gate validates one aspect of a synthesized skill.
 */

import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type {
  SynthesizedSkill,
  QualityGateResult,
} from "./skill-synthesizer-types";

const CONFIDENCE_THRESHOLD = 0.85;
const SAMPLE_SIZE_THRESHOLD = 20;
const MIN_CONTENT_LENGTH = 500;
const MAX_KEYWORD_OVERLAP = 0.5;

export function calculateKeywordOverlap(
  newKeywords: string[],
  existingKeywords: string[],
): number {
  const setA = new Set(newKeywords.map((k) => k.toLowerCase()));
  const setB = new Set(existingKeywords.map((k) => k.toLowerCase()));

  const unionSize = new Set([...setA, ...setB]).size;
  if (unionSize === 0) return 0;

  let intersection = 0;
  for (const k of setA) {
    if (setB.has(k)) intersection++;
  }

  return intersection / unionSize;
}

function checkFormatGate(skill: SynthesizedSkill): QualityGateResult {
  const hasRequired =
    skill.name.length > 0 &&
    skill.description.length > 0 &&
    skill.triggers.length > 0 &&
    (skill.content.patterns.length > 0 || skill.content.conventions.length > 0);

  return {
    gate: "format",
    passed: hasRequired,
    detail: hasRequired
      ? "All required fields present"
      : "Missing required fields",
  };
}

function checkUniquenessGate(
  skill: SynthesizedSkill,
  existingKeywords: string[][],
): QualityGateResult {
  for (const existing of existingKeywords) {
    const overlap = calculateKeywordOverlap(skill.triggers, existing);
    if (overlap >= MAX_KEYWORD_OVERLAP) {
      return {
        gate: "uniqueness",
        passed: false,
        detail: `Keyword overlap ${(overlap * 100).toFixed(0)}% >= ${(MAX_KEYWORD_OVERLAP * 100).toFixed(0)}% threshold`,
      };
    }
  }
  return {
    gate: "uniqueness",
    passed: true,
    detail: "Keywords sufficiently unique",
  };
}

function checkConfidenceGate(skill: SynthesizedSkill): QualityGateResult {
  const passed = skill.source.confidence >= CONFIDENCE_THRESHOLD;
  const pct = (skill.source.confidence * 100).toFixed(0);
  return {
    gate: "confidence",
    passed,
    detail: passed
      ? `Confidence ${pct}% meets threshold`
      : `Confidence ${pct}% below ${(CONFIDENCE_THRESHOLD * 100).toFixed(0)}% threshold`,
  };
}

function checkSampleSizeGate(skill: SynthesizedSkill): QualityGateResult {
  const passed = skill.source.traceCount > SAMPLE_SIZE_THRESHOLD;
  return {
    gate: "sample_size",
    passed,
    detail: passed
      ? `${skill.source.traceCount} traces exceeds minimum`
      : `Only ${skill.source.traceCount} traces; need >${SAMPLE_SIZE_THRESHOLD}`,
  };
}

function checkContentQualityGate(skill: SynthesizedSkill): QualityGateResult {
  const totalLength = [
    ...skill.content.patterns,
    ...skill.content.conventions,
    ...skill.content.antiPatterns,
    ...skill.content.examples,
  ].join("\n").length;

  const passed = totalLength >= MIN_CONTENT_LENGTH;
  return {
    gate: "content_quality",
    passed,
    detail: passed
      ? `Content length ${totalLength} chars meets minimum`
      : `Content too thin (${totalLength} chars); need >${MIN_CONTENT_LENGTH}`,
  };
}

function checkNameUniquenessGate(skill: SynthesizedSkill): QualityGateResult {
  const skillsDir = join(homedir(), ".claude", "skills");
  const draftDir = join(homedir(), ".claude", "skills-draft");
  const skillPath = join(skillsDir, skill.name, "SKILL.md");
  const draftPath = join(draftDir, skill.name, "SKILL.md");
  const exists = existsSync(skillPath) || existsSync(draftPath);
  return {
    gate: "name_uniqueness",
    passed: !exists,
    detail: exists ? `Skill "${skill.name}" already exists` : "Name is unique",
  };
}

export function runQualityGates(
  skill: SynthesizedSkill,
  existingKeywords: string[][],
): QualityGateResult[] {
  return [
    checkFormatGate(skill),
    checkUniquenessGate(skill, existingKeywords),
    checkConfidenceGate(skill),
    checkSampleSizeGate(skill),
    checkContentQualityGate(skill),
    checkNameUniquenessGate(skill),
  ];
}
