---
globs:
  - "**/ws/**"
  - "**/websocket/**"
  - "**/ws-handlers/**"
priority: 10
skills:
  - websocket-patterns
  - typescript-patterns
keywords:
  - websocket
  - realtime
  - streaming
---

## WebSocket Context

Comunicacion en tiempo real. Manejar conexiones, reconexion, y broadcasting.

- Implementar heartbeat/ping-pong
- Manejar reconexion con backoff exponencial
- Usar rooms/channels para broadcasting selectivo
- Limpiar recursos al desconectar
