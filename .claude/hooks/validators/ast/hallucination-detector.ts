#!/usr/bin/env bun

import { EXIT_CODES, readStdin, isTypeScriptFile } from "../config";
import { getOrCreateProject, addOrUpdateFile } from "./ast-project";
import { checkImports } from "./checkers/import-checker";
import { checkSymbols } from "./checkers/symbol-checker";
import { checkArity } from "./checkers/arity-checker";
import { checkProperties } from "./checkers/property-checker";
import { checkTypes } from "./checkers/type-checker";
import { formatHallucinations, hasBlockingHallucinations } from "./reporter";
import { recordError } from "../../lib/error-patterns";
import type { Hallucination, CheckSummary } from "./types";

interface CheckerEntry {
  name: string;
  fn: (sf: import("ts-morph").SourceFile) => Hallucination[];
}

const CHECKERS: CheckerEntry[] = [
  { name: "imports", fn: checkImports },
  { name: "symbols", fn: checkSymbols },
  { name: "arity", fn: checkArity },
  { name: "properties", fn: checkProperties },
  { name: "types", fn: checkTypes },
];

function runCheckers(
  sourceFile: import("ts-morph").SourceFile,
): { hallucinations: Hallucination[]; durations: Record<string, number> } {
  const allHallucinations: Hallucination[] = [];
  const durations: Record<string, number> = {};

  for (const checker of CHECKERS) {
    const start = Date.now();
    try {
      const results = checker.fn(sourceFile);
      allHallucinations.push(...results);
    } catch {
      // graceful: skip failed checker
    }
    durations[checker.name] = Date.now() - start;
  }

  return { hallucinations: allHallucinations, durations };
}

async function main(): Promise<void> {
  const input = await readStdin();

  const filePath = input.tool_input.file_path;
  if (!filePath) {
    process.exit(EXIT_CODES.PASS);
  }

  if (!isTypeScriptFile(filePath)) {
    process.exit(EXIT_CODES.PASS);
  }

  let content: string;
  if (input.tool_input.content) {
    content = input.tool_input.content;
  } else {
    try {
      const file = Bun.file(filePath);
      content = await file.text();
    } catch {
      process.exit(EXIT_CODES.PASS);
    }
  }

  if (!content.trim()) {
    process.exit(EXIT_CODES.PASS);
  }

  const overallStart = Date.now();
  const project = getOrCreateProject(filePath);
  const sourceFile = addOrUpdateFile(project, filePath, content);

  const { hallucinations, durations } = runCheckers(sourceFile);
  const totalDuration = Date.now() - overallStart;

  const summary: CheckSummary = {
    file: filePath,
    hallucinations,
    durationMs: totalDuration,
    checkersDurationMs: durations,
  };

  if (hallucinations.length === 0) {
    process.exit(EXIT_CODES.PASS);
  }

  // Record hallucinations in error-patterns.jsonl (SPEC-009 integration)
  for (const h of summary.hallucinations) {
    try {
      recordError(`${h.type}: ${h.message} at ${h.location.file}:${h.location.line}`);
    } catch {
      // best-effort, never block
    }
  }

  const output = formatHallucinations(summary);
  console.error(output);

  if (hasBlockingHallucinations(summary)) {
    process.exit(EXIT_CODES.BLOCK);
  }

  process.exit(EXIT_CODES.PASS);
}

main().catch(() => {
  process.exit(EXIT_CODES.PASS);
});
