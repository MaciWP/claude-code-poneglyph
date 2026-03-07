# Anti-Patterns

| WRONG | CORRECT |
|-------|---------|
| Storing WebSocket in closure | Use ConnectionManager with ws.id |
| No message validation | Validate all messages with schema |
| Synchronous heavy work in handler | Offload to worker or queue |
| No reconnection logic on client | Exponential backoff reconnect |
| Ignoring close codes | Handle different close scenarios |
| No heartbeat/ping | Implement server ping, client pong |
| Logging full message payloads | Log type and id only, redact data |
| No authentication on connect | Verify token in upgrade/beforeHandle |
| Broadcasting to dead connections | Check readyState before send |
| No timeout on request-response | Always set timeout, clean up pending |
