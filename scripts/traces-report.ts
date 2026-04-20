import { homedir } from "os";
import { mkdirSync } from "fs";
import { join } from "path";

interface TraceEntry {
  ts: string;
  sessionId: string;
  prompt?: string | null;
  agents?: string[] | null;
  skills?: string[] | null;
  tokens?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  costUsd?: number | null;
  durationMs?: number | null;
  model?: string | null;
  status?: string | null;
  toolCalls?: number | null;
  filesChanged?: number | null;
}

interface SessionAggregate {
  sessionId: string;
  totalCost: number;
  totalTokens: number;
  totalDuration: number;
  model: string;
  agents: string[];
  skills: string[];
  firstTs: string;
  lastTs: string;
  turns: number;
  promptSnippet: string;
}

// --- Formatters ---

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// Lookup table: sorted thresholds + class names (avoids if chains)
const COST_TIERS: Array<[number, string]> = [[10, "cost-high"], [3, "cost-mid"], [0, "cost-low"]];
function formatCostClass(cost: number): string {
  return (COST_TIERS.find(([t]) => cost > t) as [number, string])[1];
}

// Duration: build parts array, join non-zero segments
function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = h > 0 ? [`${h}h`, `${m}m`] : m > 0 ? [`${m}m`, `${sec}s`] : [`${sec}s`];
  return parts.join(" ");
}

// Token thresholds lookup
const TOKEN_TIERS: Array<[number, (n: number) => string]> = [
  [1_000_000, (n) => `${(n / 1_000_000).toFixed(1)}M`],
  [1_000, (n) => `${(n / 1_000).toFixed(0)}K`],
  [0, (n) => String(n)],
];
function formatTokens(n: number): string {
  return (TOKEN_TIERS.find(([t]) => n >= t) as [number, (n: number) => string])[1](n);
}

