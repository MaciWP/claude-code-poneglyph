import { getBudgetForAgent, estimateTokens, type BudgetConfig } from "./budgeter";

export interface AgentBudgetReport {
  agent: string;
  tokensEstimated: number;
  budget: BudgetConfig;
  utilizationPct: number;
  overBudget: boolean;
}

export interface BudgetReport {
  sessionId: string;
  agentReports: AgentBudgetReport[];
  totalTokensEstimated: number;
  timestamp: string;
}

export function generateBudgetReport(
  sessionId: string,
  agentUsages: Array<{ agent: string; contextSize: number }>,
): BudgetReport {
  const agentReports = agentUsages.map(({ agent, contextSize }) => {
    const budget = getBudgetForAgent(agent);
    const tokensEstimated = estimateTokens("x".repeat(contextSize));
    const utilizationPct = Math.round(
      (tokensEstimated / budget.maxTokens) * 100,
    );
    return {
      agent,
      tokensEstimated,
      budget,
      utilizationPct,
      overBudget: tokensEstimated > budget.maxTokens,
    };
  });

  return {
    sessionId,
    agentReports,
    totalTokensEstimated: agentReports.reduce(
      (sum, r) => sum + r.tokensEstimated,
      0,
    ),
    timestamp: new Date().toISOString(),
  };
}

export function formatBudgetReport(report: BudgetReport): string {
  if (report.agentReports.length === 0) return "budget: no agent data";
  const parts = report.agentReports.map(
    (r) =>
      `${r.agent} ${r.tokensEstimated}/${r.budget.maxTokens} (${r.utilizationPct}%)${r.overBudget ? " OVER" : ""}`,
  );
  return `budget: ${parts.join(", ")}`;
}
