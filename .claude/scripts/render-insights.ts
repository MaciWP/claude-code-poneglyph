#!/usr/bin/env bun
/**
 * Renders insights.md → insights.html (standalone, no full dashboard).
 * Same dark theme as dashboard-template.html. Reusable after each manual run (bun .claude/scripts/render-insights.ts).
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const OUT_DIR = path.join(import.meta.dir, "..", "data", "usage");
const INSIGHTS_MD = path.join(OUT_DIR, "insights.md");
const AGGREGATES_JSON = path.join(OUT_DIR, "aggregates.json");
const OUTPUT_HTML = path.join(OUT_DIR, "insights.html");

interface AggMeta {
  generatedAt?: string;
  dataRange?: { earliest: string; latest: string; staleDays: number };
  roi?: { totalCostUsd: number; totalSessions: number; costTrend: string };
}

function buildHtml(mdContent: string, meta: AggMeta): string {
  const dataRange = meta.dataRange ?? { earliest: "?", latest: "?", staleDays: 0 };
  const roi = meta.roi ?? { totalCostUsd: 0, totalSessions: 0, costTrend: "?" };
  const generated = meta.generatedAt ?? new Date().toISOString();
  const mdJson = JSON.stringify(mdContent);

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Insights — Claude Code Usage</title>
<script src="https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/dist/markdown-it.min.js"></script>
<style>
  :root {
    --bg: #0f1117;
    --surface: #1a1d27;
    --surface2: #252836;
    --border: #2e3247;
    --text: #e2e8f0;
    --text2: #94a3b8;
    --accent: #6366f1;
    --accent2: #a78bfa;
    --green: #22c55e;
    --yellow: #eab308;
    --red: #ef4444;
    --blue: #3b82f6;
    --orange: #f97316;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 15px;
    line-height: 1.7;
  }
  .wrap { max-width: 880px; margin: 0 auto; padding: 32px 24px 80px; }

  /* Header */
  .header {
    border-bottom: 1px solid var(--border);
    padding-bottom: 20px;
    margin-bottom: 28px;
  }
  .header h1 {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 6px;
    background: linear-gradient(90deg, var(--accent) 0%, var(--accent2) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .header-meta {
    color: var(--text2);
    font-size: 12px;
    margin-top: 4px;
  }
  .meta-row { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 10px; }
  .meta-chip {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 12px;
    color: var(--text2);
  }
  .meta-chip b { color: var(--text); font-weight: 600; }
  .stale-warn { background: rgba(234,179,8,0.15); border-color: var(--yellow); color: var(--yellow); }

  /* Markdown content */
  .content {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 32px 36px;
  }
  .content h1 {
    font-size: 22px;
    color: var(--text);
    margin: 0 0 14px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }
  .content h1:first-child { margin-top: 0; }
  .content h2 {
    font-size: 18px;
    font-weight: 700;
    color: var(--accent);
    margin: 32px 0 12px;
    padding-top: 8px;
  }
  .content h3 {
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
    margin: 20px 0 8px;
  }
  .content p { margin: 8px 0 12px; color: var(--text); }
  .content ul, .content ol { margin: 8px 0 14px 22px; }
  .content li { margin: 4px 0; }
  .content strong { color: var(--text); font-weight: 700; }
  .content em { color: var(--text); font-style: italic; }
  .content code {
    background: var(--surface2);
    color: var(--accent2);
    padding: 1px 6px;
    border-radius: 3px;
    font-family: 'SF Mono', Monaco, Consolas, monospace;
    font-size: 13px;
  }
  .content pre {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 14px 16px;
    overflow-x: auto;
    margin: 12px 0;
  }
  .content pre code {
    background: none;
    color: var(--text);
    padding: 0;
    font-size: 12px;
    line-height: 1.5;
  }
  .content blockquote {
    border-left: 3px solid var(--accent);
    background: rgba(99,102,241,0.06);
    padding: 8px 16px;
    margin: 12px 0;
    color: var(--text2);
  }
  .content hr { border: none; border-top: 1px solid var(--border); margin: 24px 0; }

  /* Tables */
  .content table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 13px;
  }
  .content thead { background: var(--surface2); }
  .content th {
    padding: 10px 12px;
    text-align: left;
    color: var(--text2);
    font-weight: 600;
    border: 1px solid var(--border);
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.04em;
  }
  .content td {
    padding: 10px 12px;
    border: 1px solid var(--border);
    color: var(--text);
  }
  .content tr:hover td { background: rgba(99,102,241,0.04); }

  /* Footer */
  .footer {
    margin-top: 28px;
    color: var(--text2);
    font-size: 12px;
    text-align: center;
  }
  .footer a { color: var(--accent); text-decoration: none; }
  .footer a:hover { text-decoration: underline; }
</style>
</head>
<body>
<div class="wrap">

  <div class="header">
    <h1>🤖 AI Insights — Claude Code Usage</h1>
    <div class="header-meta">Análisis narrativo generado por el agent <code style="background:var(--surface);padding:1px 6px;border-radius:3px;color:var(--accent2);">builder</code> sobre los datos agregados del trace.</div>
    <div class="meta-row">
      <div class="meta-chip">Ventana: <b>${dataRange.earliest} → ${dataRange.latest}</b></div>
      <div class="meta-chip ${dataRange.staleDays > 7 ? 'stale-warn' : ''}">${dataRange.staleDays > 7 ? '⚠ Datos stale: ' : 'Frescura: '}<b>${dataRange.staleDays}d</b></div>
      <div class="meta-chip">Coste 30d: <b>$${roi.totalCostUsd.toFixed(2)}</b></div>
      <div class="meta-chip">Sesiones 30d: <b>${roi.totalSessions}</b></div>
      <div class="meta-chip">Tendencia: <b>${roi.costTrend}</b></div>
      <div class="meta-chip">Generado: <b>${new Date(generated).toLocaleString('es-ES')}</b></div>
    </div>
  </div>

  <div class="content" id="content"></div>

  <div class="footer">
    Generado por <code>.claude/scripts/render-insights.ts</code> &middot; <a href="./dashboard.html">← Ver dashboard completo</a>
  </div>

</div>

<script>
const MD_CONTENT = ${mdJson};
const md = window.markdownit({ html: false, linkify: true, typographer: true });
document.getElementById('content').innerHTML = md.render(MD_CONTENT);
</script>
</body>
</html>`;
}

async function main() {
  if (!existsSync(INSIGHTS_MD)) {
    console.error(`[error] No insights.md found at ${INSIGHTS_MD}`);
    console.error("Run insights generation first (delegate to builder with .claude/data/usage/aggregates.json as context).");
    process.exit(1);
  }

  const mdContent = readFileSync(INSIGHTS_MD, "utf8");
  const aggMeta: AggMeta = existsSync(AGGREGATES_JSON)
    ? JSON.parse(readFileSync(AGGREGATES_JSON, "utf8"))
    : {};

  const html = buildHtml(mdContent, aggMeta);
  writeFileSync(OUTPUT_HTML, html);

  console.log(`✓ Rendered ${INSIGHTS_MD.split("/").pop()} → ${OUTPUT_HTML.split("/").pop()}`);
  console.log(`  Size: ${(html.length / 1024).toFixed(1)} KB`);
  console.log(`  Open: open ${OUTPUT_HTML}`);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("[error]", err);
    process.exit(1);
  });
}
