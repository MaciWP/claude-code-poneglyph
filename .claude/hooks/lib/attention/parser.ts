export interface Section {
  heading: string;
  level: number;
  content: string;
  startLine: number;
  endLine: number;
  keywords: string[];
}

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "shall",
  "can",
  "for",
  "and",
  "nor",
  "but",
  "or",
  "yet",
  "so",
  "in",
  "on",
  "at",
  "to",
  "from",
  "by",
  "with",
  "of",
  "as",
  "if",
  "then",
  "than",
  "that",
  "this",
  "these",
  "those",
  "it",
  "its",
  "not",
  "no",
  "all",
  "each",
  "every",
  "any",
  "some",
  "el",
  "la",
  "los",
  "las",
  "un",
  "una",
  "de",
  "en",
  "con",
  "por",
  "para",
  "del",
  "al",
  "es",
  "son",
  "que",
  "se",
  "si",
  "no",
  "como",
  "mas",
  "pero",
  "cuando",
  "donde",
  "todo",
]);

export function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

function finishSection(
  section: Section,
  contentLines: string[],
  endLine: number,
): void {
  section.content = contentLines.join("\n").trim();
  section.endLine = endLine;
  section.keywords = extractKeywords(section.content);
}

export function extractSections(markdown: string): Section[] {
  const lines = markdown.split("\n");
  const sections: Section[] = [];
  let currentSection: Section | null = null;
  let contentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const headingMatch = lines[i].match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      if (currentSection) {
        finishSection(currentSection, contentLines, i - 1);
        sections.push(currentSection);
      }

      currentSection = {
        heading: headingMatch[2].trim(),
        level: headingMatch[1].length,
        content: "",
        startLine: i,
        endLine: i,
        keywords: [],
      };
      contentLines = [];
    } else if (currentSection) {
      contentLines.push(lines[i]);
    }
  }

  if (currentSection) {
    finishSection(currentSection, contentLines, lines.length - 1);
    sections.push(currentSection);
  }

  return sections;
}

function stripQuotes(s: string): string {
  return s.replace(/^["']|["']$/g, "");
}

export function extractFrontmatterKeywords(markdown: string): string[] {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return [];

  const yaml = match[1];
  const keywords: string[] = [];

  let inKeywords = false;
  for (const line of yaml.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("keywords:")) {
      inKeywords = true;
      const inline = trimmed.match(/keywords:\s*\[(.+)\]/);
      if (inline) {
        keywords.push(
          ...inline[1].split(",").map((s) => stripQuotes(s.trim())),
        );
        inKeywords = false;
      }
      continue;
    }
    if (inKeywords && trimmed.startsWith("- ")) {
      keywords.push(stripQuotes(trimmed.slice(2).trim()));
    } else if (inKeywords && !trimmed.startsWith("- ")) {
      inKeywords = false;
    }
  }

  return keywords;
}
