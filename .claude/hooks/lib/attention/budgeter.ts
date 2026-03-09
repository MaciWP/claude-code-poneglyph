import type { ScoredSection } from "./scorer";

export interface BudgetConfig {
  maxTokens: number;
  reserveTokens: number;
}

export interface BudgetResult {
  sections: ScoredSection[];
  totalTokens: number;
  tokensUsed: number;
  tokensRemaining: number;
  sectionsIncluded: number;
  sectionsDropped: number;
}

const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function applyBudget(
  scored: ScoredSection[],
  config: BudgetConfig,
): BudgetResult {
  const availableTokens = config.maxTokens - config.reserveTokens;
  const selected: ScoredSection[] = [];
  let tokensUsed = 0;
  let dropped = 0;

  for (const item of scored) {
    const sectionTokens = estimateTokens(
      `## ${item.section.heading}\n${item.section.content}`,
    );

    if (tokensUsed + sectionTokens <= availableTokens) {
      selected.push(item);
      tokensUsed += sectionTokens;
    } else {
      dropped++;
    }
  }

  return {
    sections: selected,
    totalTokens: config.maxTokens,
    tokensUsed,
    tokensRemaining: availableTokens - tokensUsed,
    sectionsIncluded: selected.length,
    sectionsDropped: dropped,
  };
}

export const AGENT_BUDGETS: Record<string, BudgetConfig> = {
  builder: { maxTokens: 8000, reserveTokens: 2000 },
  reviewer: { maxTokens: 6000, reserveTokens: 1500 },
  planner: { maxTokens: 4000, reserveTokens: 1000 },
  scout: { maxTokens: 3000, reserveTokens: 500 },
  "error-analyzer": { maxTokens: 5000, reserveTokens: 1500 },
  architect: { maxTokens: 8000, reserveTokens: 2000 },
  default: { maxTokens: 5000, reserveTokens: 1000 },
};

export function getBudgetForAgent(agentType: string): BudgetConfig {
  return AGENT_BUDGETS[agentType] || AGENT_BUDGETS.default;
}
