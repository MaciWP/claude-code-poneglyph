---
name: logging-strategy
description: |
  Structured logging patterns with context, log levels, and production-ready observability.
  Use when: correlation ID setup, JSON log format, request tracing implementation, log aggregation, observability setup, debug logging strategy, adding contextual logging.
  Keywords - log, logging, logger, structured, contextual logging, correlation, trace id, log levels, observability, JSON logs, request tracing
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
paths:
  - "**/logger*.{ts,js,py}"
  - "**/logging/**"
  - "**/observability/**"
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

| Level | Purpose | Production |
|-------|---------|-----------|
| DEBUG | Verbose development info | Off |
| INFO | Important business events | On |
| WARN | Potential issues, degraded state | On |
| ERROR | Failures needing investigation | On |
| FATAL | Unrecoverable, process must exit | On |

Quick decision: normal event = INFO, might become a problem = WARN, something failed = ERROR, must stop = FATAL, dev-only = DEBUG.

For detailed level selection decision tree and examples per level, see `references/log-levels-guide.md`.

## Structured Logging

Use structured key-value context instead of plain text. Output JSON in production, pretty-print in development. Use `logger.child()` for request-scoped context with requestId.

For logger interface, JSON format, correlation IDs, request-scoped logging, cross-service tracing, and error/performance logging patterns, see `references/structured-format.md`.

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

## Performance & Format

Include duration in logs, flag slow operations. JSON in production, pretty-print in development.

Slow thresholds: DB > 1s, HTTP > 2s, File I/O > 500ms, Cache > 100ms.

For detailed patterns, JSON format examples, and performance logging, see `references/structured-format.md` and `references/log-levels-guide.md`.

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

## Log Aggregation

Output to stdout, JSON in production, ISO 8601 timestamps (UTC), consistent field naming, forward correlation headers.

For full aggregation integration details, see `references/structured-format.md`.

## Checklist

13 items: structured logger, JSON/pretty output, env-configurable level, request IDs, appropriate levels, no sensitive data, stack traces, performance timing, child loggers, correlation forwarding, consistent naming, log rotation.

## Gotchas

| Gotcha | Why | Workaround |
|--------|-----|------------|
| PII leaks through structured context fields (email, IP in request context) | Structured logging auto-includes all context fields, including sensitive ones | Sanitize or hash PII fields before adding to log context |
| Log level via env var requires restart to take effect (not hot-reloadable) | Most loggers read level once at initialization | Document this limitation; for dynamic levels use a config service |
| JSON structured logs are unreadable in dev terminal | Raw JSON lines are hard to scan visually during development | Use pretty-print format in development, JSON only in production |
| High-cardinality log fields (user IDs, request IDs) explode log indexing costs | Each unique value creates a new index entry in log aggregators | Use log sampling for high-volume debug logs, always log errors |
| Logging inside hot loops degrades performance even at DEBUG level | String interpolation and serialization happen before level check | Guard debug logs with level check: `if (logger.isDebug())` before string interpolation |

---

**Version**: 2.0
**Patterns**: Language-agnostic
