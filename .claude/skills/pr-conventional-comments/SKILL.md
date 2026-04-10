---
name: pr-conventional-comments
description: |
  Conventional Comments format for PR reviews -- structured, actionable feedback
  with decorators (blocking/non-blocking), praise, and Spanish informal tone.
  Use when generating PR review comments or code review feedback.
type: encoded-preference
disable-model-invocation: false
effort: low
activation:
  keywords:
    - pr review
    - review comment
    - conventional comments
    - blocking
    - non-blocking
    - code review feedback
    - pull request review
    - suggestion
    - nitpick
for_agents: [reviewer]
context: fork
version: "2.0.0"
---

# PR Conventional Comments

> I generate structured, actionable PR review comments using Conventional Comments format in Spanish.

## Core Principle: Structured Actionable Feedback

**THE #1 RULE: Every comment MUST have a label and a decorator (blocking/non-blocking).**

```
<label> (decorator): <subject>

<discussion>
```

| Component | Required | Description |
|-----------|----------|-------------|
| `label` | Yes | Comment type (suggestion, issue, praise, etc.) |
| `(decorator)` | Yes | `(blocking)` or `(non-blocking)` |
| `subject` | Yes | Concise description |
| `discussion` | No | Additional context in following lines |

### Multi-line Example

```
suggestion (blocking): Considera usar bulk_create en lugar del loop.
Esto reduciria las queries de N a 1 y mejoraria el rendimiento
en listas grandes.
```

## Quick Reference

### Labels

| Label | Use | Decorator | Required per Review |
|-------|-----|-----------|---------------------|
| `praise:` | Something positive | N/A (no decorator needed) | Minimum 1 |
| `suggestion:` | Concrete improvement proposal | `(blocking)` or `(non-blocking)` | As needed |
| `issue:` | Specific problem. ALWAYS pair with suggestion | `(blocking)` | As needed |
| `question:` | Doubt or clarification | `(non-blocking)` | As needed |
| `thought:` | Non-blocking idea for the future | `(non-blocking)` | As needed |
| `nitpick:` | Minor style preference | `(non-blocking)` | As needed |
| `typo:` | Typographic error | N/A | As needed |
| `todo:` | Trivial pending change | N/A | As needed |
| `chore:` | Administrative task | N/A | As needed |
| `note:` | Relevant information for the author | N/A | As needed |
| `polish:` | Non-functional quality improvement | `(non-blocking)` | As needed |

### Decorators

| Decorator | Meaning | When to Use |
|-----------|---------|-------------|
| `(blocking)` | Blocks approval until resolved | Critical issues, bugs, security |
| `(non-blocking)` | Does not block approval | Optional improvements, style, ideas |
| `(if-minor)` | Only if the change is trivial | When the fix is 1-2 lines |

### Severity Mapping

| Severity | Label + Decorator | When |
|----------|-------------------|------|
| Critical | `issue (blocking):` | Security, crashes, data loss |
| Major | `issue (blocking):` or `suggestion (blocking):` | Architecture violations, bugs |
| Minor | `suggestion (non-blocking):` or `nitpick (non-blocking):` | Style, minor optimization |

### Templates by Label

```
# Praise
praise: Buen uso de {patron}. Esto mejora {beneficio}.
praise: Me gusta como resolviste {problema}. Queda limpio y legible.

# Suggestion
suggestion (blocking): Considera usar {alternativa} en lugar de {actual}.
Esto evitaria {problema} y mejoraria {aspecto}.

# Issue + Suggestion (always paired)
issue (blocking): {descripcion del problema}.
suggestion: {propuesta de solucion concreta}.

# Question
question (non-blocking): Hay alguna razon para {decision}?
Pregunto porque {contexto/alternativa}.

# Thought
thought (non-blocking): Para el futuro, podriamos {idea}.
Esto permitiria {beneficio}.

# Nitpick
nitpick (non-blocking): Preferiria {alternativa} por consistencia con el resto del proyecto.
```

## Tone Rules

Based on Google Eng Practices, Graphite, and Dr. McKayla. Written in Spanish, informal "yo", professional.

| Rule | Bad | Good |
|------|-----|------|
| Talk about code, not person | "No entiendes select_related" | "Este query podria beneficiarse de select_related" |
| Formulate as questions | "Esto esta mal" | "Consideraste usar `get_or_create` aqui?" |
| No condescending words | "Simplemente usa X" | "Se podria usar X, que maneja {caso} automaticamente" |
| Explain the why | "Usa bulk_create" | "Usa bulk_create para reducir queries de N a 1" |
| Be brief | 5-line paragraph | Max 2-3 lines per comment |

### Bjumper Team Conventions

- Publish all comments as a **single review** (not one by one)
- Code comments linked to the specific line
- General comments in the PR summary/body
- `issue` ALWAYS accompanied by `suggestion`
- Always approve PR once blocking comments are resolved

## Anti-Patterns

| Anti-Pattern | Problem | Correct Pattern |
|--------------|---------|-----------------|
| "Esto esta mal" | No label, no suggestion | `issue (blocking): Este query genera N+1. suggestion: Usa select_related` |
| "Por que hiciste esto?" | Accusatory tone | `question (non-blocking): Cual fue la motivacion para usar raw SQL aqui?` |
| Comment without label | Ambiguous intent | Always prefix with label |
| Comment without decorator | Unclear if blocking | Always add `(blocking)` or `(non-blocking)` |
| Only pointing problems | Demoralizing | Include at least 1 `praise:` per review |
| "Simplemente usa X" | Condescending | `suggestion (non-blocking): Se podria usar X, que maneja {caso} automaticamente` |
| Long paragraphs | Hard to action | Max 2-3 lines per comment |
| Comments one by one | Noisy notifications | Publish all together as single review |
| `issue` without `suggestion` | Problem without solution | Always pair issue with concrete suggestion |

## Documentation

| Document | Path | Content |
|----------|------|---------|
| Comment Examples | `${CLAUDE_SKILL_DIR}/examples/comment-examples.md` | Real examples of each label type with context |

## Quality Checklist

| Check | Requirement |
|-------|-------------|
| All comments have label? | Yes -- every comment prefixed with label |
| All have decorator? | Yes -- `(blocking)` or `(non-blocking)` on every comment |
| At least 1 praise? | Yes -- recognize good work |
| Issues paired with suggestion? | Yes -- never point problems without solutions |
| Tone is respectful? | Yes -- about code, not person |
| Why is explained? | Yes -- rationale behind each comment |
| Published as single review? | Yes -- all comments at once |

## Critical Reminders

1. **EVERY** comment must have a label and decorator -- no exceptions
2. **EVERY** `issue:` must be paired with a `suggestion:` -- never point problems without solutions
3. **MINIMUM** 1 `praise:` per review -- recognize good work
4. **ALWAYS** publish all comments as a single review, not one by one
5. **NEVER** talk about the person, always about the code -- professional tone

### Sources

| Source | Contribution |
|--------|-------------|
| conventionalcomments.org | Official label and decorator specification |
| Google Eng Practices | Courtesy, explain reasoning, give direction |
| Dr. McKayla | Professional tone, psychological safety |
| Graphite | Formulate as questions, be specific |
| Confluence - Ruben Mosqueda | Bjumper team-specific conventions |
