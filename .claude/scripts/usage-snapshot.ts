#!/usr/bin/env bun
/**
 * Capa 1: Agregador de telemetría Claude Code → daily.json + aggregates.json + dashboard.html
 *
 * COSTE — fuente y limitación:
 * Cada trace event lleva `costUsd` calculado por Claude Code. Lo usamos directamente como
 * autoritativo (last event = total de la sesión). No re-computamos. Claude Code no separa
 * `cache_read_input_tokens` en el trace JSONL — si una sesión usó mucho cache hit, el coste
 * real facturado en la API es inferior al `costUsd` mostrado. Es la mejor fuente disponible
 * sin instrumentación adicional.
 *
 * SCHEMA CUMULATIVO — cada evento es un snapshot acumulativo de la sesión:
 *   tokens, inputTokens, outputTokens, costUsd, durationMs, toolCalls, filesChanged,
 *   toolTimings → totales hasta ese momento (last event = totales de la sesión).
 *   agents, skills, model, status, parallelismRatio, cheapModelRatio → estado actual.
 *
 * AGRUPACIÓN:
 *   Por (fecha del timestamp, sessionId). Sessions cross-day contribuyen a cada día.
 */

import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

const TRACES_DIR = path.join(process.env.HOME!, ".claude", "traces");
const PROJECT_ROOT = path.join(import.meta.dir, "..", "..");
const COST_BUDGET_FILE = path.join(PROJECT_ROOT, ".claude", "config", "cost-budget.json");
const SETTINGS_FILE = path.join(PROJECT_ROOT, ".claude", "settings.json");
const SKILLS_DIR_PROJECT = path.join(PROJECT_ROOT, ".claude", "skills");
const COMMANDS_DIR_PROJECT = path.join(PROJECT_ROOT, ".claude", "commands");
const SKILLS_DIR_USER = path.join(process.env.HOME!, ".claude", "skills");
const COMMANDS_DIR_USER = path.join(process.env.HOME!, ".claude", "commands");
const OUT_DIR = path.join(PROJECT_ROOT, ".claude", "data", "usage");

export const STALE_DAYS_THRESHOLD = 7;

export interface TraceEvent {
  ts: string;
  sessionId: string;
  prompt?: string;
  agents?: string[];
  skills?: string[] | null;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  model: string;
  status: "completed" | "failed" | "timeout" | string;
  toolCalls: number;
  filesChanged: number;
  parallelismRatio?: number | null;
  cheapModelRatio?: number | null;
  toolTimings?: {
    count: number;
    totalMs: number;
    avgMs: number;
    p95Ms: number;
    slowestTool: string;
    failureCount: number;
    byTool: Record<string, { count: number; avgMs: number; failures: number }>;
  };
}

export interface ByModelStats {
  primarySessions: number;     // model del último evento — sesión "pertenece" aquí
  contributingSessions: number; // model apareció en algún evento de la sesión
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
}

export interface ToolStats {
  totalCalls: number;
  totalMs: number;
  avgMs: number;
  p95Ms: number;
  failureCount: number;
  failureRate: number;
}

export interface AgentStatusBreakdown {
  completed: number;
  failed: number;
  timeout: number;
  other: number;
}

export interface DayRow {
  date: string;
  events: number;
  sessions: number;
  totals: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUsd: number;
    durationMs: number;
    toolCalls: number;
    filesChanged: number;
  };
  byModel: Record<string, ByModelStats>;
  byAgent: Record<string, number>;
  agentStatus: Record<string, AgentStatusBreakdown>;
  bySkill: Record<string, number>;
  byStatus: AgentStatusBreakdown;
  parallelism: { parallelSessions: number; serialSessions: number; avgRatio: number };
  modelMix: { avgCheapRatio: number | null };
  toolTimings?: { p95Ms: number; slowestTool: string; failureCount: number };
  byTool: Record<string, ToolStats>;
}

