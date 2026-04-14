import { existsSync, readFileSync } from "node:fs";
import { resolve, isAbsolute } from "node:path";
import { Glob } from "bun";
import { extractPaths, type ExtractedPath } from "./path-extractor";

const NEW_MARKER_REGEX = /\((NEW|NUEVO)\)|\b(new|nuevo|create|crear):/i;
const PLAN_PATH_REGEX = /(^|\/)plans\/[^/]+\.md$/i;

export function isPlanFile(filePath: string): boolean {
  return PLAN_PATH_REGEX.test(filePath.replace(/\\/g, "/"));
}

export function readFileSafe(filePath: string): string {
  try {
    return existsSync(filePath) ? readFileSync(filePath, "utf-8") : "";
  } catch {
    return "";
  }
}

export function pickContent(direct: string, disk: string, fallback: string): string {
  const found = [direct, disk, fallback].find((c) => c.length > 0);
  return found ?? "";
}

export function isNearbyMarkedAsNew(lines: string[], lineIdx: number): boolean {
  const line = lines[lineIdx] ?? "";
  return NEW_MARKER_REGEX.test(line);
}

function pathExists(candidate: string): boolean {
  const abs = isAbsolute(candidate) ? candidate : resolve(process.cwd(), candidate);
  return existsSync(abs);
}

function wildcardHasMatch(pattern: string): boolean {
  try {
    const glob = new Glob(pattern);
    for (const _ of glob.scanSync({ cwd: process.cwd(), onlyFiles: false })) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function resolveExists(item: ExtractedPath): boolean {
  return item.hasWildcard ? wildcardHasMatch(item.path) : pathExists(item.path);
}

export function findMissingPaths(content: string): ExtractedPath[] {
  const extracted = extractPaths(content);
  const lines = content.split("\n");
  return extracted.filter(
    (item) => !resolveExists(item) && !isNearbyMarkedAsNew(lines, item.line - 1),
  );
}
