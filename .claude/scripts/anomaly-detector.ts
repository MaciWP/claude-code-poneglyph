#!/usr/bin/env bun
/**
 * Capa 2: Detector de anomalías determinista → alerts.json
 *
 * Lee daily.json + aggregates.json y aplica 11 reglas activas.
 * Sin LLM — pura computación sobre datos.
 *
 * REGLAS ACTIVAS (11):
 *   1. cost_anomaly         — coste/día > μ + 2σ
 *   2. cost_trend           — current month vs prev (gated por stale_data en aggregates)
 *   3. budget_breach        — coste/día > budgets.daily.limit
 *   4. agent_health         — agent successRate < 0.7 con ≥10 sesiones
 *   5. agent_regression     — agent successRate cayó > 0.15 vs 30d previos
 *   6. skill_waste          — > 50% skills sin usar en 30d
 *   7. skill_never_used     — skill nunca invocada en todo el histórico
 *   8. status_mix           — fail+timeout rate > 15% global
 *   9. model_misuse         — Opus con coste/día > $50 (umbral configurable)
 *  10. tool_timing_outlier  — tool con p95 > 3× p95 global y ≥20 calls
 *  11. data_stale           — sin actividad > 14 días (renamed from hook_silent)
 *
 * REGLAS DOCUMENTADAS PERO NO IMPLEMENTADAS (requieren nueva instrumentación del trace):
 *   - retry_storm         — necesita campo `retries` per session
 *   - compaction_overuse  — necesita campo `endedInCompaction` per session
 *   - hook_silent (real)  — necesita registro explícito de hook fires en el trace
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const OUT_DIR = path.join(import.meta.dir, "..", "data", "usage");
const SKILLS_DIR_PROJECT = path.join(import.meta.dir, "..", "skills");

export const THRESHOLDS = {
  costSigmaMultiplier: 2,
  costMonthRatioWarn: 1.3,
  budgetLimitUsdPerDay: 50,
  agentSuccessRateMin: 0.7,
  agentSuccessMinSessions: 10,
  agentRegressionDelta: 0.15,
  agentRegressionMinSessions: 10,
  skillWasteRatio: 0.5,
  toolTimingOutlierMultiplier: 3,
  toolTimingMinCalls: 20,
  statusMixCriticalRate: 0.15,
  statusMixMinSessions: 5,
  modelMisuseOpusCostDay: 50,
  staleDaysIgnoreTrend: 7,
  dataStaleDays: 14,
};

export type Severity = "critical" | "warning" | "info";

export type Category =
  | "cost_anomaly"
  | "cost_trend"
  | "budget_breach"
  | "agent_health"
  | "agent_regression"
  | "skill_waste"
  | "skill_never_used"
  | "status_mix"
  | "model_misuse"
  | "tool_timing_outlier"
  | "data_stale";

export interface Alert {
  severity: Severity;
  category: Category;
  message: string;
  data: Record<string, unknown>;
  commandmentTriggered: string;
  recommendation: string;
}

export interface AlertsOutput {
  generatedAt: string;
  dataRange: { earliest: string; latest: string; staleDays: number };
  alerts: Alert[];
  rulesActive: number;
  rulesDocumentedSkipped: string[];
}

interface DayRowMinimal {
  date: string;
  sessions: number;
  totals: { costUsd: number; filesChanged: number };
  byStatus: { completed: number; failed: number; timeout: number; other: number };
  byAgent: Record<string, number>;
  bySkill: Record<string, number>;
  byModel: Record<string, { primarySessions?: number; sessions?: number; costUsd: number }>;
}

interface AggregatesMinimal {
  dataRange: { earliest: string; latest: string; staleDays: number };
  health: {
    agentSuccessRate: Record<string, number>;
    agentSessionCounts: Record<string, number>;
    agentSuccessRatePrevWindow?: Record<string, number>;
  };
  roi: { costTrend: string; totalCostUsd: number; totalFilesChanged: number };
  config: {
    skills?: { total?: number };
    skillsAvailable?: number;
    skillsUsedLast30d: string[];
    skillsUnusedLast30d: string[];
    hooks?: { registered?: number };
    hooksRegistered?: number;
  };
  budget: { limitUsdPerDay: number; daysOverBudget: number };
  topToolsByDuration?: Array<{
    tool: string;
    totalCalls: number;
    avgMs: number;
    p95Ms: number;
    failureCount: number;
    failureRate: number;
  }>;
}

export function readJson<T = unknown>(filePath: string): T | null {
  try {
    if (!existsSync(filePath)) return null;
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function getPrimarySessions(byModelData: { primarySessions?: number; sessions?: number }): number {
  return byModelData.primarySessions ?? byModelData.sessions ?? 0;
}

export function detectAlerts(daily: DayRowMinimal[], agg: AggregatesMinimal): Alert[] {
  const alerts: Alert[] = [];
  const staleDays = agg?.dataRange?.staleDays ?? 0;
  const limitUsdPerDay = agg?.budget?.limitUsdPerDay ?? THRESHOLDS.budgetLimitUsdPerDay;

  // Rule 1: Cost anomaly (μ + 2σ)
  const last30 = daily.slice(-30);
  const costs30 = last30.map((r) => r.totals.costUsd);
  const costMean = mean(costs30);
  const costSigma = stddev(costs30);
  const costUpperBound = costMean + THRESHOLDS.costSigmaMultiplier * costSigma;
  if (costUpperBound > 0) {
    for (const day of last30) {
      if (day.totals.costUsd > costUpperBound) {
        alerts.push({
          severity: "warning",
          category: "cost_anomaly",
          message: `Coste del ${day.date} ($${day.totals.costUsd.toFixed(2)}) supera μ+2σ ($${costUpperBound.toFixed(2)})`,
          data: { date: day.date, costUsd: day.totals.costUsd, mean: costMean, sigma: costSigma, bound: costUpperBound },
          commandmentTriggered: "IX — Observability",
          recommendation: "Revisa qué sesiones causaron el pico de coste ese día",
        });
      }
    }
  }

  // Rule 2: Cost trend (gated by stale_data — costTrend === "stale_data" means skip)
  const trendStr = agg?.roi?.costTrend ?? "stable";
  if (trendStr !== "stale_data" && trendStr.startsWith("+")) {
    const pct = parseInt(trendStr.replace("+", "").replace("%", ""), 10);
    if (!isNaN(pct) && pct >= 30) {
      const filesGrowthSafe = agg.roi.totalFilesChanged > 0;
      alerts.push({
        severity: "warning",
        category: "cost_trend",
        message: `Coste mes actual ${trendStr} vs mes anterior`,
        data: { costTrend: trendStr, filesChanged: agg.roi.totalFilesChanged },
        commandmentTriggered: "IX — Observability",
        recommendation: filesGrowthSafe
          ? "Coste creció pero también output — evalúa eficiencia"
          : "Coste creció sin aumento proporcional de output — revisa sesiones ineficientes",
      });
    }
  }

  // Rule 3: Budget breach
  const overBudget = daily.filter((r) => r.totals.costUsd > limitUsdPerDay);
  if (overBudget.length > 0) {
    const worst = [...overBudget].sort((a, b) => b.totals.costUsd - a.totals.costUsd)[0];
    alerts.push({
      severity: "critical",
      category: "budget_breach",
      message: `${overBudget.length} días superaron el límite de $${limitUsdPerDay}/día (máximo: $${worst.totals.costUsd.toFixed(2)} el ${worst.date})`,
      data: { daysOverBudget: overBudget.length, worstDay: worst.date, worstCost: worst.totals.costUsd, limit: limitUsdPerDay },
      commandmentTriggered: "IX — Observability",
      recommendation: "Revisa las sesiones de esos días — probablemente sesiones largas con Opus",
    });
  }

  // Rule 4: Agent health (successRate < 0.7 con ≥10 sesiones)
  for (const [agent, rate] of Object.entries(agg?.health?.agentSuccessRate ?? {})) {
    const count = agg?.health?.agentSessionCounts?.[agent] ?? 0;
    if (count >= THRESHOLDS.agentSuccessMinSessions && rate < THRESHOLDS.agentSuccessRateMin) {
      alerts.push({
        severity: "critical",
        category: "agent_health",
        message: `Agent '${agent}' successRate ${(rate * 100).toFixed(0)}% con ${count} sesiones (mínimo: ${(THRESHOLDS.agentSuccessRateMin * 100).toFixed(0)}%)`,
        data: { agent, successRate: rate, sessions: count },
        commandmentTriggered: "IV — Quality Gates",
        recommendation: `Revisa las últimas sesiones de '${agent}' para identificar causa de fallos`,
      });
    }
  }

  // Rule 5 (NEW): Agent regression — successRate dropped > 0.15 vs prev 30d
  const prevRates = agg?.health?.agentSuccessRatePrevWindow ?? {};
  for (const [agent, rate] of Object.entries(agg?.health?.agentSuccessRate ?? {})) {
    const count = agg?.health?.agentSessionCounts?.[agent] ?? 0;
    const prevRate = prevRates[agent];
    if (
      prevRate != null &&
      count >= THRESHOLDS.agentRegressionMinSessions &&
      prevRate - rate > THRESHOLDS.agentRegressionDelta
    ) {
      alerts.push({
        severity: "warning",
        category: "agent_regression",
        message: `Agent '${agent}' successRate cayó de ${(prevRate * 100).toFixed(0)}% a ${(rate * 100).toFixed(0)}% (−${((prevRate - rate) * 100).toFixed(0)} pp) entre ventanas`,
        data: { agent, currentRate: rate, prevRate, delta: prevRate - rate, sessions: count },
        commandmentTriggered: "IX — Observability",
        recommendation: `Compara configs y prompts recientes de '${agent}' vs los del período anterior`,
      });
    }
  }

  // Rule 6: Skill waste (>50% skills no usadas)
  const skillsTotal = agg?.config?.skills?.total ?? agg?.config?.skillsAvailable ?? 0;
  const skillsUnused = agg?.config?.skillsUnusedLast30d ?? [];
  if (skillsTotal > 0 && skillsUnused.length / skillsTotal > THRESHOLDS.skillWasteRatio) {
    alerts.push({
      severity: "warning",
      category: "skill_waste",
      message: `${skillsUnused.length}/${skillsTotal} skills sin usar en 30d (${Math.round((skillsUnused.length / skillsTotal) * 100)}%)`,
      data: { unused: skillsUnused, total: skillsTotal },
      commandmentTriggered: "X — Maintainability",
      recommendation: "Audita si las skills no usadas siguen justificando su existencia contra los 10 Commandments",
    });
  }

  // Rule 7: Skill never used (available pero nunca invocada en todo el histórico)
  const allSkillsEverUsed = new Set<string>();
  for (const row of daily) {
    for (const skill of Object.keys(row.bySkill ?? {})) allSkillsEverUsed.add(skill);
  }
  try {
    if (existsSync(SKILLS_DIR_PROJECT)) {
      const allDirs = require("fs")
        .readdirSync(SKILLS_DIR_PROJECT, { withFileTypes: true })
        .filter((d: { isDirectory: () => boolean }) => d.isDirectory())
        .map((d: { name: string }) => d.name) as string[];
      const neverUsed = allDirs.filter((s) => !allSkillsEverUsed.has(s));
      if (neverUsed.length > 0) {
        alerts.push({
          severity: "info",
          category: "skill_never_used",
          message: `${neverUsed.length} skills nunca invocadas en todo el histórico`,
          data: { skills: neverUsed },
          commandmentTriggered: "X — Maintainability",
          recommendation: "Considera si estas skills tienen triggers correctos o si deben eliminarse",
        });
      }
    }
  } catch {}

  // Rule 8: Status mix (fail+timeout > 15%)
  const totalStatus = daily.reduce(
    (acc, r) => ({
      completed: acc.completed + r.byStatus.completed,
      failed: acc.failed + r.byStatus.failed,
      timeout: acc.timeout + r.byStatus.timeout,
      other: acc.other + (r.byStatus.other ?? 0),
    }),
    { completed: 0, failed: 0, timeout: 0, other: 0 }
  );
  const totalSessions = Object.values(totalStatus).reduce((a, b) => a + b, 0);
  const failRate = totalSessions > 0 ? (totalStatus.failed + totalStatus.timeout) / totalSessions : 0;
  if (failRate > THRESHOLDS.statusMixCriticalRate && totalSessions >= THRESHOLDS.statusMixMinSessions) {
    alerts.push({
      severity: "critical",
      category: "status_mix",
      message: `Tasa de fallos: ${(failRate * 100).toFixed(1)}% (${totalStatus.failed} failed + ${totalStatus.timeout} timeout / ${totalSessions} sesiones)`,
      data: { ...totalStatus, failRate },
      commandmentTriggered: "IV — Quality Gates",
      recommendation: "Investiga causas de fallo — posibles timeouts en hooks o errores en agentes",
    });
  }

  // Rule 9: Model misuse (Opus con coste > umbral)
  for (const row of daily) {
    const opusData = row.byModel?.["opus"];
    if (opusData) {
      const opusCost = opusData.costUsd;
      if (opusCost > THRESHOLDS.modelMisuseOpusCostDay) {
        const opusSessions = getPrimarySessions(opusData);
        alerts.push({
          severity: "info",
          category: "model_misuse",
          message: `Opus usado el ${row.date}: ${opusSessions} sesión(es), $${opusCost.toFixed(2)}`,
          data: { date: row.date, opusSessions, opusCost },
          commandmentTriggered: "VII — Efficiency",
          recommendation: "Verifica que esas sesiones correspondan a tareas realmente complejas (complexity >60)",
        });
      }
    }
  }

  // Rule 10 (NEW): Tool timing outlier — p95 > 3× p95 median (robust to outliers) con ≥20 calls
  const topTools = agg?.topToolsByDuration ?? [];
  if (topTools.length > 0) {
    const qualifying = topTools.filter((t) => t.totalCalls >= THRESHOLDS.toolTimingMinCalls);
    const p95Median = median(qualifying.map((t) => t.p95Ms));
    for (const tool of qualifying) {
      if (p95Median > 0 && tool.p95Ms > p95Median * THRESHOLDS.toolTimingOutlierMultiplier) {
        alerts.push({
          severity: "info",
          category: "tool_timing_outlier",
          message: `Tool '${tool.tool}' p95 ${Math.round(tool.p95Ms)}ms > ${THRESHOLDS.toolTimingOutlierMultiplier}× p95 median (~${Math.round(p95Median)}ms) en ${tool.totalCalls} calls`,
          data: { tool: tool.tool, p95Ms: tool.p95Ms, p95Median, calls: tool.totalCalls, failureRate: tool.failureRate },
          commandmentTriggered: "VII — Efficiency",
          recommendation: `Investiga si '${tool.tool}' tiene timeouts elevados o se le pasan inputs grandes`,
        });
      }
    }
  }

  // Rule 11 (renamed): data_stale — sin actividad reciente
  if (staleDays > THRESHOLDS.dataStaleDays) {
    alerts.push({
      severity: "warning",
      category: "data_stale",
      message: `Sin actividad registrada en ${staleDays} días (última: ${agg?.dataRange?.latest ?? "desconocida"})`,
      data: { staleDays, lastActivity: agg?.dataRange?.latest },
      commandmentTriggered: "IX — Observability",
      recommendation: "Ejecuta 'bun .claude/scripts/usage-snapshot.ts' cuando sospeches de algo concreto (no hay command UI por diseño)",
    });
  }

  return alerts;
}

async function main() {
  const dailyPath = path.join(OUT_DIR, "daily.json");
  const aggregatesPath = path.join(OUT_DIR, "aggregates.json");
  const alertsPath = path.join(OUT_DIR, "alerts.json");

  if (!existsSync(dailyPath) || !existsSync(aggregatesPath)) {
    console.error("[error] daily.json or aggregates.json not found. Run usage-snapshot.ts first.");
    process.exit(1);
  }

  const daily = readJson<DayRowMinimal[]>(dailyPath);
  const aggregates = readJson<AggregatesMinimal>(aggregatesPath);

  if (!daily || !aggregates) {
    console.error("[error] Failed to parse daily.json or aggregates.json.");
    process.exit(1);
  }

  const alerts = detectAlerts(daily, aggregates);

  const output: AlertsOutput = {
    generatedAt: new Date().toISOString(),
    dataRange: aggregates.dataRange,
    alerts,
    rulesActive: 11,
    rulesDocumentedSkipped: ["retry_storm", "compaction_overuse", "hook_silent_real"],
  };

  writeFileSync(alertsPath, JSON.stringify(output, null, 2));

  const critical = alerts.filter((a) => a.severity === "critical");
  const warnings = alerts.filter((a) => a.severity === "warning");
  const infos = alerts.filter((a) => a.severity === "info");

  console.log("=== Anomaly Detection ===");
  console.log(`Alerts: ${critical.length} critical, ${warnings.length} warnings, ${infos.length} info`);
  console.log(`Rules: ${output.rulesActive} active, ${output.rulesDocumentedSkipped.length} documented-skipped`);
  console.log("");

  for (const alert of [...critical, ...warnings, ...infos.slice(0, 5)]) {
    const icon = alert.severity === "critical" ? "🚨" : alert.severity === "warning" ? "⚠️" : "ℹ️";
    console.log(`${icon} [${alert.category}] ${alert.message}`);
    console.log(`   → ${alert.recommendation}`);
  }

  if (alerts.length === 0) {
    console.log("No anomalies detected.");
  }
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("[error]", err);
    process.exit(1);
  });
}
