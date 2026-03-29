---
name: logging-strategy
description: "Structured logging patterns with context, log levels, and best practices.\n\
  Use proactively when: setting up logging, adding request tracing, debugging production.\n\
  Keywords - log, logging, logger, structured, contextual logging, correlation, trace id, log levels"
type: knowledge-base
disable-model-invocation: false
activation:
  keywords:
    - log
    - logging
    - logger
    - structured
    - contextual logging
    - correlation
    - trace id
    - log levels
for_agents: [builder]
version: "2.0"
---

# Logging Strategy

Structured logging patterns with contextual information and production-ready output. Language and framework agnostic.

## When to Use

- Setting up application logging infrastructure
- Need structured logs (JSON) for production
- Implementing request tracing (request ID, correlation ID)
- Adding contextual logging (user ID, tenant ID)
- Integrating with log aggregation systems
- Debugging production issues
- Adding appropriate log levels to code

## Log Levels

### When to Use Each Level

| Level | Purpose | Examples | Production Default |
|-------|---------|----------|-------------------|
| DEBUG | Verbose development info | Cache hits, variable state, flow tracing | Off |
| INFO | Important business events | User created, order placed, server started | On |
| WARN | Potential issues, degraded state | Rate limit approaching, deprecated API used, retry attempt | On |
| ERROR | Failures needing investigation | Payment failed, DB query error, external service down | On |
| FATAL | Unrecoverable, process must exit | DB connection lost permanently, corrupt config | On |

### Level Selection Decision

| Question | If Yes | If No |
|----------|--------|-------|
| Is this a normal, expected event? | INFO | Continue |
| Could this become a problem later? | WARN | Continue |
| Did something fail? | ERROR | Continue |
| Must the process stop? | FATAL | Continue |
| Is this only useful during development? | DEBUG | INFO |

## Structured Logging Concepts

### Unstructured vs Structured

```pseudocode
// BAD - Unstructured plain text
log("User 123 logged in from 192.168.1.1")

// GOOD - Structured key-value context
log.info("User logged in", { userId: 123, ip: "192.168.1.1" })
```

### Why Structured

| Benefit | Detail |
|---------|--------|
| Machine-parseable | Log aggregators can index fields |
| Filterable | Query by userId, requestId, etc. |
| Consistent | Same fields across all log entries |
| Searchable | Find all logs for a specific request |

### Logger Interface (Conceptual)

```pseudocode
Logger:
  debug(message, context?)    // Verbose dev info
  info(message, context?)     // Important events
  warn(message, context?)     // Potential issues
  error(message, context?)    // Failures
  fatal(message, context?)    // Unrecoverable
  child(baseContext) -> Logger // Scoped logger with inherited context

Configuration:
  level: from environment variable (default: "info")
  format: JSON in production, pretty-print in development
  output: stdout (let infrastructure handle routing)
```

## Request Context / Correlation IDs

### Why Correlation IDs

| Problem | Solution |
|---------|----------|
| Cannot trace a request across log lines | Attach requestId to every log in that request |
| Cannot trace across services | Use correlationId passed via headers |
| Cannot group logs by user session | Attach sessionId or userId |

### Request-Scoped Logging

```pseudocode
// Middleware pattern (any framework)
handleRequest(request):
  requestId = request.headers["x-request-id"] or generateUUID()
  log = logger.child({ requestId, method: request.method, path: request.path })

  log.info("Request started")
  startTime = now()

  try:
    result = processRequest(request)
    log.info("Request completed", { statusCode: 200, durationMs: elapsed(startTime) })
    return response(result, headers: { "x-request-id": requestId })
  catch error:
    log.error("Request failed", { error: error.message, durationMs: elapsed(startTime) })
    throw error
```

### Cross-Service Tracing

```pseudocode
// When calling another service, forward the correlation ID
callExternalService(url, data, correlationId):
  log.info("Calling external service", { url, correlationId })
  response = httpPost(url, data, headers: { "x-correlation-id": correlationId })
  log.info("External service responded", { url, statusCode: response.status, correlationId })
  return response
```

## What to Log / What NOT to Log

### NEVER Log (Sensitive Data)

