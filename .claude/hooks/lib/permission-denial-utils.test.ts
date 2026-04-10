import { describe, test, expect } from "bun:test";
import {
  normalizeDeniedCall,
  extractCommandPreview,
  extractReason,
  buildDenialMessage,
} from "./permission-denial-utils";

describe("normalizeDeniedCall", () => {
  test("Bash rm -rf /tmp -> 'rm'", () => {
    expect(normalizeDeniedCall("Bash", { command: "rm -rf /tmp" })).toBe("rm");
  });

  test("Bash curl -X POST ... -> 'curl'", () => {
    expect(
      normalizeDeniedCall("Bash", { command: "curl -X POST https://api" }),
    ).toBe("curl");
  });

  test("Bash empty command -> 'bash:unknown'", () => {
    expect(normalizeDeniedCall("Bash", { command: "" })).toBe("bash:unknown");
    expect(normalizeDeniedCall("Bash", {})).toBe("bash:unknown");
  });

  test("Edit .ts file -> '.ts'", () => {
    expect(
      normalizeDeniedCall("Edit", { file_path: "/home/user/src/app.ts" }),
    ).toBe(".ts");
  });

  test("Write .tsx file -> '.tsx'", () => {
    expect(normalizeDeniedCall("Write", { file_path: "C:\\src\\x.TSX" })).toBe(
      ".tsx",
    );
  });

  test("Write file without extension -> 'unknown'", () => {
    expect(normalizeDeniedCall("Write", { file_path: "/bin/Makefile" })).toBe(
      "unknown",
    );
  });

  test("Other tool -> tool name", () => {
    expect(normalizeDeniedCall("WebFetch", { url: "https://x" })).toBe(
      "WebFetch",
    );
  });

  test("missing tool_input for Edit", () => {
    expect(normalizeDeniedCall("Edit", undefined)).toBe("unknown");
  });
});

describe("extractCommandPreview", () => {
  test("Bash truncates to 200", () => {
    const long = "echo " + "a".repeat(500);
    const preview = extractCommandPreview("Bash", { command: long });
    expect(preview.length).toBe(200);
  });

  test("Edit returns file_path", () => {
    expect(extractCommandPreview("Edit", { file_path: "/x/y.ts" })).toBe(
      "/x/y.ts",
    );
  });

  test("Unknown tool -> empty", () => {
    expect(extractCommandPreview("Glob", { pattern: "**/*" })).toBe("");
  });
});

describe("extractReason", () => {
  test("reason string field", () => {
    expect(extractReason({ reason: "auto classifier: destructive" })).toBe(
      "auto classifier: destructive",
    );
  });

  test("denied_by fallback", () => {
    expect(extractReason({ denied_by: "user" })).toBe("user");
  });

  test("message nested in object", () => {
    expect(extractReason({ error: { message: "blocked" } })).toBe("blocked");
  });

  test("no reason fields -> 'unknown'", () => {
    expect(extractReason({})).toBe("unknown");
  });
});

describe("buildDenialMessage", () => {
  test("includes [tool-deny] prefix for classifier", () => {
    const msg = buildDenialMessage("Bash", "rm", "rm -rf /tmp", "destructive");
    expect(msg).toStartWith("[tool-deny] Bash:rm");
    expect(msg).toContain("cmd=rm -rf /tmp");
    expect(msg).toContain("reason=destructive");
  });

  test("omits cmd when preview is empty", () => {
    const msg = buildDenialMessage("WebFetch", "WebFetch", "", "policy");
    expect(msg).toBe("[tool-deny] WebFetch:WebFetch reason=policy");
  });
});
