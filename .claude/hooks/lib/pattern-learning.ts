/**
 * Main orchestrator for pattern learning (SPEC-011).
 * Loads traces, runs miners, filters results, persists to JSONL.
 */

import { homedir } from "os";
import { join } from "path";
import { mkdirSync } from "fs";
import type { WorkflowPattern, MiningConfig } from "./pattern-learning-types";
import { DEFAULT_CONFIG } from "./pattern-learning-types";
import { loadTraces } from "./trace-analytics";
import {
  mineAgentSequences,
  mineSkillCombinations,
  mineDecompositionPatterns,
} from "./pattern-learning-miners";
import { mineRecoveryPatterns } from "./pattern-learning-recovery";

export type { WorkflowPattern, MiningConfig } from "./pattern-learning-types";
export { DEFAULT_CONFIG } from "./pattern-learning-types";

function getPatternsPath(): string {
  return join(homedir(), ".claude", "patterns.jsonl");
}

export async function loadPatterns(): Promise<WorkflowPattern[]> {
  try {
    const file = Bun.file(getPatternsPath());
    if (!(await file.exists())) return [];

    const content = await file.text();
    const patterns: WorkflowPattern[] = [];

    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      try {
        patterns.push(JSON.parse(line) as WorkflowPattern);
      } catch {
        continue;
      }
    }

    return patterns;
  } catch {
    return [];
  }
}

export async function savePatterns(patterns: WorkflowPattern[]): Promise<void> {
  const dir = join(homedir(), ".claude");
  mkdirSync(dir, { recursive: true });
  const content = patterns.map((p) => JSON.stringify(p)).join("\n") + "\n";
  await Bun.write(getPatternsPath(), content);
}

function filterByQuality(
  patterns: WorkflowPattern[],
  config: MiningConfig,
): WorkflowPattern[] {
  return patterns.filter(
    (p) => p.confidence >= config.minConfidence && p.effectSize > 0,
  );
}

function sortAndCap(
  patterns: WorkflowPattern[],
  maxPatterns: number,
): WorkflowPattern[] {
  const sorted = patterns.sort((a, b) => b.confidence - a.confidence);
  return sorted.slice(0, maxPatterns);
}

export async function minePatterns(
  config?: Partial<MiningConfig>,
): Promise<WorkflowPattern[]> {
  const cfg: MiningConfig = { ...DEFAULT_CONFIG, ...config };

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - cfg.timeWindowDays);
  const traces = await loadTraces({ from: fromDate });

  if (traces.length < 20) return [];

  const sequences = mineAgentSequences(traces, cfg.minSupport);
  const combos = mineSkillCombinations(traces, cfg.minSupport);
  const decomp = mineDecompositionPatterns(traces);
  const recovery = mineRecoveryPatterns(traces, []);

  const allPatterns = [...sequences, ...combos, ...decomp, ...recovery];
  const filtered = filterByQuality(allPatterns, cfg);
  const capped = sortAndCap(filtered, cfg.maxPatterns);

  await savePatterns(capped);
  return capped;
}
