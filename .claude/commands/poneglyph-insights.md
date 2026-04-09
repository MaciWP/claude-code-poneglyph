---
description: HTML analytics dashboard — evaluates Claude Code usage with metrics, trends, patterns and actionable recommendations
model: opus
---

# /insights-poneglyph

Generates an interactive HTML dashboard with in-depth analysis of Claude Code usage. Dark mode, Chart.js visualizations, actionable metrics.

## INPUT

```
$ARGUMENTS
```

Default period: last 30 days. If `$ARGUMENTS` specifies a period (e.g., "7d", "90d", "all"), use that instead.

---

## STEP 1: COLLECT DATA

Read ALL these sources. If a file does not exist, mark as "no data" in the dashboard (do not fail).

### 1.1 Execution traces
```bash
# Read all JSONL trace files
ls ~/.claude/traces/*.jsonl
```

Each line is a JSON with fields:
- `ts` (ISO timestamp)
- `sessionId`
- `prompt` (user text)
- `agents` (array of agents used)
- `skills` (array of skills loaded)
- `tokens`, `inputTokens`, `outputTokens`
- `costUsd`
- `durationMs`
- `model` (opus/sonnet/haiku)
- `status` (success/error/timeout)
- `toolCalls` (number of tool calls)
- `filesChanged` (number of files modified)

### 1.2 Discovered patterns
```bash
cat ~/.claude/patterns.jsonl
```

Fields: `type` (sequence/skill_combo/decomposition/recovery), `pattern` (agents, skills, taskType, complexityRange), `outcome` (successRate, avgDuration, avgCost, avgRetries), `confidence`, `sampleSize`

### 1.3 Agent scores
```bash
cat ~/.claude/agent-scores.jsonl
```

Fields: `agent`, `taskType`, `compositeScore`, `successRate`, `trend` (improving/stable/declining), `sampleSize`, `recentScores`

---

## STEP 2: COMPUTE METRICS

Calculate all of the following from raw data:

### 2.1 Overview KPIs
| Metric | Calculation |
|--------|-------------|
| Total sessions | Count of traces in period |
| Success rate | % with status=success |
| Total cost | Sum costUsd |
| Average cost per session | Avg costUsd |
| Total tokens | Sum tokens |
| Average duration | Avg durationMs |
| Files modified | Sum filesChanged |

### 2.2 Time trends (per day)
- Sessions per day
- Cost per day
- Tokens per day
- Success rate per day (3-day moving average)

### 2.3 Model distribution
- % usage of opus vs sonnet vs haiku
- Cost per model
- Success rate per model

### 2.4 Agent performance
For each agent (builder, reviewer, scout, planner, architect, error-analyzer):
- Usage frequency
- Success rate
- Trend (from agent-scores.jsonl)
- Average cost per invocation

### 2.5 Skill effectiveness
For each skill used:
- Load frequency
- Correlation with success rate (sessions with skill vs without skill)
- Average cost of sessions with skill

### 2.6 Top patterns
From patterns.jsonl:
- Top 5 patterns by success rate (with sampleSize >= 5)
- Top 5 patterns by cost-efficiency
- Patterns in decline (success rate dropping)

### 2.7 Failure analysis
- Categorize most frequent errors
- Agents that fail most often
- Hours of day with most errors
- Most expensive sessions without a successful result

### 2.8 Recommendations
Generate actionable insights based on the data:

| Condition | Insight |
|-----------|---------|
| An agent has success rate < 70% | "Warning: [agent] fails frequently ([rate]%). Review prompts or assigned skills." |
| A model represents >60% of total cost | "Tip: [model] consumes [%] of the budget. Consider downgrading for simple tasks." |
| A skill does not improve success rate | "Issue: [skill] shows no measurable improvement. Evaluate whether the triggers are correct." |
| Overall success rate > 90% | "OK: Healthy orchestration. Success rate: [rate]%." |
| Average cost rising vs previous period | "Trend: Average cost rising [%]. Review model routing and task complexity." |
| A pattern has >90% success rate | "Target: Pattern '[pattern]' is highly effective ([rate]%). Increase its usage." |
| Sessions with no agents used | "Search: [N] sessions without orchestration. Verify that lead mode is active." |

---

## STEP 3: GENERATE HTML

Create a **standalone** HTML file (no local dependencies) with the following design:

### Design System

**Dark mode palette**:
```
--bg-primary: #0d1117
--bg-secondary: #161b22
--bg-tertiary: #1c2128
--border: #30363d
--text-primary: #e6edf3
--text-secondary: #8b949e
--accent-green: #3fb950
--accent-red: #f85149
--accent-yellow: #d29922
--accent-blue: #58a6ff
--accent-purple: #bc8cff
--accent-orange: #f0883e
--gradient-start: #58a6ff
--gradient-end: #bc8cff
```

**Typography**: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` (load Inter from Google Fonts CDN)

**Layout**: Responsive CSS Grid — 12 columns on desktop, 1 column on mobile

**Charts**: Use Chart.js v4 from CDN (`https://cdn.jsdelivr.net/npm/chart.js`). All charts with dark theme (subtle gridlines, clear labels, tooltips with dark background).

### HTML Structure

