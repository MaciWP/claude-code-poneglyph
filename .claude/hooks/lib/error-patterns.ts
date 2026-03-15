import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import {
  normalizeErrorMessage,
  classifyError,
  levenshteinDistance,
  matchError,
} from "./error-pattern-matching";

export {
  normalizeErrorMessage,
  classifyError,
  levenshteinDistance,
  matchError,
};

// ============================================================================
// Interfaces
// ============================================================================

export type ErrorCategory =
  | "TypeError"
  | "EditConflict"
  | "ModuleNotFound"
  | "CompilationError"
  | "TestFailure"
  | "NetworkError"
  | "PermissionError"
  | "HallucinationError"
  | "Unknown";

export interface ErrorFix {
  description: string;
  appliedAt: string;
  succeeded: boolean;
}

export interface ErrorPattern {
  id: string;
  normalizedMessage: string;
  category: ErrorCategory;
  originalMessage: string;
  fixes: ErrorFix[];
  successRate: number;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
}

export interface MatchResult {
  pattern: ErrorPattern;
  confidence: number;
  matchType: "exact" | "regex" | "fuzzy";
}

// ============================================================================
// Constants
// ============================================================================

const PATTERNS_PATH = join(homedir(), ".claude", "error-patterns.jsonl");

// ============================================================================
// Storage (JSONL)
// ============================================================================

function parseJsonlLine(line: string): ErrorPattern | null {
  if (!line.trim()) return null;
  try {
    return JSON.parse(line) as ErrorPattern;
  } catch {
    return null;
  }
}

export function loadPatterns(): ErrorPattern[] {
  try {
    if (!existsSync(PATTERNS_PATH)) return [];
    const content = readFileSync(PATTERNS_PATH, "utf-8");
    return content
      .split("\n")
      .map(parseJsonlLine)
      .filter((p): p is ErrorPattern => p !== null);
  } catch {
    return [];
  }
}

export function savePatterns(patterns: ErrorPattern[]): void {
  try {
    mkdirSync(join(homedir(), ".claude"), { recursive: true });
    const content = patterns.map((p) => JSON.stringify(p)).join("\n") + "\n";
    writeFileSync(PATTERNS_PATH, content);
  } catch {
    // Best effort
  }
}

// ============================================================================
// Recording
// ============================================================================

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function nowIso(): string {
  return new Date().toISOString();
}

export function recordError(message: string): ErrorPattern {
  const patterns = loadPatterns();
  const normalized: string = normalizeErrorMessage(message);
  const category: ErrorCategory = classifyError(message);

  const existing = patterns.find(
    (p: ErrorPattern) => p.normalizedMessage === normalized,
  );

  if (existing) {
    existing.occurrences++;
    existing.lastSeen = nowIso();
    savePatterns(patterns);
    return existing;
  }

  const newPattern: ErrorPattern = {
    id: generateId(),
    normalizedMessage: normalized,
    category,
    originalMessage: message,
    fixes: [],
    successRate: 0,
    occurrences: 1,
    firstSeen: nowIso(),
    lastSeen: nowIso(),
  };

  patterns.push(newPattern);
  savePatterns(patterns);
  return newPattern;
}

export function recordFixOutcome(
  patternId: string,
  fixDescription: string,
  succeeded: boolean,
): void {
  const patterns = loadPatterns();
  const pattern = patterns.find((p) => p.id === patternId);

  if (!pattern) return;

  pattern.fixes.push({
    description: fixDescription,
    appliedAt: nowIso(),
    succeeded,
  });

  const totalFixes = pattern.fixes.length;
  const successfulFixes = pattern.fixes.filter((f) => f.succeeded).length;
  pattern.successRate = totalFixes > 0 ? successfulFixes / totalFixes : 0;

  savePatterns(patterns);
}

// ============================================================================
// Fix suggestion
// ============================================================================

interface FixStats {
  description: string;
  success: number;
  total: number;
}

function aggregateFixStats(fixes: ErrorFix[]): FixStats[] {
  const statsMap: Record<string, { success: number; total: number }> = {};

  for (const fix of fixes) {
    if (!statsMap[fix.description]) {
      statsMap[fix.description] = { success: 0, total: 0 };
    }
    statsMap[fix.description].total++;
    if (fix.succeeded) statsMap[fix.description].success++;
  }

  return Object.keys(statsMap).map((desc) => ({
    description: desc,
    success: statsMap[desc].success,
    total: statsMap[desc].total,
  }));
}

export function getBestFix(pattern: ErrorPattern): string | null {
  if (pattern.fixes.length === 0) return null;

  const stats = aggregateFixStats(pattern.fixes);
  let bestFix: string | null = null;
  let bestRate = 0;

  for (const entry of stats) {
    if (entry.success === 0) continue;
    const rate = entry.success / entry.total;
    if (rate > bestRate) {
      bestRate = rate;
      bestFix = entry.description;
    }
  }

  return bestFix;
}
