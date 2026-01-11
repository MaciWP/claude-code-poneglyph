#!/usr/bin/env bun
import { $ } from "bun";
import { existsSync, mkdirSync } from "fs";

const ROOT = process.cwd();
const SERVER_DIR = `${ROOT}/claude-code-ui/server`;
const WEB_DIR = `${ROOT}/claude-code-ui/web`;
const LOGS_DIR = `${ROOT}/.claude/skills/dev-server/logs`;

const BACKEND_PORT = 8080;
const FRONTEND_PORT = 5173;

const isWindows = process.platform === "win32";

async function getPortPid(port: number): Promise<number | null> {
  try {
    if (isWindows) {
      const result = await $`netstat -ano | findstr ":${port} " | findstr "LISTENING"`.text();
      const match = result.trim().split(/\s+/).pop();
      return match ? parseInt(match) : null;
    } else {
      const result = await $`lsof -i :${port} -t 2>/dev/null`.text();
      return result.trim() ? parseInt(result.trim()) : null;
    }
  } catch {
    return null;
  }
}

async function waitForPort(port: number, maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const pid = await getPortPid(port);
    if (pid) return true;
    await Bun.sleep(500);
  }
  return false;
}

if (!existsSync(LOGS_DIR)) {
  mkdirSync(LOGS_DIR, { recursive: true });
}

const backendRunning = await getPortPid(BACKEND_PORT);
const frontendRunning = await getPortPid(FRONTEND_PORT);

if (backendRunning && frontendRunning) {
  console.log(JSON.stringify({
    success: true,
    message: "already_running",
    backend: { pid: backendRunning, port: BACKEND_PORT, status: "Running" },
    frontend: { pid: frontendRunning, port: FRONTEND_PORT, status: "Running" }
  }));
  process.exit(0);
}

const backendLog = Bun.file(`${LOGS_DIR}/backend.log`);
const frontendLog = Bun.file(`${LOGS_DIR}/frontend.log`);

let backendPid: number | null = backendRunning;
let frontendPid: number | null = frontendRunning;

if (!backendRunning) {
  const backend = Bun.spawn(["bun", "run", "dev"], {
    cwd: SERVER_DIR,
    stdout: backendLog,
    stderr: backendLog,
  });
  backend.unref();

  if (await waitForPort(BACKEND_PORT, 20)) {
    backendPid = await getPortPid(BACKEND_PORT);
  }
}

if (!frontendRunning) {
  const frontend = Bun.spawn(["bun", "run", "dev"], {
    cwd: WEB_DIR,
    stdout: frontendLog,
    stderr: frontendLog,
  });
  frontend.unref();

  if (await waitForPort(FRONTEND_PORT, 20)) {
    frontendPid = await getPortPid(FRONTEND_PORT);
  }
}

const result = {
  success: !!(backendPid && frontendPid),
  backend: {
    pid: backendPid,
    port: BACKEND_PORT,
    status: backendPid ? "Running" : "Failed",
    url: `http://localhost:${BACKEND_PORT}`
  },
  frontend: {
    pid: frontendPid,
    port: FRONTEND_PORT,
    status: frontendPid ? "Running" : "Failed",
    url: `http://localhost:${FRONTEND_PORT}`
  },
  logs: LOGS_DIR
};

console.log(JSON.stringify(result));
process.exit(result.success ? 0 : 1);
