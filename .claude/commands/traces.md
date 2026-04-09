---
description: Shows a summary of recent execution traces and accumulated costs
---

Read ALL JSONL files from the `~/.claude/traces/` directory.

Each line is a JSON with the following format:
```json
{"ts":"ISO","sessionId":"...","prompt":"...","agents":["builder"],"skills":["api-design"],"tokens":4500,"inputTokens":1500,"outputTokens":3000,"costUsd":0.048,"durationMs":56250,"model":"sonnet","status":"completed","toolCalls":12,"filesChanged":3}
```

Instructions:
1. Use `Glob` to find `*.jsonl` files in `~/.claude/traces/`
2. Read and parse all files
3. Show a summary table for the last 7 days with columns: Date, Prompt (first 60 chars), Model, Tokens, Cost, Agents, Skills, Tool Calls, Files Changed, Status
4. Show aggregated statistics (last 7 days):
   - Total sessions
   - Total tokens (input/output breakdown)
   - Estimated total cost
   - Breakdown by model (sessions, tokens, cost)
   - Most used agents (top 5)
   - Most used skills (top 5)
   - Sessions per day
5. Show accumulated costs section with time breakdown:
   - **Today**: cost, tokens (input/output) for the current day
   - **Last week**: last 7 days
   - **Last month**: last 30 days
   - **All-time total**: full history
6. Show cost breakdown by model: sessions, tokens and cost for each model (opus, sonnet, haiku)
7. Note at the end: "Costs are estimates based on character count. For actual billing, check console.anthropic.com"
