# Implementation Checklists

## Before Implementation

- [ ] Identify all failure points in the workflow
- [ ] Define compensation actions for each step
- [ ] Determine if checkpointing is needed (long-running)
- [ ] Evaluate if DLQ is necessary for messages
- [ ] Define idempotency strategy

## Saga Implementation

- [ ] Each step has execute and compensate
- [ ] Compensations execute in reverse order
- [ ] Handle compensation failures (log + alert)
- [ ] Consider retries for transient steps
- [ ] Detailed logging at each step

## Checkpoint Implementation

- [ ] Checkpoints persisted to durable storage
- [ ] TTL defined for checkpoints
- [ ] Automatic resume on restart
- [ ] Cleanup of completed checkpoints
- [ ] Monitoring for stalled workflows

## DLQ Implementation

- [ ] Max retries configured appropriately
- [ ] Exponential backoff between retries
- [ ] Alerts for new DLQ entries
- [ ] UI/API to inspect DLQ
- [ ] Process to reprocess DLQ items

## Post-Recovery

- [ ] Log all compensations executed
- [ ] Metrics for recovery success rate
- [ ] Alerts on failed compensations
- [ ] Runbook for manual recovery
- [ ] Tests for recovery scenarios
