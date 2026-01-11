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

const backendPid = await getPortPid(BACKEND_PORT);
const frontendPid = await getPortPid(FRONTEND_PORT);

const result = {
  backend: {
    pid: backendPid,
    port: BACKEND_PORT,
    status: backendPid ? "Running" : "Stopped",
    url: `http://localhost:${BACKEND_PORT}`
  },
  frontend: {
    pid: frontendPid,
    port: FRONTEND_PORT,
    status: frontendPid ? "Running" : "Stopped",
    url: `http://localhost:${FRONTEND_PORT}`
  }
};

console.log(JSON.stringify(result));
process.exit(backendPid || frontendPid ? 0 : 1);
