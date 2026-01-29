# Prompt Engineer

**Version**: 1.1  
**Keywords**: prompt, vague, unclear, improve, refine, clarify, requirements  
**Trigger**: Prompt score < 70 or explicit request to improve prompt

## Overview

This skill transforms vague or incomplete user prompts into actionable, well-structured requests. It applies a systematic scoring methodology to evaluate prompt quality across five criteria, then uses targeted improvement patterns to address deficiencies.

The prompt engineer follows a "measure first, improve second" approach. Every prompt is scored before any transformation, ensuring improvements are data-driven rather than arbitrary. The skill includes domain-specific templates for common task types and a catalog of anti-patterns to avoid.

## Contents

| Module | Description |
|--------|-------------|
| [Scoring Criteria](./scoring-criteria.md) | 5-criteria evaluation system (Clarity, Context, Structure, Success, Actionable) |
| [Improvement Process](./improvement-process.md) | Step-by-step workflow for transforming prompts |
| [Domain Templates](./domain-templates.md) | Pre-built templates for API, Database, Auth, Testing, and Refactoring tasks |
| [Prompt Examples](./prompt-examples.md) | Before/after examples showing transformations |
| [Anti-Patterns](./anti-patterns.md) | Common mistakes and how to avoid them |
| [Corrections](./corrections.md) | Specific fixes for each scoring criterion |

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
