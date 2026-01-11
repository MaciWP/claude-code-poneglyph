#!/usr/bin/env bun
import { $ } from "bun";

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

async function killPort(port: number): Promise<{ killed: boolean; pid: number | null }> {
  const pid = await getPortPid(port);
  if (!pid) return { killed: false, pid: null };

  try {
    if (isWindows) {
      await $`taskkill /F /PID ${pid}`.quiet();
    } else {
      await $`kill -9 ${pid}`.quiet();
    }
    await Bun.sleep(500);
    const stillRunning = await getPortPid(port);
    return { killed: !stillRunning, pid };
  } catch {
    return { killed: false, pid };
  }
}

const backendResult = await killPort(BACKEND_PORT);
const frontendResult = await killPort(FRONTEND_PORT);

const result = {
  backend: {
    pid: backendResult.pid,
    port: BACKEND_PORT,
    status: backendResult.pid ? (backendResult.killed ? "Stopped" : "Failed") : "NotRunning"
  },
  frontend: {
    pid: frontendResult.pid,
    port: FRONTEND_PORT,
    status: frontendResult.pid ? (frontendResult.killed ? "Stopped" : "Failed") : "NotRunning"
  }
};

console.log(JSON.stringify(result));
process.exit(0);
