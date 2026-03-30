import { readFileSync } from "fs";
import { recordLesson } from "./lessons-recorder";

const CORRECTION_PATTERNS = [
  /(?:no,?\s+(?:actually|that's wrong|eso no|no hagas|te dije))\s*[,.:]\s*(.+)/gi,
  /(?:wrong|incorrecto|mal)[,.:]\s*(.+)/gi,
  /(?:I said|te dije|ya te dije)\s+(.+)/gi,
  /(?:don't|no)\s+(?:do that|hagas eso)[,.:]\s*(.+)/gi,
];

const MIN_LENGTH = 10;
const MAX_LENGTH = 500;

interface TraceLine {
  prompt?: string | null;
  sessionId?: string | null;
}

function extractPromptsFromTraceFile(traceFilePath: string): string[] {
  const content = readFileSync(traceFilePath, "utf-8").trim();
  if (!content) return [];

  const prompts: string[] = [];
  for (const line of content.split("\n")) {
    try {
      const entry = JSON.parse(line) as TraceLine;
      if (entry.prompt) prompts.push(entry.prompt);
    } catch {
      // skip malformed lines
    }
  }
  return prompts;
}

function findFirstCorrection(text: string): string | null {
  for (const pattern of CORRECTION_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (!match) continue;
    const correction = match[1]?.trim();
    if (
      correction &&
      correction.length > MIN_LENGTH &&
      correction.length < MAX_LENGTH
    ) {
      return correction;
    }
  }
  return null;
}

export function extractAndRecordLessons(
  traceFilePath: string,
  sessionId: string | null,
): string | null {
  const prompts = extractPromptsFromTraceFile(traceFilePath);

  for (const prompt of prompts) {
    const correction = findFirstCorrection(prompt);
    if (correction) {
      recordLesson({
        context: `Auto-detected from session ${sessionId ?? "unknown"}`,
        correction,
        lesson: correction,
      });
      return correction;
    }
  }
  return null;
}
