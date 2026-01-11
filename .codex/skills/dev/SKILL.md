---
name: dev
description: Start or restart the dev servers (Bun backend + Vite frontend) for claude-code-ui when asked to run the dev environment.
---

# Dev Server Management

1. Check for running Bun dev processes and stop them if needed.
2. Start the backend: `cd claude-code-ui/server && bun run dev`.
3. Start the frontend: `cd claude-code-ui/web && bun run dev`.
4. Report URLs (default: `http://localhost:8080` and `http://localhost:5173`).
5. If ports differ, report the actual ports from the command output.
