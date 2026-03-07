# WebSocket Architecture

## When to Use WebSockets

- Implementing real-time features (chat, notifications, live updates)
- Bi-directional client-server communication
- Live data streaming (logs, metrics, events)
- Collaborative features (shared editing, presence)
- Server-sent events and push notifications
- Pub/sub messaging patterns

## Architecture Diagram

```mermaid
graph TB
    subgraph Clients
        C1[Client 1]
        C2[Client 2]
        C3[Client 3]
    end

    subgraph Server
        WS[WebSocket Handler]
        CM[Connection Manager]
        PM[Pub/Sub Manager]
    end

    subgraph Channels
        CH1[Room: general]
        CH2[Room: session-123]
    end

    C1 --> WS
    C2 --> WS
    C3 --> WS
    WS --> CM
    CM --> PM
    PM --> CH1
    PM --> CH2
```

## Key Concepts

| Concept | Purpose |
|---------|---------|
| Connection | Individual client WebSocket |
| Channel/Room | Logical group for broadcast |
| Pub/Sub | Message distribution pattern |
| Heartbeat | Connection health check |
| Reconnection | Client-side recovery |
