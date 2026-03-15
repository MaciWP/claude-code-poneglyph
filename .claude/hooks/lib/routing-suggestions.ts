import type { WorkflowPattern } from "./pattern-learning-types";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";

export interface RoutingSuggestion {
  type: "agent_sequence" | "skill_combo" | "complexity_routing";
  description: string;
  confidence: number;
  sampleSize: number;
  pattern: {
    agents?: string[];
    skills?: string[];
    complexityRange?: [number, number];
  };
  outcome: {
    successRate: number;
    avgCost: number;
  };
}

interface RoutingSuggestionsFile {
  generatedAt: string;
  suggestions: RoutingSuggestion[];
}

const DEFAULT_SUGGESTIONS_PATH = join(
  homedir(),
  ".claude",
  "routing-suggestions.json",
);

let suggestionsPath = DEFAULT_SUGGESTIONS_PATH;

export function setSuggestionsPath(path: string): void {
  suggestionsPath = path;
}

export function resetSuggestionsPath(): void {
  suggestionsPath = DEFAULT_SUGGESTIONS_PATH;
}

export function generateSuggestions(
  patterns: WorkflowPattern[],
): RoutingSuggestion[] {
  const suggestions: RoutingSuggestion[] = [];

  for (const p of patterns) {
    if (
      p.type === "sequence" &&
      p.confidence >= 0.8 &&
      p.pattern.agents &&
      p.pattern.agents.length >= 2
    ) {
      suggestions.push({
        type: "agent_sequence",
        description: `Secuencia ${p.pattern.agents.join(" -> ")} tiene ${Math.round(p.outcome.successRate * 100)}% success rate`,
        confidence: p.confidence,
        sampleSize: p.sampleSize,
        pattern: { agents: p.pattern.agents },
        outcome: {
          successRate: p.outcome.successRate,
          avgCost: p.outcome.avgCost,
        },
      });
    }

    if (
      p.type === "skill_combo" &&
      p.confidence >= 0.7 &&
      p.pattern.skills &&
      p.pattern.skills.length >= 2
    ) {
      suggestions.push({
        type: "skill_combo",
        description: `Skills [${p.pattern.skills.join(", ")}] juntas tienen ${Math.round(p.outcome.successRate * 100)}% success rate`,
        confidence: p.confidence,
        sampleSize: p.sampleSize,
        pattern: { skills: p.pattern.skills },
        outcome: {
          successRate: p.outcome.successRate,
          avgCost: p.outcome.avgCost,
        },
      });
    }

    if (
      p.type === "decomposition" &&
      p.confidence >= 0.7 &&
      p.pattern.complexityRange
    ) {
      suggestions.push({
        type: "complexity_routing",
        description: `Complejidad [${p.pattern.complexityRange[0]}-${p.pattern.complexityRange[1]}]: ${p.pattern.taskType || "general"} con ${Math.round(p.outcome.successRate * 100)}% success`,
        confidence: p.confidence,
        sampleSize: p.sampleSize,
        pattern: { complexityRange: p.pattern.complexityRange },
        outcome: {
          successRate: p.outcome.successRate,
          avgCost: p.outcome.avgCost,
        },
      });
    }
  }

  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);
}

export function saveSuggestions(suggestions: RoutingSuggestion[]): void {
  const data: RoutingSuggestionsFile = {
    generatedAt: new Date().toISOString(),
    suggestions,
  };
  const dir = dirname(suggestionsPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(suggestionsPath, JSON.stringify(data, null, 2));
}

export function loadSuggestions(): RoutingSuggestion[] {
  if (!existsSync(suggestionsPath)) return [];
  try {
    const raw = readFileSync(suggestionsPath, "utf-8");
    const data: RoutingSuggestionsFile = JSON.parse(raw);
    return data.suggestions || [];
  } catch {
    return [];
  }
}

export function formatSuggestionsForContext(
  suggestions: RoutingSuggestion[],
): string {
  if (suggestions.length === 0) return "";
  const lines = ["## Routing Suggestions (from pattern learning)", ""];
  for (const s of suggestions) {
    lines.push(
      `- **${s.type}** (confidence: ${Math.round(s.confidence * 100)}%, n=${s.sampleSize}): ${s.description}`,
    );
  }
  return lines.join("\n");
}
