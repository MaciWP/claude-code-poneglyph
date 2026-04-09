---
name: decide
description: |
  Decision Mode — makes strategic decisions using 3 agent perspectives (Pragmatist, Innovator, Critic) and generates a visual HTML memo.
  Use when: architectural decisions, tech stack choices, approach evaluation, strategic trade-offs.
  Keywords - decide, decision, choose, evaluate, compare, trade-off, pros-cons, architecture-decision
type: workflow
disable-model-invocation: true
argument-hint: "<question or brief>"
effort: high
activation:
  keywords:
    - decide
    - decision
    - choose
    - evaluate
    - compare
    - trade-off
    - pros-cons
for_agents: [architect, planner]
version: "1.0"
---

# Decision Mode

## Workflow

### Step 1: Prepare Brief

Read the user's argument. If it is a short question, use it directly. If it is a path to a file, read the file as the brief.

Structure internally:
- **Central question**: The decision to make
- **Context**: Relevant information provided
- **Constraints**: Limitations mentioned

### Step 2: Launch 3 Perspectives in Parallel

Delegate to 3 agents simultaneously. Each one receives the brief + their perspective:

#### Pragmatist Perspective (builder)
```
You are the PRAGMATIST in a strategic decision.

Brief: {brief}

Analyze from the perspective of practical implementation:
- What is the fastest and safest to implement?
- Which option minimizes technical risk?
- Which option is most maintainable long-term?
- What is the real cost of each option (time, complexity, technical debt)?

Respond in format:
## Pragmatist Position
**Recommendation**: [your choice]
**Main argument**: [1-2 sentences]
### Pros
- ...
### Cons
- ...
### Risks
- ...
```

#### Innovator Perspective (architect)
```
You are the INNOVATOR in a strategic decision.

Brief: {brief}

Analyze from the perspective of design and long-term vision:
- What solution is the most elegant and scalable?
- Which option opens up the most future possibilities?
- Is there an unconventional solution nobody is considering?
- What would the best engineers in the world do?

Respond in format:
## Innovator Position
**Recommendation**: [your choice]
**Main argument**: [1-2 sentences]
### Pros
- ...
### Cons
- ...
### Opportunities
- ...
```

#### Critic Perspective (reviewer)
```
You are the CRITIC in a strategic decision.

Brief: {brief}

Analyze from the perspective of risks and problems:
- What can go wrong with each option?
- What hidden costs does each alternative have?
- What unverified assumptions exist?
- What questions should be answered BEFORE deciding?

Respond in format:
## Critic Position
**Recommendation**: [your choice, or "we need more information"]
**Main argument**: [1-2 sentences]
### Risks per Option
- Option A: ...
- Option B: ...
### Unverified Assumptions
- ...
### Open Questions
- ...
```

### Step 3: Synthesize

After receiving the 3 perspectives, synthesize:
1. **Final recommendation**: Which is the best option considering all 3 perspectives?
2. **Confidence level**: high (3/3 agree), medium (2/3 agree), low (no agreement)
3. **Tensions**: Where perspectives disagree and why
4. **Next steps**: Concrete actions

### Step 4: Generate HTML

Delegate to builder: "Generate a self-contained HTML file with the decision memo."

The HTML must:
- Use the template at `.claude/skills/decide/templates/memo.html` as base
- Fill in with the actual data from the perspectives and synthesis
- Save in the current directory as `decision-memo-{timestamp}.html`
- Open automatically: `start decision-memo-{timestamp}.html` (Windows)

### Step 5: Summary

Give the user a brief summary of the decision and the path to the generated HTML.

## Notes

- Perspectives are launched in PARALLEL (3 Agent calls in one message)
- Each perspective receives the accumulated expertise of the base agent if it exists
- The HTML is self-contained (inline CSS, no external dependencies)
- Dark/light mode support via prefers-color-scheme
