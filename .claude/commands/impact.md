---
description: Analyzes the real impact of orchestration — speedup, success rate, cost efficiency from traces
---

Analyze the real impact of Poneglyph on your workflow using accumulated traces.

Instructions:
1. Use `Glob` to find `~/.claude/traces/*.jsonl`
2. Read and parse ALL trace files — each line is JSON with fields: `ts`, `costUsd`, `tokens`, `inputTokens`, `outputTokens`, `model`, `durationMs`, `status`, `prompt`, `agents`, `skills`, `toolCalls`, `filesChanged`
3. If `~/.claude/patterns.jsonl` exists, read and parse it — each line is JSON with fields: `type`, `pattern`, `outcome` (with `successRate`, `avgTokens`, `avgDuration`, `avgCost`), `confidence`, `effectSize`, `sampleSize`
4. If `~/.claude/agent-scores.jsonl` exists, read and parse it — fields: `agent`, `taskType`, `compositeScore`, `successRate`, `trend`, `sampleSize`
5. Calculate and display these metrics in tables:

**Table 1: Overview**
- Total sessions, successful sessions (status="completed"), global success rate
- Total cost, average cost per successful session
- Average duration (in seconds), average tokens per session

**Table 2: Trend (last 7 days vs previous 7 days)**
- Success rate: current period vs previous (with arrow ↑↓→)
- Average cost: current vs previous
- Average duration: current vs previous
- Average tokens: current vs previous

**Table 3: By model**
Breakdown of sessions, success rate and average cost by model (opus, sonnet, haiku, unknown)

**Table 4: Agent Performance** (only if agent-scores.jsonl exists)
- Ranked by compositeScore descending
- Columns: Agent, Task Type, Score, Success Rate, Trend, Samples

**Table 5: Discovered Patterns** (only if patterns.jsonl exists)
- Top 5 patterns by confidence descending
- Columns: Type, Pattern (agents/skills summarized), Success Rate, Confidence, Effect Size, Samples

6. Final note:

> **METR Context**: METR research (January 2026) found that developers are 19% slower with AI tools on average. The data above shows the specific impact of Poneglyph on YOUR workflow. Compare your success rate and trend to evaluate whether the orchestration is generating real value.
