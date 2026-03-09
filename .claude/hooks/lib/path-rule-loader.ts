import { join } from "path";
import { parseFrontmatter, readMarkdownFiles } from "./yaml-frontmatter";

export { parseFrontmatter } from "./yaml-frontmatter";

export interface PathRule {
  name: string;
  globs: string[];
  priority: number;
  skills: string[];
  keywords: string[];
  context: string;
}

export interface PathMatch {
  rule: PathRule;
  matchedGlob: string;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

function buildRule(
  name: string,
  data: Record<string, unknown>,
  body: string,
): PathRule {
  return {
    name,
    globs: toStringArray(data.globs),
    priority: toNumber(data.priority, 10),
    skills: toStringArray(data.skills),
    keywords: toStringArray(data.keywords),
    context: body,
  };
}

export function loadPathRules(rulesDir?: string): PathRule[] {
  const dir = rulesDir || join(process.cwd(), ".claude", "rules", "paths");
  const entries = readMarkdownFiles(dir);

  const rules: PathRule[] = entries.map((entry) => {
    const { data, body } = parseFrontmatter(entry.content);
    return buildRule(entry.name, data, body);
  });

  return rules.sort((a, b) => b.priority - a.priority);
}

function buildGlobRegex(pattern: string): RegExp {
  const normalized = pattern.replace(/\\/g, "/");
  let regex = normalized
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(/\{\{GLOBSTAR\}\}/g, ".*");

  if (!regex.startsWith("/") && !regex.startsWith(".*")) {
    regex = "(^|.*/)" + regex;
  }

  return new RegExp("^" + regex + "$");
}

export function globMatch(pattern: string, filePath: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, "/");
  return buildGlobRegex(pattern).test(normalizedPath);
}

export function matchRules(filePath: string, rules?: PathRule[]): PathMatch[] {
  const allRules = rules || loadPathRules();
  const matches: PathMatch[] = [];

  for (const rule of allRules) {
    for (const glob of rule.globs) {
      if (globMatch(glob, filePath)) {
        matches.push({ rule, matchedGlob: glob });
        break;
      }
    }
  }

  return matches.sort((a, b) => b.rule.priority - a.rule.priority);
}

export function getSkillsForPath(
  filePath: string,
  rules?: PathRule[],
): string[] {
  const matches = matchRules(filePath, rules);
  const seen = new Set<string>();
  const skills: string[] = [];

  for (const match of matches) {
    for (const skill of match.rule.skills) {
      if (!seen.has(skill)) {
        seen.add(skill);
        skills.push(skill);
      }
    }
  }

  return skills;
}

export function getKeywordsForPath(
  filePath: string,
  rules?: PathRule[],
): string[] {
  const matches = matchRules(filePath, rules);
  const keywords: string[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    for (const kw of match.rule.keywords) {
      if (!seen.has(kw)) {
        seen.add(kw);
        keywords.push(kw);
      }
    }
  }

  return keywords;
}
