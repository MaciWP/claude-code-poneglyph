# Implementation Checklist

Before completing WebSocket implementation:

- [ ] Message types are defined and validated with schema
- [ ] Connection state is tracked in ConnectionManager
- [ ] Heartbeat/ping-pong implemented for connection health
- [ ] Client has reconnection logic with exponential backoff
- [ ] Error handling covers both server and client sides
- [ ] Rooms/subscriptions cleaned up on disconnect
- [ ] Rate limiting applied to prevent message flooding
- [ ] Authentication verified on WebSocket upgrade
- [ ] Graceful shutdown handling for server restart
- [ ] Message queue for offline messages (if needed)
- [ ] Logging includes connection ID for debugging
- [ ] Typed messages used throughout
