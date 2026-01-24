---
name: dev-server
description: Dev server management - start, stop, restart, status. Manages backend (Elysia :8080) and frontend (Vite :5173)
context: fork
activation:
  keywords:
    - server
    - start
    - stop
    - dev
    - backend
    - frontend
    - levanta
    - arranca
    - para
    - detén
for_agents: [builder]
version: "1.0"
---

# Dev Server Skill

Manage development servers for claude-code-poneglyph.

## Triggers

ES: levanta, arranca, inicia, enciende, prende, lanza, ejecuta, corre, para, detén, mata, tumba, apaga, servidor, servidores, servicios, dev, backend, frontend
EN: start, stop, kill, status, server, running, launch, spin, shut, terminate, dev, backend, frontend

## Services

| Service | Port | Directory | Command |
|---------|------|-----------|---------|
| Backend | 8080 | `claude-code-ui/server` | `bun run dev` |
| Frontend | 5173 | `claude-code-ui/web` | `bun run dev` |

## Usage

Use Claude Code's `run_in_background` feature for persistent dev servers.

### Check Status

```bash
bun .claude/skills/dev-server/scripts/port-status.ts
```

### Start Servers

Use Bash tool with `run_in_background: true` for each server:

```bash
# Backend (run_in_background: true)
cd claude-code-ui/server && bun run dev

# Frontend (run_in_background: true)
cd claude-code-ui/web && bun run dev
```

### Stop Servers

```bash
bun .claude/skills/dev-server/scripts/stop.ts
```

## Workflow

1. Check status with `port-status.ts`
2. If stopped → start using Bash with `run_in_background: true`
3. If running → use `stop.ts` first, then restart
4. Use `TaskOutput` to monitor server logs if needed
5. Show status table with URLs
