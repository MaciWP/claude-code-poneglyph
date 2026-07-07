import { describe, test, expect } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openPlansReminder, buildOutput } from "../post-compact";

function plansRootWith(specs: Array<{ name: string; content: string | null }>): string {
  const root = mkdtempSync(join(tmpdir(), "pc-plans-"));
  for (const s of specs) {
    const dir = join(root, s.name);
    mkdirSync(dir);
    if (s.content !== null) writeFileSync(join(dir, "state.json"), s.content);
  }
  return root;
}

describe("openPlansReminder (US2)", () => {
  test("T2.1 lists open plans with slug + phase", () => {
    const root = plansRootWith([
      { name: "010-open", content: JSON.stringify({ feature_closed: false, current_phase: 3 }) },
      { name: "011-closed", content: JSON.stringify({ feature_closed: true, current_phase: "closed" }) },
    ]);
    const out = openPlansReminder(root);
    expect(out).not.toBeNull();
    expect(out).toContain("010-open");
    expect(out).toContain("phase 3");
    expect(out).not.toContain("011-closed"); // closed excluded
  });

  test("T2.2 zero open plans → null; buildOutput omits the section", () => {
    const root = plansRootWith([
      { name: "020-closed", content: JSON.stringify({ feature_closed: true }) },
    ]);
    expect(openPlansReminder(root)).toBeNull();
    expect(buildOutput(root)).not.toContain("Planes /flow abiertos");
  });

  test("T2.2b absent plans root → null (best-effort)", () => {
    expect(openPlansReminder(join(tmpdir(), "pc-nope-xyz"))).toBeNull();
  });

  test("T2.3 malformed/missing state.json does not throw, degrades", () => {
    const root = plansRootWith([
      { name: "030-bad", content: "{not json" },
      { name: "031-nostate", content: null },
      { name: "032-open", content: JSON.stringify({ feature_closed: false, current_phase: 2 }) },
    ]);
    let out: string | null = null;
    expect(() => { out = openPlansReminder(root); }).not.toThrow();
    expect(out).toContain("032-open"); // valid open surfaced
    expect(out).toContain("030-bad"); // illegible SURFACES as unreadable (027/US1, matches flow-state status)
    expect(out).toContain("unreadable");
    expect(out).not.toContain("031-nostate"); // no state.json = not flow-managed, still skipped
  });

  test("buildOutput includes the reminder section when a plan is open", () => {
    const root = plansRootWith([
      { name: "040-open", content: JSON.stringify({ feature_closed: false, current_phase: 4 }) },
    ]);
    const out = buildOutput(root);
    expect(out).toContain("Planes /flow abiertos");
    expect(out).toContain("040-open");
    // existing sections still present (no regression)
    expect(out).toContain("Lead Orchestrator Mode");
    expect(out).toContain("Anti-Hallucination");
  });
});