function formatDate(ts: string): string {
  const d = new Date(ts);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function nowTimestamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// --- Agent badge rendering ---

const AGENT_COLORS: Record<string, string> = {
  builder: "#4f86c6",
  reviewer: "#6abf69",
  planner: "#f4a261",
  scout: "#9b72cf",
  architect: "#e76f51",
  "error-analyzer": "#e63946",
  Explore: "#457b9d",
  "extension-architect": "#2a9d8f",
};

function agentColor(name: string): string {
  const preset = AGENT_COLORS[name];
  if (preset) return preset;
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 55%, 60%)`;
}

function agentBadges(agents: string[]): string {
  return agents.map((a) => `<span class="badge" style="background:${agentColor(a)}">${a}</span>`).join(" ");
}

// --- Session aggregation ---

function makeSnippet(prompt: string | null | undefined): string {
  if (!prompt) return "";
  return prompt.replace(/\s+/g, " ").trim().slice(0, 80);
}

function numOr0(n: number | null | undefined): number {
  if (n == null) return 0;
  return n;
}

function toDeduped(arr: string[] | null | undefined): string[] {
  if (!arr) return [];
  return [...new Set(arr)];
}

function initSession(entry: TraceEntry): SessionAggregate {
  return {
    sessionId: entry.sessionId,
    totalCost: entry.costUsd as number,
    totalTokens: numOr0(entry.tokens),
    totalDuration: numOr0(entry.durationMs),
    model: entry.model || "—",
    agents: toDeduped(entry.agents),
    skills: toDeduped(entry.skills),
    firstTs: entry.ts,
    lastTs: entry.ts,
    turns: 1,
    promptSnippet: makeSnippet(entry.prompt),
  };
}

function mergeStrings(existing: string[], incoming: string[] | null | undefined): void {
  if (!incoming) return;
  const seen = new Set(existing);
  for (const item of incoming) {
    if (!seen.has(item)) { existing.push(item); seen.add(item); }
  }
}

function mergeIntoSession(existing: SessionAggregate, entry: TraceEntry): void {
  existing.totalCost += entry.costUsd as number;
  existing.totalTokens += numOr0(entry.tokens);
  existing.totalDuration += numOr0(entry.durationMs);
  existing.model = entry.model || existing.model;
  mergeStrings(existing.agents, entry.agents);
  mergeStrings(existing.skills, entry.skills);
  const sorted = [existing.firstTs, existing.lastTs, entry.ts].sort();
  existing.firstTs = sorted[0];
  existing.lastTs = sorted[sorted.length - 1];
  existing.turns += 1;
  if (!existing.promptSnippet) existing.promptSnippet = makeSnippet(entry.prompt);
}

function parseEntry(line: string, prefix: string): TraceEntry | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  let entry: TraceEntry;
  try {
    entry = JSON.parse(trimmed) as TraceEntry;
  } catch {
    return null;
  }
  if (!entry.ts || !entry.sessionId) return null;
  if (!entry.ts.startsWith(prefix) || !entry.costUsd) return null;
  return entry;
}

async function buildSessionMap(files: string[], prefix: string): Promise<Map<string, SessionAggregate>> {
  const sessionMap = new Map<string, SessionAggregate>();
  for (const file of files) {
    const text = await Bun.file(file).text();
    for (const line of text.split("\n")) {
      const entry = parseEntry(line, prefix);
      if (!entry) continue;
      const existing = sessionMap.get(entry.sessionId);
      if (!existing) { sessionMap.set(entry.sessionId, initSession(entry)); continue; }
      mergeIntoSession(existing, entry);
    }
  }
  return sessionMap;
}

// --- HTML generation ---

function htmlStyles(): string {
  return `<style>
  :root{--bg:#0f1117;--surface:#1a1d2e;--border:#2a2d3e;--text:#e2e8f0;--muted:#64748b;--gold:#f59e0b;--gold-bg:rgba(245,158,11,0.08);--cost-high:#f87171;--cost-mid:#fbbf24;--cost-low:#4ade80;--accent:#6366f1;--radius:8px;--font:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;--mono:ui-monospace,"Cascadia Code","Fira Code",monospace}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--text);font-family:var(--font);font-size:14px;line-height:1.6;padding:2rem 1.5rem;min-height:100vh}
  h1{font-size:1.5rem;font-weight:700;margin-bottom:1.5rem;letter-spacing:-0.02em}h1 span{color:var(--accent)}
  .summary-bar{display:flex;gap:1.5rem;flex-wrap:wrap;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:1rem 1.25rem;margin-bottom:1.5rem}
  .stat{display:flex;flex-direction:column;gap:0.15rem}
  .stat-label{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted)}
  .stat-value{font-size:1.1rem;font-weight:600;color:var(--cost-high)}.stat-value.neutral{color:var(--text)}.stat-value.muted{color:var(--muted);font-size:0.9rem}
  .table-wrap{overflow-x:auto;border-radius:var(--radius);border:1px solid var(--border)}
  table{width:100%;border-collapse:collapse;min-width:860px}
  thead{background:var(--surface);position:sticky;top:0;z-index:1}
  th{padding:0.65rem 0.9rem;text-align:left;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--muted);border-bottom:1px solid var(--border);white-space:nowrap}
  td{padding:0.6rem 0.9rem;border-bottom:1px solid var(--border);vertical-align:top}
  tr:last-child td{border-bottom:none}tr:hover td{background:rgba(255,255,255,0.02)}
  tr.gold td{background:var(--gold-bg)}tr.gold td.rank{color:var(--gold);font-weight:700}
  .rank{color:var(--muted);font-weight:500;width:2rem}.date{font-family:var(--mono);font-size:0.82rem;white-space:nowrap}
  .model{font-family:var(--mono);font-size:0.82rem;color:var(--accent)}.turns{color:var(--muted);text-align:center}
  .cost-cell{font-weight:700;font-family:var(--mono)}.cost-high{color:var(--cost-high)}.cost-mid{color:var(--cost-mid)}.cost-low{color:var(--cost-low)}
  .agents-cell{min-width:180px}
  .badge{display:inline-block;padding:0.1rem 0.45rem;border-radius:999px;font-size:0.72rem;font-weight:600;color:#fff;margin:0.1rem 0.15rem 0.1rem 0;white-space:nowrap}
  .prompt-cell{max-width:280px;font-size:0.82rem;color:var(--muted);word-break:break-word}
  .none{color:var(--muted);font-style:italic}
  footer{margin-top:1.5rem;font-size:0.75rem;color:var(--muted);text-align:center}
  @media(max-width:640px){body{padding:1rem}h1{font-size:1.2rem}.summary-bar{gap:1rem}}
</style>`;
}

function renderRow(s: SessionAggregate, rank: number): string {
  const costCls = formatCostClass(s.totalCost);
  const goldAttr = rank === 1 ? ' class="gold"' : "";
  const agentsHtml = agentBadges(s.agents);
  const promptHtml = escapeHtml(s.promptSnippet);
  const modelText = s.model;
  return `<tr${goldAttr}><td class="rank">${rank}</td><td class="date">${formatDate(s.firstTs)}</td><td class="${costCls} cost-cell">$${s.totalCost.toFixed(2)}</td><td class="model">${modelText}</td><td>${formatDuration(s.totalDuration)}</td><td>${formatTokens(s.totalTokens)}</td><td class="turns">${s.turns}</td><td class="agents-cell">${agentsHtml}</td><td class="prompt-cell">${promptHtml}</td></tr>`;
}

function computeDateRange(sessions: SessionAggregate[]): { first: string; last: string } {
  const allTs = sessions.flatMap((s) => [s.firstTs, s.lastTs]);
  if (!allTs.length) return { first: "—", last: "—" };
  allTs.sort();
  return { first: formatDate(allTs[0]), last: formatDate(allTs[allTs.length - 1]) };
}

function generateHTML(
  sessions: SessionAggregate[],
  totalCost: number,
  totalSessions: number,
  dateRange: { first: string; last: string },
  year: number,
  month: number
): string {
  const label = `${MONTH_NAMES[month - 1]} ${year}`;
  const rows = sessions.map((s, i) => renderRow(s, i + 1)).join("\n");
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Top 10 Sesiones — ${label}</title>${htmlStyles()}</head>
<body>
<h1>Top 10 Sesiones Más Caras — <span>${label}</span></h1>
<div class="summary-bar">
  <div class="stat"><span class="stat-label">Costo total del mes</span><span class="stat-value">$${totalCost.toFixed(2)}</span></div>
  <div class="stat"><span class="stat-label">Sesiones analizadas</span><span class="stat-value neutral">${totalSessions}</span></div>
  <div class="stat"><span class="stat-label">Rango de fechas</span><span class="stat-value muted">${dateRange.first} → ${dateRange.last}</span></div>
</div>
<div class="table-wrap"><table>
  <thead><tr><th>#</th><th>Fecha</th><th>Costo</th><th>Modelo</th><th>Duración</th><th>Tokens</th><th>Turnos</th><th>Agentes usados</th><th>Prompt (snippet)</th></tr></thead>
  <tbody>${rows}</tbody>
</table></div>
<footer>Generado el ${nowTimestamp()} — ${totalSessions} sesiones analizadas</footer>
</body></html>`;
}