export interface Aggregates {
  generatedAt: string;
  dataRange: { earliest: string; latest: string; staleDays: number };
  windowDays: number;
  health: {
    agentSuccessRate: Record<string, number>;
    agentSessionCounts: Record<string, number>;
    agentSuccessRatePrevWindow: Record<string, number>;
    errorRate: number;
    timeoutRate: number;
    completionRate: number;
  };
  roi: {
    totalCostUsd: number;
    totalFilesChanged: number;
    totalSessions: number;
    costPerFileChanged: number;
    costPerSession: number;
    costTrend: string;
  };
  config: {
    skills: { project: number; user: number; commandsProject: number; commandsUser: number; total: number };
    skillsUsedLast30d: string[];
    skillsUnusedLast30d: string[];
    agentsUsedLast30d: string[];
    hooks: { registered: number; matchers: Array<{ event: string; count: number }> };
  };
  budget: {
    limitUsdPerDay: number;
    warningUsdPerDay: number;
    maxDayUsd: number;
    maxDayDate: string;
    daysOverBudget: number;
    daysOverWarning: number;
  };
  topToolsByDuration: Array<{
    tool: string;
    totalCalls: number;
    avgMs: number;
    p95Ms: number;
    failureCount: number;
    failureRate: number;
  }>;
}

