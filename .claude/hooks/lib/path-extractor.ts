export interface ExtractedPath {
  path: string;
  line: number;
  context: string;
  hasWildcard: boolean;
}

const PATH_REGEX =
  /(?:\.\/|\.\.\/|\/|apps\/|src\/|\.claude\/|backend\/|frontend\/|tests\/)[\w./\-*]+\.(?:tsx|jsx|ts|js|py|md|json|yaml|yml|sh|html|css)\b/g;

const URL_REGEX = /https?:\/\/\S+/gi;
const COMMIT_LINE_REGEX = /git\s+commit\s+-m/;
const MARKDOWN_LINK_REGEX = /\]\(([^)]+)\)/g;

function isUrl(candidate: string, line: string): boolean {
  const urls = line.match(URL_REGEX) ?? [];
  return urls.some((url) => url.includes(candidate));
}

function isInsideMarkdownLink(candidate: string, line: string): boolean {
  const links = line.match(MARKDOWN_LINK_REGEX) ?? [];
  return links.some((link) => link.includes(candidate) && /https?:/.test(link));
}

export function extractPaths(content: string): ExtractedPath[] {
  const lines = content.split("\n");
  const seen = new Set<string>();
  const results: ExtractedPath[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (COMMIT_LINE_REGEX.test(line)) continue;

    const matches = line.match(PATH_REGEX);
    if (!matches) continue;

    for (const raw of matches) {
      if (isUrl(raw, line) || isInsideMarkdownLink(raw, line)) continue;
      if (seen.has(raw)) continue;
      seen.add(raw);

      results.push({
        path: raw,
        line: i + 1,
        context: line.trim().slice(0, 80),
        hasWildcard: raw.includes("*"),
      });
    }
  }

  return results;
}
