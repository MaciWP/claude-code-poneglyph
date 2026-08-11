import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { buildCodexLinks, linkMethodFor, linkStatus, PORTABLE_SKILLS } from "../sync-codex.ts";

describe("Codex adapter topology", () => {
  const links = buildCodexLinks("/repo", "/home/oriol");

  it("links one global doctrine and the portable skill allowlist", () => {
    expect(links).toEqual([
      {
        source: "/repo/CLAUDE.md",
        dest: "/home/oriol/.codex/AGENTS.md",
        type: "file",
      },
      ...PORTABLE_SKILLS.map((name) => ({
        source: path.join("/repo", ".claude", "skills", name),
        dest: path.join("/home/oriol", ".codex", "skills", name),
        type: "directory",
      })),
    ]);
  });

  it("keeps Claude-only hooks and commands out of the Codex adapter", () => {
    expect(PORTABLE_SKILLS).toEqual(["dev", "verify", "anti-hallucination"]);
  });
});

describe("Windows install fallback", () => {
  it("maps install method by platform: symlink on POSIX, junction/copy on win32", () => {
    expect(linkMethodFor("file", "darwin")).toBe("symlink");
    expect(linkMethodFor("directory", "linux")).toBe("symlink");
    expect(linkMethodFor("directory", "win32")).toBe("junction");
    expect(linkMethodFor("file", "win32")).toBe("copy");
  });

  it("treats a content-equal doctrine copy as linked on win32, local elsewhere", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "codex-copy-"));
    const link = {
      source: path.join(dir, "CLAUDE.md"),
      dest: path.join(dir, "AGENTS.md"),
      type: "file" as const,
    };
    writeFileSync(link.source, "doctrine body\n");
    writeFileSync(link.dest, "doctrine body\n");
    expect(linkStatus(link, "win32")).toBe("linked");
    expect(linkStatus(link, "darwin")).toBe("local");
  });

  it("flags a stale copy as local on win32 (needs re-sync, not silence)", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "codex-stale-"));
    const link = {
      source: path.join(dir, "CLAUDE.md"),
      dest: path.join(dir, "AGENTS.md"),
      type: "file" as const,
    };
    writeFileSync(link.source, "doctrine v2\n");
    writeFileSync(link.dest, "doctrine v1\n");
    expect(linkStatus(link, "win32")).toBe("local");
  });
});