// --- Entry point ---

async function main(): Promise<void> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const prefix = `${year}-${pad2(month)}`;

  const tracesDir = join(homedir(), ".claude", "traces");
  const files: string[] = [];
  for await (const file of new Bun.Glob(`${prefix}-*.jsonl`).scan(tracesDir)) {
    files.push(join(tracesDir, file));
  }
  files.sort();

  const sessionMap = await buildSessionMap(files, prefix);
  const sessions = [...sessionMap.values()];
  const totalCost = sessions.reduce((acc, x) => acc + x.totalCost, 0);

  sessions.sort((a, b) => b.totalCost - a.totalCost);

  const html = generateHTML(
    sessions.slice(0, 10),
    totalCost,
    sessions.length,
    computeDateRange(sessions),
    year,
    month,
  );

  const reportsDir = join(import.meta.dir, "..", "reports");
  mkdirSync(reportsDir, { recursive: true });

  const outFile = join(reportsDir, `traces-top10-${prefix}.html`);
  await Bun.write(outFile, html);

  console.log(`Sesiones analizadas: ${sessions.length}`);
  console.log(`Top 10 generado: reports/traces-top10-${prefix}.html`);
  console.log(`Costo total del mes: $${totalCost.toFixed(2)}`);
}

main().catch((err: unknown) => {
  console.error("Error:", String(err));
  process.exit(1);
});
