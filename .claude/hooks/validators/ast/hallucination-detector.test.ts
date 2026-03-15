import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { join } from "node:path";
import { tmpdir, homedir } from "node:os";
import {
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";

const DETECTOR_PATH = join(import.meta.dir, "hallucination-detector.ts");

interface TestInput {
  tool_name: string;
  tool_input: {
    file_path?: string;
    content?: string;
    command?: string;
  };
  tool_output: string;
}

function makeImportLine(name: string, specifier: string): string {
  return "import { " + name + ' } from "' + specifier + '";';
}

async function runDetector(
  input: TestInput,
): Promise<{ exitCode: number; stderr: string }> {
  const inputJson = JSON.stringify(input);

  const proc = Bun.spawn([process.execPath, DETECTOR_PATH], {
    stdin: new Blob([inputJson]),
    stdout: "pipe",
    stderr: "pipe",
  });

  const exitCode = await proc.exited;
  const stderr = await new Response(proc.stderr).text();

  return { exitCode, stderr };
}

describe("hallucination-detector", () => {
  const tempDir = join(import.meta.dir, "__test_temp_ast__");
  const existingModule = join(tempDir, "utils.ts");

  beforeAll(() => {
    mkdirSync(tempDir, { recursive: true });
    writeFileSync(
      existingModule,
      "export function add(a: number, b: number): number { return a + b; }\n",
    );
  });

  afterAll(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // best effort
    }
  });

  test("exits 0 for non-TypeScript files", async () => {
    const content = makeImportLine("foo", "./ghost") + "\n";
    const result = await runDetector({
      tool_name: "Write",
      tool_input: {
        file_path: join(tempDir, "test.js"),
        content,
      },
      tool_output: "File written",
    });

    expect(result.exitCode).toBe(0);
  });

  test("exits 0 for empty TypeScript file", async () => {
    const result = await runDetector({
      tool_name: "Write",
      tool_input: {
        file_path: join(tempDir, "empty.ts"),
        content: "",
      },
      tool_output: "File written",
    });

    expect(result.exitCode).toBe(0);
  });

  test("exits 0 when file_path is not provided", async () => {
    const result = await runDetector({
      tool_name: "Bash",
      tool_input: {
        command: "echo hello",
      },
      tool_output: "hello",
    });

    expect(result.exitCode).toBe(0);
  });

  test("exits 0 for clean node:fs import", async () => {
    const line = makeImportLine("readFileSync", "node:fs");
    const result = await runDetector({
      tool_name: "Write",
      tool_input: {
        file_path: join(tempDir, "clean-node.ts"),
        content: line + "\nconsole.log(readFileSync);\n",
      },
      tool_output: "File written",
    });

    expect(result.exitCode).toBe(0);
  });

  test("exits 0 for bun builtin import", async () => {
    const line = makeImportLine("serve", "bun");
    const result = await runDetector({
      tool_name: "Write",
      tool_input: {
        file_path: join(tempDir, "clean-bun.ts"),
        content: line + "\nconsole.log(serve);\n",
      },
      tool_output: "File written",
    });

    expect(result.exitCode).toBe(0);
  });

  test("detects phantom relative import", async () => {
    const line = makeImportLine("foo", "./ghost");
    const result = await runDetector({
      tool_name: "Write",
      tool_input: {
        file_path: join(tempDir, "bad-import.ts"),
        content: line + "\nconsole.log(foo);\n",
      },
      tool_output: "File written",
    });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("phantom_import");
    expect(result.stderr).toContain("ghost");
  });

  test("exits 0 for whitespace-only content", async () => {
    const result = await runDetector({
      tool_name: "Write",
      tool_input: {
        file_path: join(tempDir, "whitespace.ts"),
        content: "   \n\n  \t  \n",
      },
      tool_output: "File written",
    });

    expect(result.exitCode).toBe(0);
  });

  test("exits 0 for file with only type declarations", async () => {
    const result = await runDetector({
      tool_name: "Write",
      tool_input: {
        file_path: join(tempDir, "types-only.ts"),
        content:
          "export interface User { id: string; name: string; }\n" +
          "export type Status = 'active' | 'inactive';\n",
      },
      tool_output: "File written",
    });

    expect(result.exitCode).toBe(0);
  });

  test("detects phantom symbol for non-existent function call", async () => {
    const content =
      "const result = nonExistentFunction(42);\nconsole.log(result);\n";
    const result = await runDetector({
      tool_name: "Write",
      tool_input: {
        file_path: join(tempDir, "phantom-symbol.ts"),
        content,
      },
      tool_output: "File written",
    });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("phantom_symbol");
  });

  test("detects wrong arity as warning (exit 0, not blocking)", async () => {
    const content = [
      "function greet(name: string, age: number): string {",
      "  return name + String(age);",
      "}",
      'const x = greet("hello", 42, "extra", true);',
      "",
    ].join("\n");

    const result = await runDetector({
      tool_name: "Write",
      tool_input: {
        file_path: join(tempDir, "wrong-arity.ts"),
        content,
      },
      tool_output: "File written",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("wrong_arity");
  });

  test("exits 0 for file in directory with no tsconfig (fallback)", async () => {
    const isolatedDir = join(tmpdir(), "__ast_no_tsconfig_" + Date.now() + "__");
    mkdirSync(isolatedDir, { recursive: true });

    try {
      const filePath = join(isolatedDir, "simple.ts");
      const content = "const x: number = 42;\nconsole.log(x);\n";

      const result = await runDetector({
        tool_name: "Write",
        tool_input: {
          file_path: filePath,
          content,
        },
        tool_output: "File written",
      });

      expect(result.exitCode).toBe(0);
    } finally {
      try {
        rmSync(isolatedDir, { recursive: true, force: true });
      } catch {
        // best effort
      }
    }
  });

  test("records hallucination to error-patterns JSONL (SPEC-009)", async () => {
    const patternsPath = join(homedir(), ".claude", "error-patterns.jsonl");

    let originalContent = "";
    if (existsSync(patternsPath)) {
      originalContent = readFileSync(patternsPath, "utf-8");
    }

    try {
      const line = makeImportLine("bar", "./nonexistent-spec009");
      const result = await runDetector({
        tool_name: "Write",
        tool_input: {
          file_path: join(tempDir, "spec009-test.ts"),
          content: line + "\nconsole.log(bar);\n",
        },
        tool_output: "File written",
      });

      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("phantom_import");

      expect(existsSync(patternsPath)).toBe(true);
      const updatedContent = readFileSync(patternsPath, "utf-8");
      expect(updatedContent).toContain("phantom_import");
    } finally {
      if (originalContent) {
        writeFileSync(patternsPath, originalContent);
      } else {
        try {
          rmSync(patternsPath, { force: true });
        } catch {
          // best effort
        }
      }
    }
  });
});
