import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  Project,
  ScriptTarget,
  ModuleKind,
  ModuleResolutionKind,
} from "ts-morph";
import type { SourceFile } from "ts-morph";
import { checkImports } from "./checkers/import-checker";
import { checkSymbols } from "./checkers/symbol-checker";
import { checkArity } from "./checkers/arity-checker";
import { checkProperties } from "./checkers/property-checker";
import { checkTypes } from "./checkers/type-checker";
import type { Hallucination } from "./types";

function createBenchProject(): Project {
  return new Project({
    compilerOptions: {
      target: ScriptTarget.ESNext,
      module: ModuleKind.ESNext,
      moduleResolution: ModuleResolutionKind.Bundler,
      strict: true,
      skipLibCheck: true,
    },
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
  });
}

const SYNTHETIC_FILE = `
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve, dirname, basename, extname } from "node:path";
import { platform, homedir, tmpdir, cpus, hostname } from "node:os";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createServer, request as httpRequest } from "node:http";
import { parse as urlParse, format as urlFormat, URL as NodeURL } from "node:url";
import { Readable, Writable, Transform, pipeline } from "node:stream";
import { Buffer as NodeBuffer } from "node:buffer";
import { EventEmitter } from "node:events";
import { inspect, promisify, deprecate, types } from "node:util";
import { strict as assertStrict, deepStrictEqual } from "node:assert";
import { execSync, spawn, fork } from "node:child_process";
import { createConnection, Socket } from "node:net";
import { connect as tlsConnect } from "node:tls";
import { lookup, resolve as dnsResolve } from "node:dns";
import { createGzip, createGunzip, deflateSync } from "node:zlib";
import { Worker, isMainThread, parentPort } from "node:worker_threads";
import { setTimeout as setTimeoutPromise } from "node:timers/promises";
import { open, readFile, writeFile, mkdir } from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { StringDecoder } from "node:string_decoder";
import { Readline } from "node:readline/promises";
import { performance as perfHooks } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isIP, isIPv4, isIPv6 } from "node:net";
import { EOL, arch, release, type as osType } from "node:os";
import { sep, delimiter, posix, win32 } from "node:path";
import { env, argv, cwd, exit, pid, ppid } from "node:process";
import { AsyncLocalStorage, AsyncResource } from "node:async_hooks";
import { setImmediate as setImmediatePromise } from "node:timers/promises";

// --- Globals usage (100+ references) ---

const log1 = console.log("start");
const log2 = console.error("err");
const log3 = console.warn("warn");
const log4 = console.info("info");
const log5 = console.debug("debug");
const log6 = console.table([1, 2]);
const log7 = console.time("t");
const log8 = console.timeEnd("t");
const log9 = console.trace("trace");
const log10 = console.dir({ a: 1 });

const m1 = Math.abs(-5);
const m2 = Math.floor(3.7);
const m3 = Math.ceil(3.2);
const m4 = Math.round(3.5);
const m5 = Math.random();
const m6 = Math.max(1, 2, 3);
const m7 = Math.min(1, 2, 3);
const m8 = Math.pow(2, 10);
const m9 = Math.sqrt(16);
const m10 = Math.PI;

const j1 = JSON.stringify({ a: 1 });
const j2 = JSON.parse('{"b":2}');

const a1 = Array.isArray([]);
const a2 = Array.from("hello");
const a3 = Array.of(1, 2, 3);

const o1 = Object.keys({ a: 1 });
const o2 = Object.values({ a: 1 });
const o3 = Object.entries({ a: 1 });
const o4 = Object.assign({}, { a: 1 });
const o5 = Object.freeze({ a: 1 });
const o6 = Object.create(null);

const p1 = Promise.resolve(42);
const p2 = Promise.reject(new Error("fail")).catch(() => {});
const p3 = Promise.all([p1]);
const p4 = Promise.allSettled([p1]);
const p5 = Promise.race([p1]);

const s1 = String.fromCharCode(65);
const n1 = Number.isInteger(42);
const n2 = Number.isFinite(42);
const n3 = Number.isNaN(NaN);
const n4 = Number.parseInt("42", 10);
const n5 = Number.parseFloat("3.14");

const b1 = Boolean(1);
const sym1 = Symbol("test");
const sym2 = Symbol.for("shared");

const d1 = Date.now();
const d2 = new Date().toISOString();
const d3 = new Date().getTime();

const r1 = new RegExp("test", "gi");
const r2 = /hello/i.test("Hello");

const e1 = new Error("test");
const e2 = new TypeError("type err");
const e3 = new RangeError("range err");

const enc = new TextEncoder();
const dec = new TextDecoder();
const encoded = enc.encode("hello");
const decoded = dec.decode(encoded);

const u1 = new URL("https://example.com");
const u2 = new URLSearchParams("a=1&b=2");

const ac = new AbortController();
const signal = ac.signal;

const fe = fetch("https://example.com").catch(() => {});

const se = structuredClone({ nested: { value: 42 } });

const g1 = globalThis.setTimeout(() => {}, 0);
const g2 = globalThis.clearTimeout(g1);

const int1 = parseInt("42", 10);
const fl1 = parseFloat("3.14");
const nan1 = isNaN(NaN);
const fin1 = isFinite(42);

const qm = queueMicrotask(() => {});

const pf1 = performance.now();

// --- Function declarations with correct arity ---

function add(a: number, b: number): number {
  return a + b;
}

function greet(name: string, greeting?: string): string {
  return (greeting ?? "Hello") + " " + name;
}

function sum(...nums: number[]): number {
  return nums.reduce((acc, n) => acc + n, 0);
}

function formatUser(name: string, age: number, email: string): string {
  return name + " " + age + " " + email;
}

function multiply(x: number, y: number, z: number = 1): number {
  return x * y * z;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function repeat(str: string, times: number): string {
  return str.repeat(times);
}

function padLeft(str: string, length: number, char: string = " "): string {
  return str.padStart(length, char);
}

function range(start: number, end: number, step: number = 1): number[] {
  const result: number[] = [];
  for (let i = start; i < end; i += step) {
    result.push(i);
  }
  return result;
}

function compose<T>(f: (x: T) => T, g: (x: T) => T): (x: T) => T {
  return (x: T) => f(g(x));
}

function identity<T>(x: T): T {
  return x;
}

function pipe<A, B, C>(f: (a: A) => B, g: (b: B) => C): (a: A) => C {
  return (a: A) => g(f(a));
}

// --- Calls with correct arity ---
const r_add = add(1, 2);
const r_greet1 = greet("World");
const r_greet2 = greet("World", "Hi");
const r_sum = sum(1, 2, 3, 4, 5);
const r_format = formatUser("Alice", 30, "alice@test.com");
const r_mul1 = multiply(2, 3);
const r_mul2 = multiply(2, 3, 4);
const r_clamp = clamp(15, 0, 10);
const r_repeat = repeat("ab", 3);
const r_pad = padLeft("hello", 10);
const r_range = range(0, 10);
const r_id = identity(42);

// --- Typed objects with property accesses ---

interface UserProfile {
  id: string;
  name: string;
  email: string;
  age: number;
  active: boolean;
  metadata: Record<string, unknown>;
}

interface ServerConfig {
  host: string;
  port: number;
  ssl: boolean;
  timeout: number;
  maxConnections: number;
}

interface DatabaseConnection {
  url: string;
  poolSize: number;
  connected: boolean;
  driver: string;
}

interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  timestamp: number;
}

interface LogEntry {
  level: string;
  message: string;
  timestamp: number;
  source: string;
  context: Record<string, unknown>;
}

interface FileInfo {
  path: string;
  size: number;
  isDirectory: boolean;
  createdAt: Date;
  modifiedAt: Date;
}

interface CacheOptions {
  ttl: number;
  maxSize: number;
  strategy: string;
}

interface TaskResult {
  success: boolean;
  duration: number;
  output: string;
  errors: string[];
}

interface NetworkStats {
  latency: number;
  bandwidth: number;
  packetLoss: number;
  uptime: number;
}

interface BuildConfig {
  entry: string;
  outDir: string;
  minify: boolean;
  sourcemap: boolean;
  target: string;
}

const user: UserProfile = {
  id: "u1",
  name: "Alice",
  email: "alice@test.com",
  age: 30,
  active: true,
  metadata: {},
};
const _uid = user.id;
const _uname = user.name;
const _uemail = user.email;
const _uage = user.age;

const config: ServerConfig = {
  host: "localhost",
  port: 8080,
  ssl: false,
  timeout: 30000,
  maxConnections: 100,
};
const _chost = config.host;
const _cport = config.port;
const _cssl = config.ssl;

const db: DatabaseConnection = {
  url: "postgres://localhost",
  poolSize: 10,
  connected: true,
  driver: "pg",
};
const _dburl = db.url;
const _dbpool = db.poolSize;

const resp: ApiResponse<string> = {
  data: "ok",
  status: 200,
  message: "success",
  timestamp: Date.now(),
};
const _rdata = resp.data;
const _rstatus = resp.status;

const logEntry: LogEntry = {
  level: "info",
  message: "started",
  timestamp: Date.now(),
  source: "app",
  context: {},
};
const _llevel = logEntry.level;
const _lmsg = logEntry.message;

const fileInfo: FileInfo = {
  path: "/tmp/test",
  size: 1024,
  isDirectory: false,
  createdAt: new Date(),
  modifiedAt: new Date(),
};
const _fpath = fileInfo.path;
const _fsize = fileInfo.size;

const cache: CacheOptions = { ttl: 3600, maxSize: 1000, strategy: "lru" };
const _cttl = cache.ttl;

const task: TaskResult = {
  success: true,
  duration: 150,
  output: "done",
  errors: [],
};
const _tsuccess = task.success;
const _tduration = task.duration;

const net: NetworkStats = {
  latency: 25,
  bandwidth: 1000,
  packetLoss: 0.01,
  uptime: 99.99,
};
const _nlatency = net.latency;

const build: BuildConfig = {
  entry: "src/index.ts",
  outDir: "dist",
  minify: true,
  sourcemap: true,
  target: "esnext",
};
const _bentry = build.entry;
const _boutdir = build.outDir;

// --- Type references ---
type UserId = string;
type Timestamp = number;
type Handler = (req: Request) => Response;
type Middleware = (next: Handler) => Handler;
type ErrorCode = "NOT_FOUND" | "UNAUTHORIZED" | "INTERNAL";
type LogLevel = "debug" | "info" | "warn" | "error";
type CacheKey = string;
type QueueItem<T> = { value: T; priority: number };
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };
type AsyncFn<T> = () => Promise<T>;
`;

