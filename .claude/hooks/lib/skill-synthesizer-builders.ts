/**
 * Content section builders for skill synthesis (SPEC-014).
 * Generates pattern, convention, anti-pattern, and example lines from WorkflowPattern.
 */

import type { WorkflowPattern } from "./pattern-learning-types";
import type { SynthesizedSkill } from "./skill-synthesizer-types";

function getAgents(pattern: WorkflowPattern): string[] {
  return pattern.pattern.agents || [];
}

function getSkills(pattern: WorkflowPattern): string[] {
  return pattern.pattern.skills || [];
}

function getTaskType(pattern: WorkflowPattern): string {
  return pattern.pattern.taskType || pattern.type;
}

function pct(value: number): string {
  return (value * 100).toFixed(0);
}

export function buildPatternLines(pattern: WorkflowPattern): string[] {
  const agents = getAgents(pattern);
  const skills = getSkills(pattern);
  const taskType = getTaskType(pattern);
  const lines: string[] = [];

  if (agents.length > 0) lines.push(`Agent sequence: ${agents.join(" -> ")}`);
  if (skills.length > 0) lines.push(`Skill combination: ${skills.join(", ")}`);

  lines.push(
    `Pattern type: ${taskType} with ${pct(pattern.outcome.successRate)}% success rate`,
  );
  lines.push(
    `Average cost: $${pattern.outcome.avgCost.toFixed(4)} | Average duration: ${pattern.outcome.avgDuration}ms`,
  );
  return lines;
}

export function buildConventionLines(pattern: WorkflowPattern): string[] {
  const agents = getAgents(pattern);
  const skills = getSkills(pattern);
  const taskType = getTaskType(pattern);
  const lines: string[] = [];

  lines.push(`Use this pattern for ${taskType} tasks with similar complexity`);
  if (agents.length > 1)
    lines.push(`Execute agents in order: ${agents.join(", ")}`);
  if (skills.length > 0)
    lines.push(`Load skills before delegation: ${skills.join(", ")}`);
  lines.push(
    `Confidence: ${pct(pattern.confidence)}% over ${pattern.sampleSize} traces`,
  );
  return lines;
}

export function buildAntiPatternLines(pattern: WorkflowPattern): string[] {
  const lines: string[] = [];
  if (pattern.outcome.successRate < 1) {
    const failRate = pct(1 - pattern.outcome.successRate);
    lines.push(
      `${failRate}% failure rate observed; verify preconditions before applying`,
    );
  }
  if (pattern.outcome.avgRetries > 0) {
    lines.push(
      `Average ${pattern.outcome.avgRetries} retries needed; consider error handling`,
    );
  }
  if (pattern.pattern.recoverySteps) {
    lines.push("Without recovery steps, failure rate increases significantly");
  }
  return lines;
}

export function buildExampleLines(pattern: WorkflowPattern): string[] {
  return [
    `First observed: ${pattern.firstSeen}`,
    `Last observed: ${pattern.lastSeen}`,
    `Sample size: ${pattern.sampleSize} traces`,
  ];
}

export function buildSkill(
  pattern: WorkflowPattern,
  name: string,
  keywords: string[],
  content: SynthesizedSkill["content"],
): SynthesizedSkill {
  const desc = content.patterns.length > 0 ? content.patterns[0] : "";
  return {
    name,
    description: `Auto-synthesized skill from ${pattern.type} pattern. ${desc}`,
    triggers: keywords,
    content,
    source: {
      patternId: pattern.id,
      traceCount: pattern.sampleSize,
      confidence: pattern.confidence,
    },
    version: 1,
  };
}
