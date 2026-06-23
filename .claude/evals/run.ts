#!/usr/bin/env bun
// Golden-prompt harness runner (019/US3).
// Live mode: executes each case via `claude -p --output-format stream-json`
// (session auth — the published pattern, W2 D1) and grades the transcript.
// Offline mode (--offline <dir>): grades stored transcripts (<dir>/<case-id>.txt
// or .jsonl) — used by tests and for re-grading without model cost.
// Graders are pure (graders.ts); only this runner touches processes/files.

import { graders, type CaseSpec, type GradeResult } from "./graders";

export interface CaseResult {
  id: string;
  grader: string;
  trials: number;
  pass: boolean;
  detail: string;
}

export interface Report {
  results: CaseResult[];
  passed: number;
  failed: number;
  ok: boolean;
}

export function parseCases(jsonl: string): CaseSpec[] {
  const cases: CaseSpec[] = [];
  for (const line of jsonl.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) continue;
    const c = JSON.parse(trimmed) as CaseSpec;
    if (!c.id || !c.grader) throw new Error(`case missing id/grader: ${trimmed.slice(0, 80)}`);
    if (!graders[c.grader]) throw new Error(`case ${c.id}: unknown grader "${c.grader}"`);
    cases.push(c);
  }
  return cases;
}

function gradeTranscripts(c: CaseSpec, transcripts: string[]): CaseResult {
  // pass^k: every trial must pass for consistency-critical behaviors (W2 D1).
  const results: GradeResult[] = transcripts.map((t) => graders[c.grader!](t, c));
  const failed = results.find((r) => !r.pass);
  return {
    id: c.id!,
    grader: c.grader!,
    trials: transcripts.length,
    pass: !failed,
    detail: failed ? failed.detail : results[0]?.detail ?? "no transcript",
  };
}

export async function runOffline(casesPath: string, transcriptDir: string): Promise<Report> {
  const cases = parseCases(await Bun.file(casesPath).text());
  const results: CaseResult[] = [];
  for (const c of cases) {
    let transcript: string | null = null;
    for (const ext of [".txt", ".jsonl"]) {
      const f = Bun.file(`${transcriptDir}/${c.id}${ext}`);
      if (await f.exists()) {
        transcript = await f.text();
        break;
      }
    }
    if (transcript === null) {
      results.push({ id: c.id!, grader: c.grader!, trials: 0, pass: false, detail: "transcript not found" });
      continue;
    }
    results.push(gradeTranscripts(c, [transcript]));
  }
  return summarize(results);
}

export async function runLive(casesPath: string): Promise<Report> {
  const cases = parseCases(await Bun.file(casesPath).text());
  const results: CaseResult[] = [];
  for (const c of cases) {
    const trials = c.trials && c.trials > 1 ? Math.min(c.trials, 3) : 1;
    const transcripts: string[] = [];
    // Style/honesty/register graders score the PROSE response — they don't need the
    // agentic tool loop, which makes each case a multi-minute session (4 timeouts in 024).
    // Force a single prose turn for them. skillTriggerParse is the exception: it asserts a
    // real Skill() tool_use, so it MUST keep tools enabled.
    const proseOnly = c.grader !== "skillTriggerParse";
    const proseFlags = proseOnly
      ? ["--append-system-prompt", "Responde directamente en prosa. NO uses herramientas ni leas ficheros; responde desde tu conocimiento.", "--allowedTools", ""]
      : [];
    for (let i = 0; i < trials; i++) {
      const proc = Bun.spawn(["claude", "-p", c.prompt ?? "", "--output-format", "stream-json", "--verbose", ...proseFlags], {
        stdout: "pipe",
        stderr: "pipe",
      });
      transcripts.push(await new Response(proc.stdout).text());
      await proc.exited;
    }
    results.push(gradeTranscripts(c, transcripts));
  }
  return summarize(results);
}

function summarize(results: CaseResult[]): Report {
  const passed = results.filter((r) => r.pass).length;
  return { results, passed, failed: results.length - passed, ok: passed === results.length };
}

function printReport(report: Report): void {
  for (const r of report.results) {
    console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.id}  [${r.grader} ×${r.trials}]  ${r.pass ? "" : r.detail}`);
  }
  console.log(`\n${report.passed}/${report.results.length} passed`);
  if (!report.ok) {
    console.log("Expected ≈100% — SUSPECT THE EVAL FIRST (grading bug), then the config change. See .claude/evals/README.md");
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const offlineIdx = args.indexOf("--offline");
  const casesPath = args.find((a) => a.endsWith(".jsonl") && !a.startsWith("--")) ?? ".claude/evals/cases.jsonl";
  const report =
    offlineIdx !== -1 ? await runOffline(casesPath, args[offlineIdx + 1] ?? ".") : await runLive(casesPath);
  printReport(report);
  process.exit(report.ok ? 0 : 1);
}
