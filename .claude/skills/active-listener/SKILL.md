---
name: active-listener
description: "Verifies complete context before acting in long sessions or multi-step tasks.\n\
  Use proactively when: long sessions, multi-step tasks, context-sensitive operations.\n\
  Keywords - context, verify, long-session, multi-step, complex-chain"
type: reference
disable-model-invocation: true
effort: low
activation:
  keywords:
    - long-session
    - multi-step
    - complex-chain
    - context-sensitive
    - verify-context
for_agents: [builder, reviewer, architect]
version: "1.0"
---

# Active Listener

## When to Apply

- Long sessions (>50K accumulated context tokens)
- Multi-step tasks where earlier decisions inform later steps
- Delegations after multiple rounds of changes to the same files
- Post-context compaction

## Instructions

### Before Acting

1. **Verify understanding**: Before making changes, confirm you understand the full context of the task
2. **Reference prior decisions**: If there are earlier decisions in the conversation that affect your work, mention them explicitly
3. **Detect gaps**: If you suspect you are missing context (e.g., after compaction), ask for clarification before acting

### Signals of Incomplete Context

- References to files or functions you do not recognize
- Instructions that contradict what you see in the code
- Mentions of prior decisions without detail
- Partial changes in files that suggest incomplete prior work

### Protocol

```
1. Read relevant files BEFORE editing (verify current state)
2. If there is doubt about context → ask the Lead
3. If there are prior changes in the file → understand why before modifying
4. Explicitly reference any prior decision that informed your approach
```
