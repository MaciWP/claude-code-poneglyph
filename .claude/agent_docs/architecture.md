# Architecture

## Overview

Claude Code Poneglyph es un UI wrapper para Claude Code CLI con soporte para SDK y CLI spawn modes.

## System Diagram

```mermaid
graph TD
    subgraph "Frontend (React + Vite)"
        Web[Web UI :5173]
        Chat[StreamingChat]
        Sessions[SessionManager]
    end

    subgraph "Backend (Bun + Elysia)"
        API[Elysia API :8080]
        WS[WebSocket Handler]
        Claude[Claude Service]
        Memory[Memory Service]
    end

    subgraph "External"
        CLI[Claude Code CLI]
        SDK[Claude SDK]
        DB[(PostgreSQL)]
        Redis[(Redis)]
    end

    Web --> API
    Web --> WS
    API --> Claude
    WS --> Claude
    Claude --> CLI
    Claude --> SDK
    API --> Memory
    Memory --> DB
    Memory --> Redis
```

## Components

### Frontend

| Componente | Responsabilidad |
|------------|-----------------|
| StreamingChat | UI de chat con streaming |
| SessionManager | Gestión de sesiones |
| AgentSelector | Selección de agentes |

### Backend

| Componente | Responsabilidad |
|------------|-----------------|
| Claude Service | Ejecutar Claude Code (SDK/CLI) |
| Memory Service | Búsqueda semántica en memoria |
| Session Store | Persistencia de sesiones |
| WebSocket Handler | Streaming en tiempo real |

## Data Flow

### Execute Request

```mermaid
sequenceDiagram
    participant U as User
    participant W as Web
    participant A as API
    participant C as Claude
    participant CLI as CLI/SDK

    U->>W: Submit prompt
    W->>A: POST /api/execute
    A->>C: execute(prompt, options)
    C->>CLI: spawn/sdk call
    CLI-->>C: streaming response
    C-->>A: events
    A-->>W: SSE/WebSocket
    W-->>U: Display response
```

## Directory Structure

```
claude-code-ui/
├── server/src/
│   ├── routes/       # Elysia routes
│   ├── services/     # Business logic
│   ├── config/       # Configuration
│   └── index.ts      # Entry point
├── web/src/
│   ├── components/   # React components
│   ├── hooks/        # Custom hooks
│   ├── stores/       # State management
│   └── main.tsx      # Entry point
└── shared/
    └── types.ts      # Shared types
```

## Key Decisions

| Decisión | Razón |
|----------|-------|
| Bun runtime | Performance, native TypeScript |
| Elysia framework | Type-safe, fast, Bun-native |
| React + Vite | DX, fast HMR |
| SDK + CLI modes | Flexibilidad según caso de uso |