```
+-----------------------------------------------------+
|  HEADER                                              |
|  Logo + "Poneglyph Insights" + period + gen. date   |
|  Gradient accent line (blue -> purple)               |
+-----------------------------------------------------+
|  KPI CARDS (4 cards in a row)                        |
|  +------+ +------+ +------+ +------+                |
|  | Sess | | Rate | | Cost | |Tokens|                |
|  |  142 | | 94%  | |$12.50| | 2.1M |                |
|  +------+ +------+ +------+ +------+                |
+-----------------------------------------------------+
|  TIMELINE (full width)                               |
|  Line chart: sessions + cost per day                 |
|  Dual Y axis: sessions (left), cost (right)          |
+-----------------------+-----------------------------+
|  MODEL DISTRIBUTION   |  SUCCESS RATE TREND          |
|  Doughnut chart       |  Line chart with moving avg  |
|  opus/sonnet/haiku    |  3-day rolling average       |
+-----------------------+-----------------------------+
|  AGENT PERFORMANCE    |  SKILL EFFECTIVENESS         |
|  Horizontal bar       |  Horizontal bar chart        |
|  by success rate      |  with/without skill comparison|
+-----------------------+-----------------------------+
|  TOP PATTERNS (table)                                |
|  Pattern name | Success Rate | Cost | Samples | Trend|
+-----------------------------------------------------+
|  FAILURE ANALYSIS (2 columns)                        |
|  +-----------------+ +-----------------+             |
|  | Most common      | | Expensive       |             |
|  | errors (table)   | | sessions w/o    |             |
|  |                  | | result          |             |
|  +-----------------+ +-----------------+             |
+-----------------------------------------------------+
|  RECOMMENDATIONS (cards with icons)                  |
|  Cards with colored border by type:                  |
|  green=positive, yellow=warning, red=problem         |
+-----------------------------------------------------+
|  FOOTER                                              |
|  "Generated by Poneglyph v2.0 | {date} | {period}"  |
|  + link to repo                                      |
+-----------------------------------------------------+
```

### Section Details

**Header**:
- Large title "Poneglyph Insights" with gradient text (blue to purple via `-webkit-background-clip: text`)
- Subtitle: "Analytics Dashboard for Claude Code Orchestration"
- Badge with analyzed period
- Generation timestamp

**KPI Cards**:
- 4 cards with: icon (emoji), large value (font-size: 2.5rem, font-weight: 700), label below, delta vs previous period (green up or red down with percentage)
- Cards with `backdrop-filter: blur(10px)`, subtle border, box-shadow
- Hover: subtle elevation + border glow

**Timeline Chart**:
- Chart.js Line chart with 2 datasets on dual Y axis
- Dataset 1: Sessions per day (bar, blue with opacity 0.6)
- Dataset 2: Cost per day (line, orange)
- Tooltip shows: date, sessions, cost, tokens
- X axis: formatted dates (dd/MM)

**Model Distribution**:
- Doughnut chart with 3 segments (opus=purple, sonnet=blue, haiku=green)
- Center: total sessions
- Legend below with percentage and cost per model

**Success Rate Trend**:
- Line chart with daily success rate (points) + 3-day moving average (smooth line)
- Reference line at 90% (dashed, green)
- Area below the line with subtle gradient

**Agent Performance**:
- Horizontal bar chart sorted by success rate
- Colors: >90% green, 70-90% yellow, <70% red
- Label shows: name, success rate, sample size

**Skill Effectiveness**:
- Grouped horizontal bars: success rate WITH skill (blue) vs WITHOUT skill (gray)
- Only skills with >= 5 samples
- Sorted by delta (highest impact at top)

**Top Patterns**:
- Styled table with:
  - Columns: Pattern, Type, Success Rate, Avg Cost, Samples, Trend
  - Success rate with inline progress bar (color-coded)
  - Trend with emoji (improving, stable, declining)
  - Hover highlight on rows
  - Subtle zebra striping

**Failure Analysis**:
- 2 cards side by side
- Card 1: "Most frequent errors" — table with error type, count, last seen
- Card 2: "Expensive sessions without result" — table with date, prompt (truncated), cost, model

**Recommendations**:
- Cards with thick left border color (green/yellow/red/blue)
- Large icon on the left
- Title + description + suggested action
- Sorted by priority (red > yellow > green)

### Advanced CSS

Include these effects:
- `@keyframes fadeInUp` for card entrance animation
- `transition: all 0.2s ease` on card and row hover
- `scroll-behavior: smooth` on html
- Media queries: responsive to mobile (stack cards vertically)
- `::selection` with accent color
- Custom dark scrollbar (webkit)
- Print styles that hide charts and show data as tables

### Example data (fallback)

If there is NO data for a given source, generate a section with:
```html
<div class="empty-state">
  <span class="empty-icon">📊</span>
  <p>No data available for this section</p>
  <p class="hint">Data is generated automatically with Claude Code usage</p>
</div>
```

---

## STEP 4: SAVE AND OPEN

1. Save the HTML to: `~/.claude/reports/insights-{YYYY-MM-DD}.html`
   - Create directory `~/.claude/reports/` if it does not exist

2. Report to the user:
```
Dashboard generated: ~/.claude/reports/insights-{date}.html

## Summary
- Period: {from} to {to}
- Sessions: {N}
- Success rate: {%}
- Total cost: ${X.XX}
- Recommendations: {N} ({critical} critical, {warnings} warnings, {positive} positive)

Open the file in your browser to see the full dashboard.
```

---

## ANTI-PATTERNS

| NO | YES |
|----|-----|
| Generate charts as images | Use interactive Chart.js |
| Hardcode example data | Read real data from traces |
| HTML without responsive | CSS Grid + media queries |
| Light colors | Dark mode ALWAYS |
| Plain unstyled tables | Tables with zebra, hover, progress bars |
| Skip section if no data | Show elegant empty state |
| Giant file without structure | Well-organized HTML with comments |

---

## USAGE EXAMPLES

```
/insights-poneglyph
/insights-poneglyph 7d
/insights-poneglyph 90d
/insights-poneglyph all
```

---

**Version**: 2.0.0
**Category**: analytics
**Related**: `/traces`, `/impact`
