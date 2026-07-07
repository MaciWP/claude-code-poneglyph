import { describe, test, expect } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// T1.4 (027): importing the shared scan must NOT execute post-compact's main
// (guard verified at post-compact.ts:87) — if the guard ever disappears, this
// import would spray stdout into every test run.
import { openPlansReminder } from "../post-compact";
import { buildSessionStartOutput } from "../session-start-plans";

function plansRootWith(specs: Array<{ name: string; content: string | null }>): string {
  const root = mkdtempSync(join(tmpdir(), "ssp-plans-"));
  for (const s of specs) {
    const dir = join(root, s.name);
    mkdirSync(dir);
    if (s.content !== null) writeFileSync(join(dir, "state.json"), s.content);
  }
  return root;
}

describe("session-start-plans (US1, plan 027)", () => {
  test("T1.1 open plans → reminder with slug + phase, ≤5 lines for 2 plans", () => {
    const root = plansRootWith([
      { name: "031-open", content: JSON.stringify({ feature_closed: false, current_phase: 4 }) },
      { name: "032-closed", content: JSON.stringify({ feature_closed: true, current_phase: "closed" }) },
    ]);
    const out = buildSessionStartOutput(root);
    expect(out).not.toBeNull();
    expect(out).toContain("031-open");
    expect(out).toContain("phase 4");
    expect(out).not.toContain("032-closed");
    expect(out!.split("\n").length).toBeLessThanOrEqual(5);
  });

  test("T1.2 zero open plans / absent root → silent (null)", () => {
    const allClosed = plansRootWith([
      { name: "040-closed", content: JSON.stringify({ feature_closed: true }) },
    ]);
    expect(buildSessionStartOutput(allClosed)).toBeNull();
    expect(buildSessionStartOutput(join(tmpdir(), "ssp-nope-xyz"))).toBeNull();
  });

  test("T1.3 illegible state.json surfaces as unreadable (never hidden)", () => {
    const root = plansRootWith([{ name: "033-bad", content: "{not json" }]);
    const out = buildSessionStartOutput(root);
    expect(out).not.toBeNull();
    expect(out).toContain("033-bad");
    expect(out).toContain("unreadable");
  });

  test("T1.4 shared scan behaves identically via both entry points", () => {
    const root = plansRootWith([
      { name: "050-open", content: JSON.stringify({ feature_closed: false, current_phase: 5 }) },
    ]);
    // Same scan, same output — the hook is a thin main over the shared export.
    expect(buildSessionStartOutput(root)).toBe(openPlansReminder(root));
  });
});
