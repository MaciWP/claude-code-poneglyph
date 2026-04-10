/**
 * Mining function for spawn success patterns.
 *
 * Joins agent spawn records (captured by the SubagentStart hook) with
 * per-session outcome records to compute success rate per
 * (agentType, skillCombo, expertiseBucket).
 */

export type ExpertiseBucket = "none" | "small" | "medium" | "large";

export interface SpawnRecord {
  sessionId: string;
  agentType: string;
  expertiseBytes: number;
  skillsInjected: string[];
  effort?: "high" | "medium" | "low" | null;
}

export interface SpawnScoreRecord {
  sessionId: string;
  agentType: string;
  success: boolean;
}

export interface SpawnSuccessPattern {
  agentType: string;
  skillCombo: string[];
  expertiseBucket: ExpertiseBucket;
  successRate: number;
  sampleSize: number;
}

export function toExpertiseBucket(bytes: number): ExpertiseBucket {
  if (bytes <= 0) return "none";
  if (bytes <= 1000) return "small";
  if (bytes <= 5000) return "medium";
  return "large";
}

function comboKey(
  agentType: string,
  skills: string[],
  bucket: ExpertiseBucket,
): string {
  const sortedSkills = skills.slice().sort().join("|");
  return `${agentType}::${sortedSkills}::${bucket}`;
}

interface Bucket {
  agentType: string;
  skillCombo: string[];
  expertiseBucket: ExpertiseBucket;
  total: number;
  successes: number;
}

function buildScoreIndex(
  scores: SpawnScoreRecord[],
): Map<string, SpawnScoreRecord> {
  const index = new Map<string, SpawnScoreRecord>();
  for (const s of scores) {
    index.set(`${s.sessionId}::${s.agentType}`, s);
  }
  return index;
}

function getOrCreateBucket(
  map: Map<string, Bucket>,
  key: string,
  spawn: SpawnRecord,
  bucket: ExpertiseBucket,
): Bucket {
  const existing = map.get(key);
  if (existing) return existing;
  const created: Bucket = {
    agentType: spawn.agentType,
    skillCombo: spawn.skillsInjected.slice().sort(),
    expertiseBucket: bucket,
    total: 0,
    successes: 0,
  };
  map.set(key, created);
  return created;
}

export function mineSpawnSuccessPatterns(
  spawns: SpawnRecord[],
  scores: SpawnScoreRecord[],
  minSupport: number = 3,
): SpawnSuccessPattern[] {
  const scoreIndex = buildScoreIndex(scores);
  const buckets = new Map<string, Bucket>();

  for (const spawn of spawns) {
    const score = scoreIndex.get(`${spawn.sessionId}::${spawn.agentType}`);
    if (!score) continue;
    const bucket = toExpertiseBucket(spawn.expertiseBytes);
    const key = comboKey(spawn.agentType, spawn.skillsInjected, bucket);
    const entry = getOrCreateBucket(buckets, key, spawn, bucket);
    entry.total++;
    if (score.success) entry.successes++;
  }

  const patterns: SpawnSuccessPattern[] = [];
  for (const entry of buckets.values()) {
    if (entry.total < minSupport) continue;
    patterns.push({
      agentType: entry.agentType,
      skillCombo: entry.skillCombo,
      expertiseBucket: entry.expertiseBucket,
      successRate: entry.successes / entry.total,
      sampleSize: entry.total,
    });
  }
  return patterns;
}
