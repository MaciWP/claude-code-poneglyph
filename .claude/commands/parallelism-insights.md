---
description: Parallelism observability — average ratio batched/total, trend, top worst sessions from ~/.claude/parallelism-metrics.jsonl
model: sonnet
version: 1.0.0
---

# /parallelism-insights

Read `~/.claude/parallelism-metrics.jsonl` and report parallelism observability. The file is produced per turn by the `parallelism-metrics.ts` Stop hook; each line is a JSON record:

```json
{"timestamp":"…","session_id":"…","turn_index":N,"agent_calls_total":X,"batched_calls":Y,"ratio":Y/X}
```

## Steps

1. Read the file. If it does not exist or is empty, report: `no metrics yet — invoke /planner or delegate to agents to start collecting data`.
2. Parse all records. Group by `timestamp` cut-off:
   - **window A**: last 7 days (timestamp >= now - 7d)
   - **window B**: 8–14 days ago (timestamp in [now - 14d, now - 7d))
3. Compute for window A:
   - **avg_ratio** = mean(ratio) across all records
   - **total_assistant_turns_with_agent_calls** = count of records
   - **total_batched_turns** = count where batched_calls > 0
4. Compute for window B: same avg_ratio (for trend).
5. **Trend**: `avg_ratio(A) - avg_ratio(B)`. Arrow ↗ if positive, ↘ if negative, → if |diff| < 0.02.
6. **Top 5 worst sessions** in window A: group by `session_id`, compute session avg_ratio, return the 5 lowest with their agent_calls_total and batched_calls counts.

## Output format

```
Parallelism Insights — last 7 days ({date_start} → {date_end})

Avg batched/total ratio:  {avg_ratio:.2f}   (target ≥ 0.60)  {⚠ below target | ✅ meets target}
Trend vs previous 7d:     {±diff:.2f}   {↗ improving | ↘ worsening | → stable} (was {avg_B:.2f})
Total assistant turns w/ Agent calls: {total_A}
Total batched turns:                   {batched_A}

Top 5 sessions with worst ratio (missed parallelism):
  1. {session_id_short}… — {ratio:.2f} ({total} Agent calls, {batched} batched)
  2. ...

Reminder: target ratio ≥ 0.6. Wave PARALLEL pattern — batch independent
Agent() calls in a single assistant message when no output→input dependency.
```

## Notes

- Truncate session_id to 7-9 chars for readability.
- All math is best-effort: if a record is malformed, skip it silently.
- Use Read tool (not Bash) for portability. If file is large (>5000 records), warn that older records may be truncated.
