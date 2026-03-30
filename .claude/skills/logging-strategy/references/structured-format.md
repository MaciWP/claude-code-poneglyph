# Structured Logging Format

JSON output format, production vs development formats, and logger interface patterns.

## Unstructured vs Structured

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

## Logger Interface (Conceptual)

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

## Log Aggregation Integration

| Aspect | Recommendation |
|--------|---------------|
| Output target | stdout (let infrastructure route) |
| Format | JSON in production |
| Field naming | Consistent across services (camelCase or snake_case, pick one) |
| Timestamp format | ISO 8601 (UTC) |
| Correlation | Forward x-request-id / x-correlation-id headers |
| Sampling | Consider sampling DEBUG logs in high-traffic systems |
