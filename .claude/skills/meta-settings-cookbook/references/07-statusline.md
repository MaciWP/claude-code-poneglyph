# StatusLine — ccstatusline (v2.2.10)

## Installation and configuration

```bash
bun install -g ccstatusline@latest
```

**settings.json** (`~/.claude/settings.json`):
```json
"statusLine": {
  "type": "command",
  "command": "$HOME/.bun/bin/ccstatusline",
  "padding": 0,
  "refreshInterval": 10
}
```

Widget config: `~/.config/ccstatusline/settings.json`

---

## ⚠️ Correct registry names (the README calls them differently)

| Correct name | Incorrect alias in docs | What it does |
|---|---|---|
| `reset-timer` | ~~block-reset-timer~~ | Time remaining in the 5h block |
| `git-review` | ~~git-pr~~ | Current PR status with clickable link |

---

## Widgets by category

**Model and session**
- `model` — name of the active model
- `thinking-effort` — effort level (low/medium/high/default)
- `session-cost` — accumulated cost in USD

**Git**
- `git-branch` — current branch
- `git-review` — PR status (requires authenticated `gh` CLI)
- `git-changes` — `(+N,-M)` changes in staging
- `git-insertions` / `git-deletions` — separately (read real staging, not `cost.total_lines_*`)

**Context**
- `context-percentage` — % of the context window used
- `context-bar` — visual bar `▓▓▓░░░░░░░` (requires `context_window_size` in the input JSON)
- `context-length` — used tokens as a number

**Paths**
- `current-working-dir` — current directory
  - `metadata.segments: "1"` — only the last segment (must be a **string**, not a number)
  - `metadata.abbreviateHome: "true"` — abbreviate with `~`
  - `rawMode: true` — remove "cwd: " prefix

**Timers and quotas** (require Anthropic usage API — do not work in test without a real session)
- `session-usage` — % of the session limit used
- `weekly-usage` — % of the weekly limit used
- `reset-timer` — time remaining until the 5h block resets
- `weekly-reset-timer` — time remaining until weekly reset

---

## Recommended layout (4 lines, left/right alignment)

```json
{
  "version": 3,
  "lines": [
    [
      {"id":"1", "type":"current-working-dir", "color":"brightBlue", "rawMode":true,
       "metadata":{"segments":"1","abbreviateHome":"true"}},
      {"id":"2", "type":"flex-separator"},
      {"id":"3", "type":"model", "color":"cyan", "rawMode":true},
      {"id":"4", "type":"separator"},
      {"id":"5", "type":"thinking-effort", "color":"brightMagenta", "rawMode":true}
    ],
    [
      {"id":"6",  "type":"git-review",    "color":"brightCyan"},
      {"id":"7",  "type":"separator"},
      {"id":"8",  "type":"git-changes",   "color":"brightWhite"},
      {"id":"9",  "type":"separator"},
      {"id":"10", "type":"session-cost",  "color":"brightYellow", "rawMode":true},
      {"id":"11", "type":"flex-separator"},
      {"id":"12", "type":"git-branch",    "color":"magenta"}
    ],
    [
      {"id":"13", "type":"weekly-reset-timer", "color":"brightBlack"},
      {"id":"14", "type":"flex-separator"},
      {"id":"15", "type":"context-percentage", "color":"brightRed"},
      {"id":"16", "type":"separator"},
      {"id":"17", "type":"context-bar", "color":"brightRed",
       "metadata":{"display":"slider-only"}}
    ],
    [
      {"id":"18", "type":"weekly-usage",  "color":"brightCyan"},
      {"id":"19", "type":"flex-separator"},
      {"id":"20", "type":"session-usage", "color":"brightGreen"},
      {"id":"21", "type":"separator"},
      {"id":"22", "type":"reset-timer",   "color":"brightYellow"}
    ]
  ],
  "flexMode": "full-minus-40",
  "colorLevel": 2
}
```

---

## Critical notes

- `flex-separator` pushes subsequent content to the right of the line
- `context-bar` requires `context_window.context_window_size` in Claude Code's input JSON
- `git-changes` shows changes from the git staging area — not the session's `cost.total_lines_added`
- `block-timer` ≠ `reset-timer`: the first shows elapsed time, the second shows remaining time
- Installing globally with bun avoids the "Resolving dependencies" noise on each refresh (every 10s)
- The global binary resolves to `$HOME/.bun/bin/ccstatusline` — use absolute path in `settings.json`
