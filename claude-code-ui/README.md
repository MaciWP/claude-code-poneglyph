# Claude Code UI

Web UI for Claude Code with real-time terminal and observability.

## Stack

| Layer | Technology |
|-------|------------|
| Backend | Bun + Elysia (HTTP + WebSocket) |
| Frontend | React 18 + Vite + TailwindCSS |
| SDK | @anthropic-ai/claude-agent-sdk |
| CLI | child_process.spawn (cross-platform) |

## Execution Modes

| Mode | Endpoint | Use Case |
|------|----------|----------|
| **SDK** | `/api/execute` | Headless, automated tasks |
| **CLI Spawn** | `/api/execute-cli` | Interactive, commands, skills, agents |

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) 1.x or later
- Claude Code CLI installed (`claude` command available)
- API keys (Anthropic for SDK mode)

### Setup

```bash
# Navigate to project
cd claude-code-ui

# Install dependencies
cd server && bun install
cd ../web && bun install
cd ..

# Configure environment
cp server/.env.example server/.env
# Edit server/.env with your API keys
```

### Development

```bash
# Terminal 1: Backend (port 8080)
cd server && bun run dev

# Terminal 2: Frontend (port 5173)
cd web && bun run dev
```

Open http://localhost:5173 (Vite dev server with HMR)

### Production

```bash
# Build frontend
cd web && bun run build

# Run server (serves API + static files)
cd server && bun run start
```

Open http://localhost:8080

## Scripts

### Server (`server/package.json`)

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `bun run dev` | Start with hot reload |
| `start` | `bun run start` | Production server |
| `test` | `bun test` | Run tests |
| `lint` | `bun run lint` | ESLint check |
| `typecheck` | `bun run typecheck` | TypeScript check |
| `validate` | `bun run validate` | Run all checks |

### Web (`web/package.json`)

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `bun run dev` | Vite dev server |
| `build` | `bun run build` | Production build |
| `preview` | `bun run preview` | Preview build |
| `test` | `bun test` | Run tests |
| `lint` | `bun run lint` | ESLint check |
| `typecheck` | `bun run typecheck` | TypeScript check |
| `validate` | `bun run validate` | Run all checks |

## Project Structure

```
claude-code-ui/
├── server/                 # Backend Bun/Elysia
│   ├── .env.example        # Environment template
│   ├── package.json
│   └── src/
│       ├── index.ts        # HTTP + WebSocket server
│       ├── routes/         # API route handlers
│       ├── services/
│       │   ├── claude.ts   # SDK + CLI spawn wrapper
│       │   └── sessions.ts # Session persistence
│       └── types/          # TypeScript definitions
└── web/                    # React frontend
    ├── package.json
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
| DELETE | `/api/sessions/:id` | Delete session |
| POST | `/api/execute` | Execute via SDK |
| POST | `/api/execute-cli` | Execute via CLI spawn |
| WS | `/ws` | Streaming (SDK or CLI) |

## Features

- **SDK Mode**: Headless execution via @anthropic-ai/claude-agent-sdk
- **CLI Mode**: Full Claude Code capabilities (commands, skills, agents)
- **Sessions**: Create, resume, delete sessions with persistence
- **Streaming**: Real-time output via WebSocket
- **Cross-Platform**: Mac and Windows support

## Environment Variables

See `server/.env.example` for all configuration options:

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes (SDK) | Anthropic API key |
| `PORT` | No | Server port (default: 8080) |
| `ALLOWED_WORK_DIRS` | No | Allowed directories for execution |
| `GITHUB_TOKEN` | No | For GitHub MCP integration |
