# Claude Code Poneglyph - Context for Gemini

This file provides essential context, architecture details, and operational guidelines for working on the **Claude Code Poneglyph** project.

## 1. Project Overview

**Claude Code Poneglyph** is a UI wrapper and orchestration layer for "Claude Code". It allows users to interact with Claude Code either through a headless SDK or an interactive CLI spawn mode, providing a web-based interface for observability and management.

### Core Architecture
*   **Frontend:** React 18 + Vite + TailwindCSS (running on port `5173`)
*   **Backend:** Bun 1.x + Elysia (running on port `8080`)
*   **Communication:** HTTP for REST endpoints, WebSocket (`/ws`) for real-time streaming.
*   **Integration:**
    *   **SDK Mode:** Uses `@anthropic-ai/claude-agent-sdk` for automated, headless tasks.
    *   **CLI Spawn Mode:** Uses `child_process.spawn('claude', ...)` to retain full interactive capabilities (commands, skills, agents).

## 2. Directory Structure

```text
/Users/oriol/Desktop/Bjumper/PERSONAL/REPO/claude-code-poneglyph/
├── claude-code-ui/             # Main Application Code
│   ├── server/                 # Backend (Bun + Elysia)
│   │   ├── src/index.ts        # Entry point (HTTP + WS)
│   │   ├── src/services/       # Core logic (Claude wrapper, Sessions)
│   │   └── package.json
│   └── web/                    # Frontend (React + Vite)
│       ├── src/App.tsx         # Main component
│       ├── src/components/     # UI Components
│       └── package.json
├── .claude/                    # Claude Code Configuration
│   ├── agents/                 # Custom Agent Definitions
│   ├── commands/               # Slash Commands
│   └── skills/                 # Activable Skills
├── .codex/                     # "Poneglyph" Meta-Agent Skills
│   └── skills/                 # Skills for agents like 'architect', 'builder'
├── CLAUDE.md                   # Project Documentation & Rules
├── AGENTS.md                   # Agent Operational Guide
└── PLAN.md                     # Roadmap/Plan
```

## 3. Building and Running

The project relies on **Bun**. Ensure Bun 1.x is available.

### Development (Dual Terminal)

1.  **Backend:**
    ```bash
    cd claude-code-ui/server
    bun install
    bun run dev
    # Server starts on http://localhost:8080
    ```

2.  **Frontend:**
    ```bash
    cd claude-code-ui/web
    bun install
    bun run dev
    # Frontend starts on http://localhost:5173
    ```

### Production Build
```bash
# Build Frontend
cd claude-code-ui/web
bun run build

# Start Server (serves API + Static Frontend)
cd claude-code-ui/server
bun run start
```

## 4. Development Conventions

*   **Runtime:** STRICTLY use **Bun**. Do not use Node.js or npm unless explicitly necessary.
*   **Language:** TypeScript for both backend and frontend.
*   **Style:**
    *   Type hints on all functions.
    *   Use `async/await` over callbacks.
    *   Imports must be at the top level.
    *   Minimal "YOLO" comments (explain *why*, not *what*).
*   **Cross-Platform:** The CLI spawn mode uses `shell: true` to ensure compatibility with Windows and macOS.

## 5. Anti-Hallucination & Safety Rules

When working in this environment, adhere to the strict validation protocols defined in `CLAUDE.md`:

1.  **File Validation:** NEVER assume a file exists. Use `glob` or `ls` to verify before referencing.
2.  **Function Validation:** NEVER assume a function exists. Use `grep` or `search_file_content` to verify existence in the codebase.
3.  **Read Before Edit:** ALWAYS read a file's content using `read_file` before attempting to modify it.
4.  **Confidence Check:**
    *   **Frontend:** < 65% confidence -> **ASK** the user.
    *   **Backend:** < 70% confidence -> **ASK** the user.

## 6. Key API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/sessions` | List active sessions |
| `POST` | `/api/sessions` | Create a new session |
| `POST` | `/api/execute` | Execute prompt via **SDK** |
| `POST` | `/api/execute-cli` | Execute prompt via **CLI Spawn** |
| `WS` | `/ws` | WebSocket for real-time output streaming |
