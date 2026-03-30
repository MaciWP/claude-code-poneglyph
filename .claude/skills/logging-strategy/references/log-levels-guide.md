# Log Levels Guide

Detailed guide for selecting the correct log level with examples.

## Level Reference

| Level | Purpose | Examples | Production Default |
|-------|---------|----------|-------------------|
| DEBUG | Verbose development info | Cache hits, variable state, flow tracing | Off |
| INFO | Important business events | User created, order placed, server started | On |
| WARN | Potential issues, degraded state | Rate limit approaching, deprecated API used, retry attempt | On |
| ERROR | Failures needing investigation | Payment failed, DB query error, external service down | On |
| FATAL | Unrecoverable, process must exit | DB connection lost permanently, corrupt config | On |

## Level Selection Decision Tree

| Question | If Yes | If No |
|----------|--------|-------|
| Is this a normal, expected event? | INFO | Continue |
| Could this become a problem later? | WARN | Continue |
| Did something fail? | ERROR | Continue |
| Must the process stop? | FATAL | Continue |
| Is this only useful during development? | DEBUG | INFO |

## Examples per Level

### DEBUG

```pseudocode
log.debug("Cache lookup", { key: "user:123", hit: true })
log.debug("Entering processOrder", { orderId: 456, itemCount: 3 })
log.debug("SQL query executed", { query: "SELECT...", durationMs: 12 })
```

### INFO

```pseudocode
log.info("User registered", { userId: 123, email: "user@example.com" })
log.info("Order placed", { orderId: 456, total: 99.99, currency: "USD" })
log.info("Server started", { port: 3000, env: "production" })
log.info("Migration applied", { version: "0042", name: "add_user_avatar" })
```

### WARN

```pseudocode
log.warn("Rate limit approaching", { current: 90, limit: 100, endpoint: "/api/search" })
log.warn("Deprecated API used", { endpoint: "/v1/users", replacement: "/v2/users" })
log.warn("Retry attempt", { service: "payment", attempt: 2, maxRetries: 3 })
log.warn("Slow query detected", { query: "SELECT...", durationMs: 3500 })
```

### ERROR

```pseudocode
log.error("Payment processing failed", {
    error: error.message,
    stack: error.stackTrace,
    orderId: 456,
    provider: "stripe"
})
log.error("Database query failed", {
    error: error.message,
    query: truncate(sql, 100),
    durationMs: 5200
})
log.error("External service unavailable", { service: "email", statusCode: 503 })
```

### FATAL

```pseudocode
log.fatal("Database connection lost permanently", {
    error: error.message,
    host: "db.example.com",
    retriesExhausted: true
})
log.fatal("Configuration file corrupt", { path: "/etc/app/config.json" })
log.fatal("Required environment variable missing", { variable: "DATABASE_URL" })
```

## Slow Operation Thresholds

| Operation | Warn Threshold | Error Threshold |
|-----------|----------------|-----------------|
| DB query | > 1s | > 5s |
| HTTP call | > 2s | > 10s |
| File I/O | > 500ms | > 3s |
| Cache lookup | > 100ms | > 1s |
