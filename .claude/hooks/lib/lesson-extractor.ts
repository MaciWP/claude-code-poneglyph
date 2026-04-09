import { readFileSync } from "fs";
import { recordLesson } from "./lessons-recorder";

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

function findExplicitLesson(text: string): string | null {
  const trimmed = text.trim();

  // /learn command: "/learn <lesson text>"
  const learnMatch = /^\/learn\s+(.+)/is.exec(trimmed);
  if (learnMatch) {
    const lesson = learnMatch[1]?.trim();
    if (lesson && lesson.length >= MIN_LENGTH && lesson.length <= MAX_LENGTH) {
      return lesson;
    }
  }

  // Explicit "lesson:" or "remember:" prefix anywhere in the message
  const explicitMatch = /(?:^|\n)\s*(?:lesson|remember):\s*(.+)/i.exec(trimmed);
  if (explicitMatch) {
    const lesson = explicitMatch[1]?.trim();
    if (lesson && lesson.length >= MIN_LENGTH && lesson.length <= MAX_LENGTH) {
      return lesson;
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
    const lesson = findExplicitLesson(prompt);
    if (lesson) {
      recordLesson({
        context: `Explicit lesson from session ${sessionId ?? "unknown"}`,
        correction: lesson,
        lesson,
      });
      return lesson;
    }
  }
  return null;
}
