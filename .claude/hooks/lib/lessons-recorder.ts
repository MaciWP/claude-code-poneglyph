import { existsSync, appendFileSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface Lesson {
  timestamp: string;
  context: string;
  correction: string;
  lesson: string;
  skill?: string;
}

const DEFAULT_LESSONS_PATH = join(homedir(), ".claude", "lessons.jsonl");
const MAX_AGE_DAYS = 60;

function getLessonsPath(): string {
  return Bun.env.CLAUDE_LESSONS_PATH ?? DEFAULT_LESSONS_PATH;
}

export function recordLesson(lesson: Omit<Lesson, "timestamp">): void {
  const entry: Lesson = {
    ...lesson,
    timestamp: new Date().toISOString(),
  };
  const filePath = getLessonsPath();
  appendFileSync(filePath, JSON.stringify(entry) + "\n");
}

function parseLessonLine(line: string): Lesson | null {
  if (!line.trim()) return null;
  try {
    return JSON.parse(line) as Lesson;
  } catch {
    return null;
  }
}

export function loadRecentLessons(limit: number = 10): Lesson[] {
  const filePath = getLessonsPath();
  if (!existsSync(filePath)) return [];

  const content = readFileSync(filePath, "utf-8").trim();
  if (!content) return [];

  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  const lessons = content
    .split("\n")
    .map(parseLessonLine)
    .filter(
      (l): l is Lesson =>
        l !== null && new Date(l.timestamp).getTime() >= cutoff,
    );

  return lessons.slice(-limit).reverse();
}
