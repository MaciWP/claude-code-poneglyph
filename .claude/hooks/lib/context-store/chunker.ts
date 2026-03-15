const CHARS_PER_TOKEN = 4;

function isCodeBlock(text: string): boolean {
  return text.startsWith("```") && text.endsWith("```");
}

function isEmpty(text: string): boolean {
  return !text || text.trim().length === 0;
}

function pushTrimmed(chunks: string[], text: string): void {
  const trimmed = text.trim();
  if (trimmed.length > 0) chunks.push(trimmed);
}

function joinWith(existing: string, addition: string, sep: string): string {
  return existing ? existing + sep + addition : addition;
}

/**
 * Split text into chunks suitable for FTS5 indexing.
 * Preserves code blocks intact, splits on headings and paragraph breaks.
 */
export function chunkText(
  text: string,
  maxChunkTokens: number = 500,
): string[] {
  if (isEmpty(text)) return [];

  const maxChars = maxChunkTokens * CHARS_PER_TOKEN;
  const chunks: string[] = [];
  const parts = text.split(/(```[\s\S]*?```)/g);

  for (const part of parts) {
    if (isEmpty(part)) continue;

    if (isCodeBlock(part)) {
      chunks.push(part.trim());
      continue;
    }

    splitBySections(part, maxChars, chunks);
  }

  return chunks.filter((c) => c.length > 0);
}

function splitBySections(
  text: string,
  maxChars: number,
  chunks: string[],
): void {
  const sections = text.split(/(?=^#{1,6}\s)/m);

  for (const section of sections) {
    if (isEmpty(section)) continue;

    if (section.length <= maxChars) {
      chunks.push(section.trim());
    } else {
      splitByParagraphs(section, maxChars, chunks);
    }
  }
}

function splitByParagraphs(
  section: string,
  maxChars: number,
  chunks: string[],
): void {
  const paragraphs = section.split(/\n\n+/);
  let current = "";

  for (const para of paragraphs) {
    if (isEmpty(para)) continue;

    if (current.length + para.length + 2 <= maxChars) {
      current = joinWith(current, para, "\n\n");
      continue;
    }

    pushTrimmed(chunks, current);

    if (para.length > maxChars) {
      splitByLines(para, maxChars, chunks);
      current = "";
    } else {
      current = para;
    }
  }
  pushTrimmed(chunks, current);
}

function splitByChars(text: string, maxChars: number, chunks: string[]): void {
  let offset = 0;
  while (offset < text.length) {
    pushTrimmed(chunks, text.slice(offset, offset + maxChars));
    offset += maxChars;
  }
}

function splitByLines(
  para: string,
  maxChars: number,
  chunks: string[],
): void {
  const lines = para.split("\n");
  let current = "";

  for (const line of lines) {
    if (line.length > maxChars) {
      pushTrimmed(chunks, current);
      splitByChars(line, maxChars, chunks);
      current = "";
      continue;
    }
    if (current.length + line.length + 1 <= maxChars) {
      current = joinWith(current, line, "\n");
    } else {
      pushTrimmed(chunks, current);
      current = line;
    }
  }
  pushTrimmed(chunks, current);
}
