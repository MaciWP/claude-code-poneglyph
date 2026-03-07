# Debugging Checklist

## Error Analysis

- [ ] Identify error type (Syntax, Type, Runtime, Network, Database, Auth, Business, Memory, Async)
- [ ] Extract complete error message
- [ ] Analyze stack trace to identify origin
- [ ] Verify if reproducible
- [ ] Capture context (request, user, input)

## Root Cause Analysis

- [ ] Apply 5 Whys method
- [ ] Document evidence for each "Why"
- [ ] Identify actual root cause (not symptoms)
- [ ] Define preventive measures
- [ ] Verify the fix addresses root cause

## Logging

- [ ] Structured logs in JSON format
- [ ] Request ID present in all logs
- [ ] Timestamps in ISO 8601
- [ ] Relevant context without sensitive data
- [ ] Complete stack trace for errors

## Debugging Techniques

- [ ] Reproduce locally if possible
- [ ] Binary search for intermittent issues
- [ ] Diff debugging for regressions
- [ ] Verify environment configuration
- [ ] Review recent changes (`git log`)

## Post-Mortem

- [ ] Document incident timeline
- [ ] Identify impact (affected users, duration)
- [ ] Document applied fix
- [ ] Add tests to prevent recurrence
- [ ] Update runbooks if applicable
