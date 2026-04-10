---
name: prompt-engineer
description: |
  Skill for improving vague or ambiguous prompts through analysis and structured reformulation.
  Use proactively when: prompt score < 70, requirements unclear, vague instructions.
  Keywords - prompt, improve, refine, clarify, ambiguous, vague, requirements
type: encoded-preference
argument-hint: "[prompt text or task description]"
effort: medium
activation:
  keywords:
    - prompt
    - improve
    - refine
    - clarify
    - ambiguous
    - vague
for_agents: [builder, planner, architect]
version: "1.0"
---

# Prompt Engineer

**Version**: 1.1  
**Keywords**: prompt, vague, unclear, improve, refine, clarify, requirements  
**Trigger**: Prompt score < 70 or explicit request to improve prompt

## Overview

This skill transforms vague or incomplete user prompts into actionable, well-structured requests. It applies a systematic scoring methodology to evaluate prompt quality across five criteria, then uses targeted improvement patterns to address deficiencies.

The prompt engineer follows a "measure first, improve second" approach. Every prompt is scored before any transformation, ensuring improvements are data-driven rather than arbitrary. The skill includes domain-specific templates for common task types and a catalog of anti-patterns to avoid.

## Content Map

Supporting files loaded on demand based on task context. Consult the Contents column to decide which to Read for your current task.

| Topic | File | Contents |
|---|---|---|
| Scoring criteria | `${CLAUDE_SKILL_DIR}/scoring-criteria.md` | The 5-criteria evaluation rubric (Clarity, Context, Structure, Success, Actionable) with 0/10/20 point bands per criterion and score-to-action thresholds (<70 improve, 70-79 proceed cautiously, 80+ proceed). Read when scoring an incoming prompt or deciding whether improvement is needed. |
| Improvement process | `${CLAUDE_SKILL_DIR}/improvement-process.md` | Step-by-step workflow (mermaid + numbered steps) for transforming prompts scoring <70: evaluate, identify low criteria, apply corrections, re-score, present to user. Read in Step 2 of the quick-start after scoring reveals deficiencies and you need the orchestrated flow. |
| Domain templates | `${CLAUDE_SKILL_DIR}/domain-templates.md` | Pre-built prompt templates for common task types (API, Database, Auth, Testing, Refactoring) with placeholder slots for files, tech, success criteria. Read when the scored prompt matches a known domain and you want to bootstrap an improved prompt from a proven shape rather than writing from scratch. |
| Before/after examples | `${CLAUDE_SKILL_DIR}/prompt-examples.md` | Concrete before/after prompt transformations showing how a low-scoring prompt becomes a high-scoring one, with score breakdown per version. Read when you need a worked example to calibrate expectations, or to show the user what "good" looks like. |
| Anti-patterns catalog | `${CLAUDE_SKILL_DIR}/anti-patterns.md` | Catalog of common prompt anti-patterns (vague verbs, missing context, no success criteria, multiple interpretations) with detection heuristics. Read when scoring reveals ambiguity but you can't pinpoint which criterion is failing — the catalog helps name the smell. |
| Per-criterion corrections | `${CLAUDE_SKILL_DIR}/corrections.md` | Concrete "if X is missing, add Y" correction tables per scoring criterion (Clarity, Context, Structure, Success, Actionable). Read in the improvement workflow once you've identified which criterion scored low and need the targeted fix recipe. |

## Quick Start

1. Score the prompt (5 criteria × 20 points = 100 max)
2. If score >= 70: proceed with task
3. If score < 70: identify lowest-scoring criteria
4. Apply corrections from corrections.md
5. Use domain template if task type matches
6. Re-score to verify improvement (target: 80+)
7. Present improved prompt to user for confirmation

## When to Use

- User prompt scores below 70 on evaluation
- Request contains ambiguous requirements
- Success criteria are missing or vague
- Technical context is insufficient
- Multiple interpretations are possible