export function readJsonlFile(filePath: string): unknown[] {
  if (!existsSync(filePath)) return [];
  try {
    const content = readFileSync(filePath, "utf8");
    return content
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function readJson<T = unknown>(filePath: string): T | null {
  try {
    if (!existsSync(filePath)) return null;
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function listDirs(dir: string): string[] {
  try {
    if (!existsSync(dir)) return [];
    return readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }
}

function countMarkdownFiles(dir: string): number {
  try {
    if (!existsSync(dir)) return 0;
    return readdirSync(dir).filter((f) => f.endsWith(".md")).length;
  } catch {
    return 0;
  }
}

export function countHooks(settingsPath: string = SETTINGS_FILE): {
  registered: number;
  matchers: Array<{ event: string; count: number }>;
} {
  const settings = readJson<{ hooks?: Record<string, unknown[]> }>(settingsPath);
  if (!settings || !settings.hooks) return { registered: 0, matchers: [] };
  const matchers: Array<{ event: string; count: number }> = [];
  let total = 0;
  for (const [event, configs] of Object.entries(settings.hooks)) {
    const count = Array.isArray(configs) ? configs.length : 0;
    matchers.push({ event, count });
    total += count;
  }
  return { registered: total, matchers };
}

export function loadAllTraces(tracesDir: string = TRACES_DIR): Map<string, TraceEvent[]> {
  const result = new Map<string, TraceEvent[]>();
  if (!existsSync(tracesDir)) {
    console.warn(`[warn] Traces directory not found: ${tracesDir}`);
    return result;
  }
  const files = readdirSync(tracesDir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
    .sort();
  for (const file of files) {
    const events = readJsonlFile(path.join(tracesDir, file)) as TraceEvent[];
    for (const ev of events) {
      if (!ev.ts || !ev.sessionId) continue;
      const date = ev.ts.slice(0, 10);
      const key = `${date}|${ev.sessionId}`;
      if (!result.has(key)) result.set(key, []);
      result.get(key)!.push(ev);
    }
  }
  return result;
}

export function aggregateDaily(tracesByKey: Map<string, TraceEvent[]>): DayRow[] {
  const byDate = new Map<string, string[]>();
  for (const key of tracesByKey.keys()) {
    const date = key.split("|")[0];
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(key);
  }

  const rows: DayRow[] = [];

  for (const [date, keys] of [...byDate.entries()].sort()) {
    const row: DayRow = {
      date,
      events: 0,
      sessions: keys.length,
      totals: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        durationMs: 0,
        toolCalls: 0,
        filesChanged: 0,
      },
      byModel: {},
      byAgent: {},
      agentStatus: {},
      bySkill: {},
      byStatus: { completed: 0, failed: 0, timeout: 0, other: 0 },
      parallelism: { parallelSessions: 0, serialSessions: 0, avgRatio: 0 },
      modelMix: { avgCheapRatio: null },
      byTool: {},
    };

    let parallelRatioSum = 0;
    let parallelRatioCount = 0;
    let cheapRatioSum = 0;
    let cheapRatioCount = 0;
    let maxP95Ms = 0;
    let slowestTool = "";
    let toolFailureCount = 0;
    const byToolAccum: Record<string, { totalCalls: number; weightedMs: number; failures: number; p95s: number[] }> = {};

    for (const key of keys) {
      const events = tracesByKey.get(key)!;
      row.events += events.length;

      const sorted = [...events].sort((a, b) => a.ts.localeCompare(b.ts));
      const last = sorted[sorted.length - 1];

      // Cumulative scalars from last event
      row.totals.durationMs += last.durationMs ?? 0;
      row.totals.toolCalls += last.toolCalls ?? 0;
      row.totals.filesChanged += last.filesChanged ?? 0;
      row.totals.inputTokens += last.inputTokens ?? 0;
      row.totals.outputTokens += last.outputTokens ?? 0;
      row.totals.totalTokens += last.tokens ?? 0;
      row.totals.costUsd += last.costUsd ?? 0;

      // byModel — primarySessions (last event) + contributingSessions (any event of session)
      const primaryModel = last.model || "unknown";
      const contributingModels = new Set<string>();
      for (const ev of sorted) if (ev.model) contributingModels.add(ev.model);

      if (!row.byModel[primaryModel]) {
        row.byModel[primaryModel] = {
          primarySessions: 0,
          contributingSessions: 0,
          costUsd: 0,
          inputTokens: 0,
          outputTokens: 0,
        };
      }
      row.byModel[primaryModel].primarySessions++;
      row.byModel[primaryModel].costUsd += last.costUsd ?? 0;
      row.byModel[primaryModel].inputTokens += last.inputTokens ?? 0;
      row.byModel[primaryModel].outputTokens += last.outputTokens ?? 0;

      for (const m of contributingModels) {
        if (!row.byModel[m]) {
          row.byModel[m] = {
            primarySessions: 0,
            contributingSessions: 0,
            costUsd: 0,
            inputTokens: 0,
            outputTokens: 0,
          };
        }
        row.byModel[m].contributingSessions++;
      }

      // Status
      const statusBucket: keyof AgentStatusBreakdown =
        last.status === "completed" ? "completed" :
        last.status === "failed" ? "failed" :
        last.status === "timeout" ? "timeout" : "other";
      row.byStatus[statusBucket]++;

      // Agents + agentStatus per agent (each agent in session inherits session's status)
      for (const agent of last.agents ?? []) {
        row.byAgent[agent] = (row.byAgent[agent] ?? 0) + 1;
        if (!row.agentStatus[agent]) {
          row.agentStatus[agent] = { completed: 0, failed: 0, timeout: 0, other: 0 };
        }
        row.agentStatus[agent][statusBucket]++;
      }

      for (const skill of last.skills ?? []) {
        row.bySkill[skill] = (row.bySkill[skill] ?? 0) + 1;
      }

      if (last.parallelismRatio != null) {
        parallelRatioSum += last.parallelismRatio;
        parallelRatioCount++;
        if (last.parallelismRatio > 0) row.parallelism.parallelSessions++;
        else row.parallelism.serialSessions++;
      }

      if (last.cheapModelRatio != null) {
        cheapRatioSum += last.cheapModelRatio;
        cheapRatioCount++;
      }

      if (last.toolTimings) {
        const tt = last.toolTimings;
        if (tt.p95Ms > maxP95Ms) {
          maxP95Ms = tt.p95Ms;
          slowestTool = tt.slowestTool || "";
        }
        toolFailureCount += tt.failureCount ?? 0;

        for (const [toolName, toolData] of Object.entries(tt.byTool ?? {})) {
          if (!byToolAccum[toolName]) {
            byToolAccum[toolName] = { totalCalls: 0, weightedMs: 0, failures: 0, p95s: [] };
          }
          const count = toolData.count ?? 0;
          const avg = toolData.avgMs ?? 0;
          byToolAccum[toolName].totalCalls += count;
          byToolAccum[toolName].weightedMs += avg * count;
          byToolAccum[toolName].failures += toolData.failures ?? 0;
          byToolAccum[toolName].p95s.push(avg);
        }
      }
    }

    if (parallelRatioCount > 0) row.parallelism.avgRatio = parallelRatioSum / parallelRatioCount;
    if (cheapRatioCount > 0) row.modelMix.avgCheapRatio = cheapRatioSum / cheapRatioCount;
    if (maxP95Ms > 0) {
      row.toolTimings = { p95Ms: maxP95Ms, slowestTool, failureCount: toolFailureCount };
    }

    for (const [tool, acc] of Object.entries(byToolAccum)) {
      const sortedP95s = [...acc.p95s].sort((a, b) => b - a);
      row.byTool[tool] = {
        totalCalls: acc.totalCalls,
        totalMs: acc.weightedMs,
        avgMs: acc.totalCalls > 0 ? acc.weightedMs / acc.totalCalls : 0,
        p95Ms: sortedP95s[0] ?? 0,
        failureCount: acc.failures,
        failureRate: acc.totalCalls > 0 ? acc.failures / acc.totalCalls : 0,
      };
    }

    rows.push(row);
  }

  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

export function computeAggregates(rows: DayRow[], referenceNow: Date = new Date()): Aggregates {
  const cutoff30 = new Date(referenceNow);
  cutoff30.setDate(cutoff30.getDate() - 30);
  const cutoff30Str = cutoff30.toISOString().slice(0, 10);
  const cutoff60 = new Date(referenceNow);
  cutoff60.setDate(cutoff60.getDate() - 60);
  const cutoff60Str = cutoff60.toISOString().slice(0, 10);

  const recent = rows.filter((r) => r.date >= cutoff30Str);
  const previous = rows.filter((r) => r.date >= cutoff60Str && r.date < cutoff30Str);

  let totalCost = 0;
  let totalFiles = 0;
  let totalSessions = 0;
  let totalCompleted = 0;
  let totalFailed = 0;
  let totalTimeout = 0;
  const skillsUsed = new Set<string>();
  const agentTotals: Record<string, { total: number; completed: number }> = {};
  const agentTotalsPrev: Record<string, { total: number; completed: number }> = {};

  for (const row of recent) {
    totalCost += row.totals.costUsd;
    totalFiles += row.totals.filesChanged;
    totalSessions += row.sessions;
    totalCompleted += row.byStatus.completed;
    totalFailed += row.byStatus.failed;
    totalTimeout += row.byStatus.timeout;
    for (const [agent, st] of Object.entries(row.agentStatus)) {
      const tot = st.completed + st.failed + st.timeout + st.other;
      if (!agentTotals[agent]) agentTotals[agent] = { total: 0, completed: 0 };
      agentTotals[agent].total += tot;
      agentTotals[agent].completed += st.completed;
    }
    for (const skill of Object.keys(row.bySkill)) skillsUsed.add(skill);
  }
  for (const row of previous) {
    for (const [agent, st] of Object.entries(row.agentStatus)) {
      const tot = st.completed + st.failed + st.timeout + st.other;
      if (!agentTotalsPrev[agent]) agentTotalsPrev[agent] = { total: 0, completed: 0 };
      agentTotalsPrev[agent].total += tot;
      agentTotalsPrev[agent].completed += st.completed;
    }
  }

  const agentSuccessRate: Record<string, number> = {};
  const agentSessionCounts: Record<string, number> = {};
  const agentSuccessRatePrev: Record<string, number> = {};
  for (const [agent, data] of Object.entries(agentTotals)) {
    agentSessionCounts[agent] = data.total;
    agentSuccessRate[agent] = data.total > 0 ? data.completed / data.total : 0;
  }
  for (const [agent, data] of Object.entries(agentTotalsPrev)) {
    agentSuccessRatePrev[agent] = data.total > 0 ? data.completed / data.total : 0;
  }

  const skillsProject = listDirs(SKILLS_DIR_PROJECT);
  const skillsUser = listDirs(SKILLS_DIR_USER);
  const commandsProjectCount = countMarkdownFiles(COMMANDS_DIR_PROJECT);
  const commandsUserCount = countMarkdownFiles(COMMANDS_DIR_USER);
  const allInvocableSkills = new Set<string>([...skillsProject, ...skillsUser]);
  const skillsUnused = [...allInvocableSkills].filter((s) => !skillsUsed.has(s)).sort();

  // Budget
  const budgetCfg = readJson<{ budgets?: { daily?: { limit?: number; warning?: number } } }>(COST_BUDGET_FILE);
  let limitUsdPerDay = 50;
  let warningUsdPerDay = 20;
  if (budgetCfg?.budgets?.daily) {
    limitUsdPerDay = budgetCfg.budgets.daily.limit ?? limitUsdPerDay;
    warningUsdPerDay = budgetCfg.budgets.daily.warning ?? warningUsdPerDay;
  }
  let daysOverBudget = 0;
  let daysOverWarning = 0;
  let maxDayUsd = 0;
  let maxDayDate = "";
  for (const row of rows) {
    if (row.totals.costUsd > limitUsdPerDay) daysOverBudget++;
    if (row.totals.costUsd > warningUsdPerDay) daysOverWarning++;
    if (row.totals.costUsd > maxDayUsd) {
      maxDayUsd = row.totals.costUsd;
      maxDayDate = row.date;
    }
  }

  const earliest = rows.length > 0 ? rows[0].date : "";
  const latest = rows.length > 0 ? rows[rows.length - 1].date : "";
  const staleDays = latest
    ? Math.floor((referenceNow.getTime() - new Date(latest).getTime()) / 86400000)
    : 999;

  let costTrend = "stable";
  if (staleDays > STALE_DAYS_THRESHOLD) {
    costTrend = "stale_data";
  } else {
    const prev30Cost = previous.reduce((s, r) => s + r.totals.costUsd, 0);
    if (prev30Cost > 0) {
      const ratio = totalCost / prev30Cost;
      if (ratio > 1.15) costTrend = `+${Math.round((ratio - 1) * 100)}%`;
      else if (ratio < 0.85) costTrend = `-${Math.round((1 - ratio) * 100)}%`;
    } else if (totalCost > 0) {
      costTrend = "new_data";
    }
  }

  // topToolsByDuration aggregated across recent days
  const toolGlobal: Record<string, { totalCalls: number; weightedMs: number; failures: number; p95s: number[] }> = {};
  for (const row of recent) {
    for (const [tool, stats] of Object.entries(row.byTool ?? {})) {
      if (!toolGlobal[tool]) toolGlobal[tool] = { totalCalls: 0, weightedMs: 0, failures: 0, p95s: [] };
      toolGlobal[tool].totalCalls += stats.totalCalls;
      toolGlobal[tool].weightedMs += stats.totalMs;
      toolGlobal[tool].failures += stats.failureCount;
      toolGlobal[tool].p95s.push(stats.p95Ms);
    }
  }
  const topToolsByDuration = Object.entries(toolGlobal)
    .map(([tool, data]) => {
      const sortedP95s = [...data.p95s].sort((a, b) => b - a);
      return {
        tool,
        totalCalls: data.totalCalls,
        avgMs: data.totalCalls > 0 ? data.weightedMs / data.totalCalls : 0,
        p95Ms: sortedP95s[0] ?? 0,
        failureCount: data.failures,
        failureRate: data.totalCalls > 0 ? data.failures / data.totalCalls : 0,
      };
    })
    .sort((a, b) => b.avgMs * b.totalCalls - a.avgMs * a.totalCalls)
    .slice(0, 10);

  const totalEvents = totalCompleted + totalFailed + totalTimeout;
  const hooksInfo = countHooks();

  return {
    generatedAt: referenceNow.toISOString(),
    dataRange: { earliest, latest, staleDays },
    windowDays: 30,
    health: {
      agentSuccessRate,
      agentSessionCounts,
      agentSuccessRatePrevWindow: agentSuccessRatePrev,
      errorRate: totalEvents > 0 ? totalFailed / totalEvents : 0,
      timeoutRate: totalEvents > 0 ? totalTimeout / totalEvents : 0,
      completionRate: totalEvents > 0 ? totalCompleted / totalEvents : 0,
    },
    roi: {
      totalCostUsd: totalCost,
      totalFilesChanged: totalFiles,
      totalSessions,
      costPerFileChanged: totalFiles > 0 ? totalCost / totalFiles : 0,
      costPerSession: totalSessions > 0 ? totalCost / totalSessions : 0,
      costTrend,
    },
    config: {
      skills: {
        project: skillsProject.length,
        user: skillsUser.length,
        commandsProject: commandsProjectCount,
        commandsUser: commandsUserCount,
        total: skillsProject.length + skillsUser.length + commandsProjectCount + commandsUserCount,
      },
      skillsUsedLast30d: [...skillsUsed].sort(),
      skillsUnusedLast30d: skillsUnused,
      agentsUsedLast30d: Object.keys(agentTotals).sort(),
      hooks: hooksInfo,
    },
    budget: {
      limitUsdPerDay,
      warningUsdPerDay,
      maxDayUsd,
      maxDayDate,
      daysOverBudget,
      daysOverWarning,
    },
    topToolsByDuration,
  };
}

function loadDashboardTemplate(): string {
  const templatePath = path.join(import.meta.dir, "dashboard-template.html");
  if (existsSync(templatePath)) return readFileSync(templatePath, "utf8");
  return "";
}

function buildDashboard(
  daily: DayRow[],
  aggregates: Aggregates,
  alertsPath: string,
  insightsPath: string,
  template: string
): string {
  const alerts = readJson<{ alerts: unknown[] }>(alertsPath) ?? { alerts: [] };
  const insights = existsSync(insightsPath) ? readFileSync(insightsPath, "utf8") : "";

  const data = JSON.stringify({ daily, aggregates, alerts, insights });

  if (template) return template.replace("__DATA__", data);

  return `<!DOCTYPE html><html><head><title>Claude Code Usage</title></head><body>
<pre>No dashboard template found. Raw data:</pre>
<script>window.USAGE_DATA = ${data};</script>
</body></html>`;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const tracesByKey = loadAllTraces();
  if (tracesByKey.size === 0) {
    console.warn("[warn] No trace events found. Output files will be empty.");
  }

  const daily = aggregateDaily(tracesByKey);
  const aggregates = computeAggregates(daily);

  const dailyPath = path.join(OUT_DIR, "daily.json");
  const aggregatesPath = path.join(OUT_DIR, "aggregates.json");
  const alertsPath = path.join(OUT_DIR, "alerts.json");
  const insightsPath = path.join(OUT_DIR, "insights.md");
  const dashboardPath = path.join(OUT_DIR, "dashboard.html");

  writeFileSync(dailyPath, JSON.stringify(daily, null, 2));
  writeFileSync(aggregatesPath, JSON.stringify(aggregates, null, 2));

  const template = loadDashboardTemplate();
  const html = buildDashboard(daily, aggregates, alertsPath, insightsPath, template);
  writeFileSync(dashboardPath, html);

  printSummary(daily, aggregates);
  console.log(`\nOutput: ${OUT_DIR}\nDashboard: open ${dashboardPath}`);
}

function printSummary(daily: DayRow[], aggregates: Aggregates) {
  const recent = daily[daily.length - 1];
  const { dataRange, roi, budget, config, health } = aggregates;

  console.log("=== Claude Code Usage Snapshot ===");
  console.log(`Data range: ${dataRange.earliest} → ${dataRange.latest} (${daily.length} days tracked, ${dataRange.staleDays}d stale)`);
  console.log("");

  if (recent) {
    console.log(`Most recent day: ${recent.date}`);
    console.log(`  Sessions: ${recent.sessions}  Events: ${recent.events}`);
    console.log(`  Cost: $${recent.totals.costUsd.toFixed(2)}`);
    console.log(`  Tokens: ${(recent.totals.inputTokens / 1e6).toFixed(1)}M input + ${(recent.totals.outputTokens / 1e6).toFixed(2)}M output`);
    console.log(`  Status: ${JSON.stringify(recent.byStatus)}`);
  }

  console.log("");
  console.log(`30d totals: $${roi.totalCostUsd.toFixed(2)} cost · ${roi.totalSessions} sessions · ${roi.totalFilesChanged} files`);
  console.log(`30d trend: ${roi.costTrend}  ·  cost/session: $${roi.costPerSession.toFixed(2)}  ·  cost/file: $${roi.costPerFileChanged.toFixed(2)}`);
  console.log(`Budget: max day $${budget.maxDayUsd.toFixed(2)} on ${budget.maxDayDate}; ${budget.daysOverBudget} days > $${budget.limitUsdPerDay}/day`);

  const agentLines = Object.entries(health.agentSuccessRate)
    .sort((a, b) => (health.agentSessionCounts[b[0]] ?? 0) - (health.agentSessionCounts[a[0]] ?? 0))
    .slice(0, 6)
    .map(([agent, rate]) => `    ${agent}: ${(rate * 100).toFixed(0)}% (${health.agentSessionCounts[agent]} ses)`);
  if (agentLines.length > 0) {
    console.log(`Top agents (success rate):\n${agentLines.join("\n")}`);
  }
  console.log(`Skills used 30d: ${config.skillsUsedLast30d.length}/${config.skills.total} invocable (${config.skills.project} proj + ${config.skills.user} user dirs)`);
  if (config.skillsUnusedLast30d.length > 0) {
    console.log(`  Unused: ${config.skillsUnusedLast30d.slice(0, 5).join(", ")}${config.skillsUnusedLast30d.length > 5 ? "..." : ""}`);
  }
  console.log(`Hooks: ${config.hooks.registered} registered (${config.hooks.matchers.map((m) => `${m.event}:${m.count}`).join(", ")})`);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("[error]", err);
    process.exit(1);
  });
}