function generateLargeFile(lineCount: number): string {
  const lines: string[] = [];

  lines.push('import { readFileSync } from "node:fs";');
  lines.push('import { join } from "node:path";');
  lines.push('import { createHash } from "node:crypto";');
  lines.push("");

  for (let i = 0; i < Math.floor(lineCount / 5); i++) {
    lines.push(`function fn_${i}(a: number, b: string): string {`);
    lines.push(`  const result = a.toString() + b;`);
    lines.push(`  console.log(result);`);
    lines.push(`  return result;`);
    lines.push(`}`);
  }

  return lines.join("\n");
}

describe("AST hallucination detector benchmark", () => {
  let project: Project;
  let sourceFile: SourceFile;
  let largeSourceFile: SourceFile;

  beforeAll(() => {
    project = createBenchProject();
    sourceFile = project.createSourceFile(
      "/bench/synthetic.ts",
      SYNTHETIC_FILE,
      { overwrite: true },
    );
    const largeContent = generateLargeFile(500);
    largeSourceFile = project.createSourceFile(
      "/bench/large.ts",
      largeContent,
      { overwrite: true },
    );

    // Warm-up pass: TypeChecker lazy-initializes on first use (JIT + ts-morph internals).
    // Without this, the first timed call absorbs ~800ms of one-time init cost.
    checkImports(sourceFile);
    checkSymbols(sourceFile);
    checkArity(sourceFile);
    checkProperties(sourceFile);
    checkTypes(sourceFile);
  });

  afterAll(() => {
    project.getSourceFiles().forEach((sf) => project.removeSourceFile(sf));
  });

  test("all 5 checkers complete in <200ms on 30+ imports and 100+ symbols", () => {
    const timings: Record<string, number> = {};
    const results: Record<string, Hallucination[]> = {};

    const checkers = [
      { name: "import-checker", fn: checkImports },
      { name: "symbol-checker", fn: checkSymbols },
      { name: "arity-checker", fn: checkArity },
      { name: "property-checker", fn: checkProperties },
      { name: "type-checker", fn: checkTypes },
    ] as const;

    const totalStart = performance.now();

    for (const checker of checkers) {
      const start = performance.now();
      results[checker.name] = checker.fn(sourceFile);
      timings[checker.name] = performance.now() - start;
    }

    const totalMs = performance.now() - totalStart;

    console.log("--- Benchmark: all checkers (30+ imports, 100+ symbols) ---");
    for (const [name, ms] of Object.entries(timings)) {
      console.log(
        `  ${name}: ${ms.toFixed(2)}ms (${results[name].length} findings)`,
      );
    }
    console.log(`  TOTAL: ${totalMs.toFixed(2)}ms`);

    expect(totalMs).toBeLessThan(200);
  });

  test("individual checker latencies", () => {
    const importStart = performance.now();
    checkImports(sourceFile);
    const importMs = performance.now() - importStart;

    const symbolStart = performance.now();
    checkSymbols(sourceFile);
    const symbolMs = performance.now() - symbolStart;

    const arityStart = performance.now();
    checkArity(sourceFile);
    const arityMs = performance.now() - arityStart;

    const propertyStart = performance.now();
    checkProperties(sourceFile);
    const propertyMs = performance.now() - propertyStart;

    const typeStart = performance.now();
    checkTypes(sourceFile);
    const typeMs = performance.now() - typeStart;

    console.log("--- Benchmark: individual checker latency caps ---");
    console.log(`  import-checker:   ${importMs.toFixed(2)}ms (cap: 50ms)`);
    console.log(`  symbol-checker:   ${symbolMs.toFixed(2)}ms (cap: 50ms)`);
    console.log(`  arity-checker:    ${arityMs.toFixed(2)}ms (cap: 50ms)`);
    console.log(`  property-checker: ${propertyMs.toFixed(2)}ms (cap: 50ms)`);
    console.log(`  type-checker:     ${typeMs.toFixed(2)}ms (cap: 50ms)`);

    expect(importMs).toBeLessThan(50);
    expect(symbolMs).toBeLessThan(50);
    expect(arityMs).toBeLessThan(50);
    expect(propertyMs).toBeLessThan(50);
    expect(typeMs).toBeLessThan(50);
  });

  test("handles large file (500+ lines) within budget", () => {
    const checkers = [
      checkImports,
      checkSymbols,
      checkArity,
      checkProperties,
      checkTypes,
    ];

    const start = performance.now();
    for (const checker of checkers) {
      checker(largeSourceFile);
    }
    const totalMs = performance.now() - start;

    console.log(
      `--- Benchmark: large file (${largeSourceFile.getFullText().split("\n").length} lines) ---`,
    );
    console.log(`  TOTAL: ${totalMs.toFixed(2)}ms (cap: 200ms)`);

    expect(totalMs).toBeLessThan(200);
  });
});
