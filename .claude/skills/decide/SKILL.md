---
name: decide
description: |
  Ayuda a decidir entre alternativas técnicas: compara opciones, expone trade-offs y recomienda con criterio.
  Úsala cuando: hay que elegir entre arquitecturas/librerías/enfoques, "qué opción elijo", "qué librería uso", "compara alternativas", "trade-offs", antes de comprometerse con una decisión técnica.
  Keywords - decide, decision, choose, evaluate, compare, trade-off, pros-cons, architecture-decision
disable-model-invocation: true
argument-hint: "<question or brief>"
when_to_use: |
  "qué opción elijo", "compara alternativas", "trade-offs", "qué librería uso", "which library", "evaluate options", "decision"
---

# Decision Mode

## When to use vs `decision-stress-test`

| Use `decide` when | Use `decision-stress-test` when |
|---|---|
| Decision is reversible | Decision is irreversible or expensive to undo |
| Low/medium stakes | High stakes (architecture, library, framework commitment) |
| Want quick 3-perspective scan (~500-800 tokens) | Want adversarial 5-12 perspective stress-test (~2-3K tokens) |
| Choosing among options | Validating ONE option already chosen |

Pattern: `/decide` to **select** an option → `/decision-stress-test` to **commit** to it before implementing.

## Workflow

### Step 1: Prepare Brief

Read the user's argument. If it is a short question, use it directly. If it is a path to a file, read the file as the brief.

Structure internally:
- **Central question**: The decision to make
- **Context**: Relevant information provided
- **Constraints**: Limitations mentioned

**Classify before scanning** (`references/01-decision-frameworks.md` §1): is this a reversible two-way-door (Type 2) or an irreversible one-way-door (Type 1)? Apply the test: *if wrong, can we undo it at acceptable cost?* If **Type 1** (irreversible / high-stakes) → stop and recommend `decision-stress-test` instead; `decide` is the lightweight tool for reversible calls. If **Type 2** → proceed.

### Step 2: Adopt 3 Perspectives Inline

Adopt 3 independent perspectives — **inline** in the main session, NOT as spawned agents. The canonical spawn tree in `orchestrator-protocol` forbids spawning for 1-3 units; the Lead runs each lens itself in a single pass, writing all three positions in one turn. Each lens receives the brief + its perspective:

#### Pragmatist Perspective
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

#### Innovator Perspective
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

#### Critic Perspective
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

After receiving the 3 perspectives, synthesize the recommendation ADR-style (Nygard — `references/01-decision-frameworks.md` §2) so the reasoning and trade-offs are captured, not just the pick:
1. **Decision** (final recommendation): which option, in active voice ("We will…")?
2. **Context**: the forces/constraints that motivate it.
3. **Consequences**: what becomes easier AND harder — list both.
4. **Confidence level**: high (3/3 agree), medium (2/3 agree), low (no agreement).
5. **Tensions & next steps**: where perspectives disagree and the concrete actions. If the Critic over-demands rigor on a clearly reversible call, name the over-rigor anti-pattern (§3) — the reversal cost is low; bias toward deciding.

### Step 4: Generate HTML

Generate the HTML **inline** via the `html-report` skill: a self-contained file with the decision memo.

The HTML must:
- Use the html-report system template `.claude/skills/html-report/templates/decision.template.html` as base (single visual system — Cmd X; `memo.html` is retained as an offline fallback only)
- Fill in with the actual data from the perspectives and synthesis
- Save in the current directory as `decision-memo-{timestamp}.html`
- Open automatically: `start decision-memo-{timestamp}.html` (Windows)

### Step 5: Summary

Give the user a brief summary of the decision and the path to the generated HTML.

## Notes

- The 3 perspectives are adopted INLINE by the Lead in one pass — not 3 Agent calls. A reversible, low/medium-stakes decision does not justify spawning (`orchestrator-protocol` spawn tree: 1-3 units never spawn). Escalate to `decision-stress-test` when the stakes warrant a multi-agent adversarial panel.
- The HTML is self-contained (inline CSS, no external dependencies)
- Dark/light mode support via prefers-color-scheme

## Commandments cubiertos

| # | Cómo |
|---|---|
| III | 3-perspective scan kept lightweight (~500-800 tokens) — no over-engineering a reversible call |
| V | The brief forces context (central question, constraints) before recommending |
| VII | Perspectives run inline in one pass — no spawn overhead for 1-3 units |
| VIII | Each perspective is a structured prompt (position / pros / cons / risks) |

## Related

- `references/01-decision-frameworks.md` — the verified canon (Bezos Type 1/2 doors + Nygard ADR structure) behind Steps 1 and 3.
- `decision-stress-test` — the heavy sibling for irreversible/high-stakes calls (5-12 adversarial perspectives). Pattern: `decide` to **select** → `decision-stress-test` to **commit**.
- `html-report` — renders the decision memo (`templates/decision.template.html`).
- `orchestrator-protocol` — the spawn decision tree that mandates inline execution for 1-3 units.
