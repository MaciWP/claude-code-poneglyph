import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface BudgetConfig {
  daily: number;
  weekly: number;
  alertAt: number;
  enabled: boolean;
}

export interface BudgetStatus {
  dailyCost: number;
  weeklyCost: number;
  dailyLimit: number;
  weeklyLimit: number;
  dailyPercent: number;
  weeklyPercent: number;
  alerts: string[];
}

const DEFAULTS: BudgetConfig = {
  daily: 20.0,
  weekly: 100.0,
  alertAt: 0.8,
  enabled: true,
};

export function loadBudgetConfig(): BudgetConfig {
  try {
    const configPath = join(homedir(), ".claude", "config", "cost-budget.json");
    if (!existsSync(configPath)) return { ...DEFAULTS };
    const raw = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function getWeekStartStr(today: Date): string {
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - mondayOffset);
  return weekStart.toISOString().slice(0, 10);
}

function sumCostsFromTraces(
  tracesDir: string,
  todayStr: string,
  weekStartStr: string,
): { dailyCost: number; weeklyCost: number } {
  let dailyCost = 0;
  let weeklyCost = 0;

  if (!existsSync(tracesDir)) return { dailyCost, weeklyCost };

  const files = readdirSync(tracesDir).filter((f: string) =>
    f.endsWith(".jsonl"),
  );

  for (const file of files) {
    const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) continue;
    const fileDate = dateMatch[1];

    if (fileDate < weekStartStr) continue;

    const content = readFileSync(join(tracesDir, file), "utf-8");
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        const cost = entry.costUsd ?? 0;
        if (fileDate === todayStr) dailyCost += cost;
        weeklyCost += cost;
      } catch {
        /* skip malformed lines */
      }
    }
  }

  return { dailyCost, weeklyCost };
}

function buildAlerts(
  config: BudgetConfig,
  dailyCost: number,
  weeklyCost: number,
  dailyPercent: number,
  weeklyPercent: number,
): string[] {
  const alerts: string[] = [];

  if (dailyPercent >= 1.0) {
    alerts.push(
      `Daily budget exceeded: $${dailyCost.toFixed(2)}/$${config.daily.toFixed(2)} (${(dailyPercent * 100).toFixed(0)}%)`,
    );
  } else if (dailyPercent >= config.alertAt) {
    alerts.push(
      `Approaching daily budget: $${dailyCost.toFixed(2)}/$${config.daily.toFixed(2)} (${(dailyPercent * 100).toFixed(0)}%)`,
    );
  }

  if (weeklyPercent >= 1.0) {
    alerts.push(
      `Weekly budget exceeded: $${weeklyCost.toFixed(2)}/$${config.weekly.toFixed(2)} (${(weeklyPercent * 100).toFixed(0)}%)`,
    );
  } else if (weeklyPercent >= config.alertAt) {
    alerts.push(
      `Approaching weekly budget: $${weeklyCost.toFixed(2)}/$${config.weekly.toFixed(2)} (${(weeklyPercent * 100).toFixed(0)}%)`,
    );
  }

  return alerts;
}

export function checkBudget(tracesDir?: string): BudgetStatus {
  const config = loadBudgetConfig();
  const emptyStatus: BudgetStatus = {
    dailyCost: 0,
    weeklyCost: 0,
    dailyLimit: config.daily,
    weeklyLimit: config.weekly,
    dailyPercent: 0,
    weeklyPercent: 0,
    alerts: [],
  };

  if (!config.enabled) return emptyStatus;

  const dir = tracesDir ?? join(homedir(), ".claude", "traces");
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const weekStartStr = getWeekStartStr(today);

  let dailyCost = 0;
  let weeklyCost = 0;

  try {
    const costs = sumCostsFromTraces(dir, todayStr, weekStartStr);
    dailyCost = costs.dailyCost;
    weeklyCost = costs.weeklyCost;
  } catch {
    return emptyStatus;
  }

  const dailyPercent = config.daily > 0 ? dailyCost / config.daily : 0;
  const weeklyPercent = config.weekly > 0 ? weeklyCost / config.weekly : 0;

  const alerts = buildAlerts(
    config,
    dailyCost,
    weeklyCost,
    dailyPercent,
    weeklyPercent,
  );

  return {
    dailyCost,
    weeklyCost,
    dailyLimit: config.daily,
    weeklyLimit: config.weekly,
    dailyPercent,
    weeklyPercent,
    alerts,
  };
}
