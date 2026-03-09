import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import { join } from "path";
import { homedir } from "os";

import type { AgentTrust } from "./agent-trust-types";
import { TRUST_FILE, buildDefaultTrust } from "./agent-trust-types";
import {
  applySuccess,
  applyFailure,
  checkPromotion,
  checkScoreThreshold,
} from "./agent-trust-rules";

export type {
  AgentTrust,
  TrustEvent,
  OversightDecision,
  FailureClassification,
  PromotionResult,
} from "./agent-trust-types";

export {
  classifyFailure,
  checkPromotion,
  demote,
  determineOversight,
  checkInactivity,
} from "./agent-trust-rules";

export let trustFilePath = join(homedir(), ".claude", TRUST_FILE);

export function setTrustFilePath(path: string): void {
  trustFilePath = path;
}

export function resetTrustFilePath(): void {
  trustFilePath = join(homedir(), ".claude", TRUST_FILE);
}

export function loadTrust(): AgentTrust[] {
  try {
    if (!existsSync(trustFilePath)) return [];
    const content = readFileSync(trustFilePath, "utf-8");
    const records: AgentTrust[] = [];

    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      try {
        records.push(JSON.parse(line) as AgentTrust);
      } catch {
        continue;
      }
    }

    return records;
  } catch {
    return [];
  }
}

export function saveTrust(trusts: AgentTrust[]): void {
  try {
    mkdirSync(dirname(trustFilePath), { recursive: true });
    const content = trusts.map((t) => JSON.stringify(t)).join("\n") + "\n";
    writeFileSync(trustFilePath, content);
  } catch {
    // best effort
  }
}

export function getTrust(agent: string, taskType: string): AgentTrust | null {
  const trusts = loadTrust();
  return (
    trusts.find((t) => t.agent === agent && t.taskType === taskType) ?? null
  );
}

export function updateAfterSession(
  agent: string,
  taskType: string,
  success: boolean,
  severity?: "minor" | "major" | "critical",
): AgentTrust {
  const trusts = loadTrust();
  let trust = trusts.find((t) => t.agent === agent && t.taskType === taskType);

  if (!trust) {
    trust = buildDefaultTrust(agent, taskType);
    trusts.push(trust);
  }

  trust.totalSessions += 1;
  trust.lastActivity = new Date().toISOString();

  if (success) {
    applySuccess(trust);
    const promotion = checkPromotion(trust);
    if (promotion.shouldPromote) {
      const fromLevel = trust.level;
      trust.level = promotion.newLevel;
      trust.promotedAt = new Date().toISOString();
      trust.history.push({
        timestamp: new Date().toISOString(),
        action: "promoted",
        fromLevel,
        toLevel: promotion.newLevel,
        reason: promotion.reason,
      });
    }
  } else {
    applyFailure(trust, severity ?? "major");
    checkScoreThreshold(trust);
  }

  saveTrust(trusts);
  return trust;
}