| Data Type | Why | What to Log Instead |
|-----------|-----|---------------------|
| Passwords | Security breach | `passwordProvided: true/false` |
| Credit card numbers | PCI compliance | `cardLast4: "1234"` |
| API keys / secrets | Credential exposure | `apiKeyPrefix: "sk-abc..."` |
| Auth tokens (JWT, etc.) | Session hijacking | `tokenId` or `tokenHash` |
| PII (SSN, health data) | Privacy regulations | Anonymized or omitted |
| Full request bodies | May contain secrets | Specific safe fields only |

### ALWAYS Log

| Data | Why |
|------|-----|
| Request ID / Correlation ID | Traceability |
| Timestamp | Ordering and correlation |
| Log level | Filtering |
| Service/module name | Source identification |
| Error messages + stack traces | Debugging |
| Duration of operations | Performance monitoring |
| Status codes | Success/failure tracking |

## Error Logging Best Practices

```pseudocode
// BAD - Losing error details
try:
  riskyOperation()
catch error:
  log.error("Operation failed")     // No details at all

// GOOD - Full error context
try:
  riskyOperation()
catch error:
  log.error("Operation failed", {
    error: error.message,
    stack: error.stackTrace,
    operation: "riskyOperation",
    input: { id: 123 }       // Only safe, non-sensitive input
  })
  throw error   // Re-throw if caller needs to handle
```

## Performance Logging

```pseudocode
// BAD - No timing information
log.info("Query completed")

// GOOD - Include duration and flag slow operations
startTime = now()
result = db.query(sql)
duration = elapsed(startTime)

log.info("Query completed", {
  query: truncate(sql, 100),
  rowCount: result.length,
  durationMs: round(duration, 2),
  slow: duration > 1000
})
```

### Slow Operation Thresholds

| Operation | Warn Threshold | Error Threshold |
|-----------|----------------|-----------------|
| DB query | > 1s | > 5s |
| HTTP call | > 2s | > 10s |
| File I/O | > 500ms | > 3s |
| Cache lookup | > 100ms | > 1s |

## JSON Output Format

### Production (Machine-Readable)

```json
{
  "timestamp": "2025-01-24T10:30:45.123Z",
  "level": "info",
  "service": "api",
  "message": "Request completed",
  "requestId": "abc-123-def-456",
  "method": "POST",
  "path": "/api/users",
  "statusCode": 201,
  "durationMs": 45.23
}
```

### Development (Human-Readable)

```
[INFO] 2025-01-24T10:30:45 Request completed  requestId=abc-123 method=POST path=/api/users status=201 duration=45ms
```

## Anti-Patterns

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Plain print statements everywhere | No structure, levels, or context | Use structured logger |
| Logging passwords or tokens | Security breach | Never log secrets |
| No request ID | Cannot trace requests | Add request context middleware |
| All logs at same level | Cannot filter in production | Use appropriate levels |
| No timestamps | Cannot correlate events | Always include timestamp |
| Logging full objects | Performance hit, may leak secrets | Log specific safe fields |
| No error stack trace | Cannot debug root cause | Include stack on errors |
| String concatenation for context | Breaks structured format | Use context objects/maps |
| Logging in tight loops | Performance degradation | Log summary after loop |
| Not configuring log level from env | Cannot adjust in production | Read level from environment |

## Log Aggregation Integration

| Aspect | Recommendation |
|--------|---------------|
| Output target | stdout (let infrastructure route) |
| Format | JSON in production |
| Field naming | Consistent across services (camelCase or snake_case, pick one) |
| Timestamp format | ISO 8601 (UTC) |
| Correlation | Forward x-request-id / x-correlation-id headers |
| Sampling | Consider sampling DEBUG logs in high-traffic systems |

## Checklist

- [ ] Using structured logger (not plain print statements)
- [ ] JSON output in production
- [ ] Pretty output in development
- [ ] Log level configurable via environment variable
- [ ] Request ID / correlation ID in all request-scoped logs
- [ ] Appropriate log level for each message
- [ ] No sensitive data logged (passwords, tokens, cards, PII)
- [ ] Error stack traces included
- [ ] Performance timing for slow operations
- [ ] Child/scoped loggers for request context
- [ ] Correlation ID forwarded across service calls
- [ ] Consistent field naming across services
- [ ] Log rotation or aggregation configured for production

---

**Version**: 2.0
**Patterns**: Language-agnostic
