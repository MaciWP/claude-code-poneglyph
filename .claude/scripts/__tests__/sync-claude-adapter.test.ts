import { describe, expect, it } from "bun:test";
import { stripFrontmatter } from "../../commands/sync-claude.ts";

describe("system-prompt twin generation (output style = SSOT)", () => {
  const style = `---\nname: Poneglyph\nkeep-coding-instructions: true\n# SSOT — edit THIS file\n---\n\n# Poneglyph\n\nLaw body here.\n`;

  it("strips the frontmatter (YAML comments included) leaving a clean body", () => {
    const body = stripFrontmatter(style);
    expect(body).toStartWith("# Poneglyph");
    expect(body).toContain("Law body here.");
    expect(body).not.toContain("---");
    expect(body).not.toContain("keep-coding-instructions");
  });

  it("passes through content without frontmatter untouched", () => {
    expect(stripFrontmatter("# Solo cuerpo\n")).toBe("# Solo cuerpo\n");
  });

  it("is idempotent and trailing-whitespace stable", () => {
    const once = stripFrontmatter(style);
    expect(stripFrontmatter(once)).toBe(once);
    expect(stripFrontmatter(style + "\n\n")).toBe(once);
  });
});
