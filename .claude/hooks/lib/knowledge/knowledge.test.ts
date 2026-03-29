import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { writeEntry, readEntry, archive, supersede } from "./graph";
import { loadGraph, saveEntry } from "./graph-storage";
import { validate, buildFullEntry } from "./graph-entry";
import {
  queryKnowledge,
  checkStaleness,
  filterByConfidence,
  filterByAge,
} from "./query";
import type { KnowledgeEntry } from "./types";

function makeTmpDir(): string {
  const dir = join(tmpdir(), `knowledge-test-${crypto.randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function graphPath(dir: string): string {
  return join(dir, "graph.jsonl");
}

function makePartial(
  overrides: Partial<KnowledgeEntry> = {},
): Partial<KnowledgeEntry> {
  return {
    category: "gotcha",
    subject: "test-subject",
    content: "some test content here",
    provenance: {
      agent: "builder",
      session: "sess-1",
      confidence: 0.7,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      validatedBy: [],
    },
    scope: {},
    ...overrides,
  };
}

let tmpDir: string;

beforeEach(() => {
  tmpDir = makeTmpDir();
});

afterEach(() => {
  try {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  } catch {
    // best effort cleanup
  }
});

describe("Knowledge Graph", () => {
  it("should write and read entry", () => {
    const gp = graphPath(tmpDir);
    const written = writeEntry(makePartial(), gp);

    expect(written.id).toBeTruthy();
    expect(written.category).toBe("gotcha");
    expect(written.subject).toBe("test-subject");
    expect(written.provenance.createdAt).toBeTruthy();

    const found = readEntry(written.id, gp);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(written.id);
    expect(found!.subject).toBe("test-subject");
  });

  it("should supersede lower confidence match", () => {
    const gp = graphPath(tmpDir);

    writeEntry(
      makePartial({
        provenance: {
          agent: "scout",
          session: "s1",
          confidence: 0.5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          validatedBy: [],
        },
      }),
      gp,
    );

    const result = writeEntry(
      makePartial({
        provenance: {
          agent: "builder",
          session: "s2",
          confidence: 0.9,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          validatedBy: [],
        },
      }),
      gp,
    );

    expect(result.provenance.confidence).toBe(0.9);
    expect(result.relations.supersedes.length).toBeGreaterThan(0);

    const entries = loadGraph(gp);
    expect(entries.length).toBe(2);
  });

  it("should keep existing when new has lower confidence", () => {
    const gp = graphPath(tmpDir);

    const first = writeEntry(
      makePartial({
        provenance: {
          agent: "reviewer",
          session: "s1",
          confidence: 0.9,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          validatedBy: [],
        },
      }),
      gp,
    );

    const result = writeEntry(
      makePartial({
        provenance: {
          agent: "builder",
          session: "s2",
          confidence: 0.5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          validatedBy: [],
        },
      }),
      gp,
    );

    expect(result.id).toBe(first.id);
    expect(result.provenance.validatedBy).toContain("builder");
  });

  it("should query by category", () => {
    const gp = graphPath(tmpDir);
    writeEntry(
      makePartial({
        category: "pattern",
        subject: "a1",
        content: "alpha content",
      }),
      gp,
    );
    writeEntry(
      makePartial({
        category: "gotcha",
        subject: "b1",
        content: "beta content",
      }),
      gp,
    );
    writeEntry(
      makePartial({
        category: "pattern",
        subject: "c1",
        content: "gamma content",
      }),
      gp,
    );

    const results = queryKnowledge({ categories: ["pattern"] }, gp);
    expect(results.length).toBe(2);
    for (const r of results) {
      expect(r.category).toBe("pattern");
    }
  });

  it("should query with confidence filter", () => {
    const gp = graphPath(tmpDir);

    const confidences = [0.3, 0.5, 0.7, 0.9];
    for (let i = 0; i < confidences.length; i++) {
      writeEntry(
        makePartial({
          subject: `subj-${i}`,
          content: `unique content number ${i}`,
          provenance: {
            agent: "builder",
            session: "s1",
            confidence: confidences[i],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            validatedBy: [],
          },
        }),
        gp,
      );
    }

    const results = queryKnowledge({ minConfidence: 0.6 }, gp);
    expect(results.length).toBe(2);
    for (const r of results) {
      expect(r.provenance.confidence).toBeGreaterThanOrEqual(0.6);
    }
  });

  it("should detect staleness by TTL", () => {
    const tenDaysAgo = new Date(
      Date.now() - 10 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const entry = buildFullEntry(
      makePartial({
        ttl: 7,
        provenance: {
          agent: "builder",
          session: "s1",
          confidence: 0.7,
          createdAt: tenDaysAgo,
          updatedAt: tenDaysAgo,
          validatedBy: [],
        },
      }),
    );

    expect(checkStaleness(entry)).toBe(true);

    const freshEntry = buildFullEntry(makePartial({ ttl: 30 }));
    expect(checkStaleness(freshEntry)).toBe(false);
  });

  it("should handle corrupt JSONL lines", () => {
    const gp = graphPath(tmpDir);
    const validEntry = buildFullEntry(makePartial());
    const content = [
      JSON.stringify(validEntry),
      "this is not valid json{{{",
      "",
      "null",
      JSON.stringify(
        buildFullEntry(
          makePartial({ subject: "second", content: "second entry data" }),
        ),
      ),
    ].join("\n");
    writeFileSync(gp, content + "\n");

    const entries = loadGraph(gp);
    expect(entries.length).toBe(2);
  });

  it("should archive entry so it is not returned by queries", () => {
    const gp = graphPath(tmpDir);
    const written = writeEntry(makePartial(), gp);

    expect(readEntry(written.id, gp)).not.toBeNull();

    archive(written.id, gp);

    expect(readEntry(written.id, gp)).toBeNull();
    const results = queryKnowledge({}, gp);
    expect(results.length).toBe(0);
  });
});
