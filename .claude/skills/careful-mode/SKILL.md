---
name: careful-mode
description: |
  Activate strict validation mode with lower complexity thresholds and zero-tolerance security.
  Use when: pre-release review, critical code, production hotfix, high-risk changes.
  Keywords - careful, strict, production, critical, zero-tolerance, pre-release
type: workflow
disable-model-invocation: true
argument-hint: "[on|off]"
effort: low
activation:
  keywords:
    - careful
    - strict
    - production
    - critical
    - zero-tolerance
    - pre-release
for_agents: [builder, reviewer]
version: "1.0"
---

# Careful Mode

Activates stricter validation thresholds for the current session.

## What Changes

| Validator | Normal | Careful |
|-----------|--------|---------|
| Complexity threshold | 25 | 15 |
| Secrets validator | Warns on medium severity | Blocks ALL severities |

## Activation

When this skill is invoked:

1. Set environment variable for builders: `CLAUDE_CAREFUL_MODE=true`
2. All subsequent builder agents should receive this env var
3. The validators will automatically apply stricter thresholds

## Deactivation

Invoke `/careful off` or start a new session.

When deactivating:
1. Remove `CLAUDE_CAREFUL_MODE` from builder environment
2. Validators return to normal thresholds
