---
parent: orchestrator-protocol
name: prompt-scoring
description: 5-criterion scoring rubric, threshold table, improvement questions, before/after example.
---

# Prompt Scoring

Evaluate the user's prompt against 5 criteria. The score is a **signal, not a hard gate** — use it to decide when to ask for validation, not as an automatic block.

## Evaluation Criteria

| Criterion | 20 pts | 10 pts | 0 pts |
|-----------|--------|--------|-------|
| **Clarity** | Action verb + specific target | Generic verb | Vague/ambiguous |
| **Context** | Paths + tech + versions | Tech mentioned | No context |
| **Structure** | Organized, bullets/headers | Clear paragraphs | Wall of text |
| **Success** | Metrics (<100ms, >90%) | "better", "faster" | No criteria |
| **Actionable** | No open questions | 1-2 clarifications needed | Too vague |

## Scoring Thresholds

| Score | Action |
|-------|--------|
| 80-100 | Proceed directly |
| 70-79 | Proceed with caution |
| **< 70** | **Signal of doubt**: if genuinely ambiguous or the resulting plan needs validation, use `AskUserQuestion` — or invoke the `prompt-engineer` skill to refine. If the intent is pragmatically clear despite low formal score, proceed and flag the uncertainty |

> **Commandment I (Honest symbiosis)**: asking is not friction — it's the right move when in doubt. But don't ask ceremonial questions when the intent is obvious.

## Improvement Questions

When a criterion scores low, use these questions to improve the prompt:

| Low Criterion | Question to User |
|---------------|-----------------|
| **Clarity** | "What specific action do you need? Create, modify, delete, refactor?" |
| **Context** | "Which files or modules? What technologies or frameworks are involved?" |
| **Structure** | "Can you break it down into concrete steps or requirements?" |
| **Success** | "How will we know it's correct? Tests passing, metrics, expected behavior?" |
| **Actionable** | "Are there design decisions you prefer? Constraints I should know about?" |

## Improvement Example

**Original prompt** (score ~30): "Improve the user system"

**Lead's questions**:
1. Improve what exactly? Performance, security, functionality?
2. Which files or modules touch the user system?
3. Is there a concrete problem to solve or is it general refactoring?
4. How do we measure success? Tests, response time, fewer errors?

**Improved prompt** (score ~85): "Refactor UserService to separate auth from profile. Move password logic to AuthService, keep profile in UserService. Tests must pass. Files: src/services/user.ts, src/services/auth.ts."

## Score Examples

### High Score (85+)
> "Add endpoint POST /api/users that validates unique email, hashes password with bcrypt, and returns 201 with the user without the password"

- Clarity: 20 (verb + specific target)
- Context: 15 (implicit tech)
- Structure: 20 (organized)
- Success: 15 (status code defined)
- Actionable: 20 (no ambiguity)

### Low Score (< 70)
> "Improve the user system"

- Clarity: 0 (vague)
- Context: 0 (no details)
- Structure: 10 (simple)
- Success: 0 (no criteria)
- Actionable: 0 (too ambiguous)

## Process

1. Receive user prompt
2. Evaluate against the 5 criteria (mentally, don't make a ceremony of it)
3. If score < 70 **and** there's genuine doubt about intent: use `AskUserQuestion` or invoke the `prompt-engineer` skill to refine
4. If score ≥ 70, **or** the intent is pragmatically clear despite low score: proceed with complexity analysis and flag any remaining uncertainty inline
