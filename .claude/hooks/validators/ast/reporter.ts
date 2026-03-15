import type { CheckSummary, Hallucination } from "./types";

export function hasBlockingHallucinations(summary: CheckSummary): boolean {
  return summary.hallucinations.some((h) => h.blocking);
}

function formatSingle(h: Hallucination): string {
  const loc = `${h.location.file}:${h.location.line}:${h.location.column}`;
  const prefix = h.blocking ? "[AST ERROR]" : "[AST WARN]";
  const suggestion = h.suggestion ? ` (${h.suggestion})` : "";
  return `${prefix} ${h.type}: ${h.message} at ${loc}${suggestion}`;
}

export function formatHallucinations(summary: CheckSummary): string {
  if (summary.hallucinations.length === 0) return "";

  const lines = summary.hallucinations.map(formatSingle);
  const blocking = summary.hallucinations.filter((h) => h.blocking).length;
  const warnings = summary.hallucinations.length - blocking;

  lines.push("");
  lines.push(
    `AST Analysis: ${blocking} error(s), ${warnings} warning(s) in ${summary.durationMs}ms`,
  );

  return lines.join("\n");
}
