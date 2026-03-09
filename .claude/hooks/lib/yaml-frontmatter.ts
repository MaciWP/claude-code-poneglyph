import { readdirSync, readFileSync } from "fs";
import { join } from "path";

function stripQuotes(s: string): string {
  return s.replace(/^["']|["']$/g, "");
}

function parseArrayItem(trimmed: string): string {
  return stripQuotes(trimmed.slice(2).trim());
}

function parseInlineArray(value: string): string[] {
  return value
    .slice(1, -1)
    .split(",")
    .map((s) => stripQuotes(s.trim()));
}

function parseValue(value: string): unknown {
  if (!value) return undefined;

  if (value.startsWith("[") && value.endsWith("]")) {
    return parseInlineArray(value);
  }

  if (/^\d+$/.test(value)) return parseInt(value, 10);

  return stripQuotes(value);
}

function parseYamlLines(yamlStr: string): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  let currentKey = "";
  let currentArray: string[] | null = null;

  for (const line of yamlStr.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed.startsWith("- ") && currentKey) {
      if (!currentArray) currentArray = [];
      currentArray.push(parseArrayItem(trimmed));
      data[currentKey] = currentArray;
      continue;
    }

    const kvMatch = trimmed.match(/^(\w+)\s*:\s*(.*)$/);
    if (kvMatch) {
      if (currentArray) currentArray = null;
      currentKey = kvMatch[1];
      const value = kvMatch[2].trim();

      if (!value) {
        currentArray = [];
        continue;
      }

      data[currentKey] = parseValue(value);
    }
  }

  return data;
}

export function parseFrontmatter(content: string): {
  data: Record<string, unknown>;
  body: string;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: content };

  return { data: parseYamlLines(match[1]), body: match[2].trim() };
}

export function readMarkdownFiles(
  dir: string,
): Array<{ name: string; content: string }> {
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }

  return files.map((file) => ({
    name: file.replace(/\.md$/, ""),
    content: readFileSync(join(dir, file), "utf-8"),
  }));
}
