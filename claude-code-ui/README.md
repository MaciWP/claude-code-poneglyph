# Claude Code UI

Web UI for Claude Code with real-time terminal and observability.

## Stack

- **Backend**: Bun + Elysia (HTTP + WebSocket)
- **Frontend**: React 18 + Vite + TailwindCSS
- **SDK**: @anthropic-ai/claude-agent-sdk
- **CLI**: child_process.spawn (cross-platform)

## Execution Modes

| Mode | Endpoint | Use Case |
|------|----------|----------|
| **SDK** | `/api/execute` | Headless, automated tasks |
| **CLI Spawn** | `/api/execute-cli` | Interactive, commands, skills, agents |

## Quick Start

### Prerequisites

- Bun 1.x (`brew install bun` or https://bun.sh)
- Claude Code CLI installed (`claude` command available)

### Development

```bash
# Install dependencies
cd claude-code-ui
cd server && bun install
cd ../web && bun install

# Run backend (port 8080)
cd server && bun run dev

# Run frontend (port 5173) - in another terminal
cd web && bun run dev
```

### Production

```bash
# Build frontend
cd web && bun run build

# Run server (serves both API and static files)
cd server && bun run start
```

Open http://localhost:8080

## Project Structure

```
claude-code-ui/
├── server/                 # Backend Bun/Elysia
│   ├── package.json
│   └── src/
│       ├── index.ts        # HTTP + WebSocket server
│       └── services/
│           ├── claude.ts   # SDK + CLI spawn wrapper
│           └── sessions.ts # Session persistence
└── web/                    # React frontend
    └── src/
        ├── App.tsx
        ├── components/
        │   ├── Chat.tsx        # Chat interface
        │   └── SessionList.tsx # Session sidebar
        └── lib/
            └── api.ts          # API client
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/sessions` | List sessions |
| POST | `/api/sessions` | Create session |
| POST | `/api/execute` | Execute via SDK |
| POST | `/api/execute-cli` | Execute via CLI spawn |
| WS | `/ws` | Streaming (SDK or CLI) |

## Features

- **SDK Mode**: Headless execution via @anthropic-ai/claude-agent-sdk
- **CLI Mode**: Full Claude Code capabilities (commands, skills, agents)
- **Sessions**: Create, resume, delete sessions
- **Streaming**: Real-time output via WebSocket
- **Cross-Platform**: Mac and Windows support (shell: true)
