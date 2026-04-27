# StatusLine — ccstatusline (v2.2.10)

## Instalación y configuración

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

Config de widgets: `~/.config/ccstatusline/settings.json`

---

## ⚠️ Nombres correctos del registro (el README los llama diferente)

| Nombre correcto | Alias erróneo en docs | Qué hace |
|---|---|---|
| `reset-timer` | ~~block-reset-timer~~ | Tiempo restante del bloque de 5h |
| `git-review` | ~~git-pr~~ | Estado del PR actual con link clickable |

---

## Widgets por categoría

**Modelo y sesión**
- `model` — nombre del modelo activo
- `thinking-effort` — nivel de esfuerzo (low/medium/high/default)
- `session-cost` — coste acumulado en USD

**Git**
- `git-branch` — rama actual
- `git-review` — estado del PR (requiere `gh` CLI autenticado)
- `git-changes` — `(+N,-M)` cambios en staging
- `git-insertions` / `git-deletions` — por separado (leen staging real, no `cost.total_lines_*`)

**Contexto**
- `context-percentage` — % del context window usado
- `context-bar` — barra visual `▓▓▓░░░░░░░` (necesita `context_window_size` en el JSON de entrada)
- `context-length` — tokens usados en números

**Rutas**
- `current-working-dir` — directorio actual
  - `metadata.segments: "1"` — solo el último segmento (debe ser **string**, no número)
  - `metadata.abbreviateHome: "true"` — abreviar con `~`
  - `rawMode: true` — quitar prefijo "cwd: "

**Timers y cuotas** (requieren Anthropic usage API — no funcionan en test sin sesión real)
- `session-usage` — % del límite de sesión usado
- `weekly-usage` — % del límite semanal usado
- `reset-timer` — tiempo restante hasta reset del bloque de 5h
- `weekly-reset-timer` — tiempo restante hasta reset semanal

---

## Layout recomendado (4 líneas, alineación izquierda/derecha)

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

## Notas críticas

- `flex-separator` empuja el contenido posterior hacia la derecha de la línea
- `context-bar` requiere `context_window.context_window_size` en el JSON de Claude Code
- `git-changes` muestra cambios del staging area git — no los `cost.total_lines_added` de la sesión
- `block-timer` ≠ `reset-timer`: el primero muestra tiempo transcurrido, el segundo tiempo restante
- Instalar globalmente con bun evita el ruido "Resolving dependencies" en cada refresh (cada 10s)
- El binary global resuelve en `$HOME/.bun/bin/ccstatusline` — usar ruta absoluta en `settings.json`
