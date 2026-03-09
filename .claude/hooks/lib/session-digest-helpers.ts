import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

import type { TraceEntry } from "../trace-logger";

const TRACES_DIR = join(homedir(), ".claude", "traces");

export function getTracesDir(): string {
  return TRACES_DIR;
}

export function findLatestTraceFile(): string | null {
  try {
    const files = readdirSync(TRACES_DIR)
      .filter((f) => f.endsWith(".jsonl"))
      .sort();
    if (files.length === 0) return null;
    return join(TRACES_DIR, files[files.length - 1]);
  } catch {
    return null;
  }
}

export function readLastLine(filePath: string): string | null {
  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.trimEnd().split("\n");
    if (lines.length === 0) return null;
    return lines[lines.length - 1];
  } catch {
    return null;
  }
}

export function parseTrace(line: string): TraceEntry | null {
  try {
    return JSON.parse(line) as TraceEntry;
  } catch {
    return null;
  }
}

export function countTraceFiles(): number {
  try {
    return readdirSync(TRACES_DIR).filter((f) => f.endsWith(".jsonl")).length;
  } catch {
    return 0;
  }
}

export function formatError(err: unknown): string {
  return err instanceof Error ? err.message : "unknown";
}
