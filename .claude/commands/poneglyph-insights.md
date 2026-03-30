---
description: Dashboard analitico HTML — evalua uso de Claude Code con metricas, tendencias, patrones y recomendaciones accionables
model: opus
---

# /insights-poneglyph

Genera un dashboard HTML interactivo con analisis profundo del uso de Claude Code. Dark mode, visualizaciones con Chart.js, metricas accionables.

## INPUT

```
$ARGUMENTS
```

Periodo por defecto: ultimos 30 dias. Si `$ARGUMENTS` especifica un periodo (ej: "7d", "90d", "all"), usar ese.

---

## PASO 1: RECOPILAR DATOS

Leer TODAS estas fuentes. Si un archivo no existe, marcar como "sin datos" en el dashboard (no fallar).

### 1.1 Traces de ejecucion
```bash
# Leer todos los archivos JSONL de traces
ls ~/.claude/traces/*.jsonl
```

Cada linea es un JSON con campos:
- `ts` (timestamp ISO)
- `sessionId`
- `prompt` (texto del usuario)
- `agents` (array de agentes usados)
- `skills` (array de skills cargadas)
- `tokens`, `inputTokens`, `outputTokens`
- `costUsd`
- `durationMs`
- `model` (opus/sonnet/haiku)
- `status` (success/error/timeout)
- `toolCalls` (numero de tool calls)
- `filesChanged` (numero de archivos modificados)

### 1.2 Patrones descubiertos
```bash
cat ~/.claude/patterns.jsonl
```

Campos: `type` (sequence/skill_combo/decomposition/recovery), `pattern` (agents, skills, taskType, complexityRange), `outcome` (successRate, avgDuration, avgCost, avgRetries), `confidence`, `sampleSize`

### 1.3 Agent scores
```bash
cat ~/.claude/agent-scores.jsonl
```

Campos: `agent`, `taskType`, `compositeScore`, `successRate`, `trend` (improving/stable/declining), `sampleSize`, `recentScores`

---

## PASO 2: COMPUTAR METRICAS

Calcular todo esto desde los datos raw:

### 2.1 Overview KPIs
| Metrica | Calculo |
|---------|---------|
| Total sesiones | Count de traces en periodo |
| Success rate | % con status=success |
| Coste total | Sum costUsd |
| Coste medio por sesion | Avg costUsd |
| Tokens totales | Sum tokens |
| Duracion media | Avg durationMs |
| Archivos modificados | Sum filesChanged |

### 2.2 Tendencias temporales (por dia)
- Sesiones por dia
- Coste por dia
- Tokens por dia
- Success rate por dia (media movil 3 dias)

### 2.3 Distribucion de modelos
- % uso de opus vs sonnet vs haiku
- Coste por modelo
- Success rate por modelo

### 2.4 Performance de agentes
Para cada agente (builder, reviewer, scout, planner, architect, error-analyzer):
- Frecuencia de uso
- Success rate
- Trend (de agent-scores.jsonl)
- Coste medio por invocacion

### 2.5 Efectividad de skills
Para cada skill usada:
- Frecuencia de carga
- Correlacion con success rate (sesiones con skill vs sin skill)
- Coste medio de sesiones con skill

### 2.6 Patrones top
De patterns.jsonl:
- Top 5 patrones por success rate (con sampleSize >= 5)
- Top 5 patrones por coste-eficiencia
- Patrones con declive (success rate bajando)

### 2.7 Analisis de fallos
- Categorizar errores mas frecuentes
- Agentes que mas fallan
- Horas del dia con mas errores
- Sesiones mas caras sin resultado exitoso

### 2.8 Recomendaciones
Generar insights accionables basados en los datos:

| Condicion | Insight |
|-----------|---------|
| Un agente tiene success rate < 70% | "Warning: [agent] falla frecuentemente ([rate]%). Revisar prompts o skills asignadas." |
| Un modelo representa >60% del coste total | "Tip: [model] consume [%] del presupuesto. Considerar downgrade para tareas simples." |
| Una skill no mejora success rate | "Issue: [skill] no aporta mejora medible. Evaluar si los triggers son correctos." |
| Success rate general > 90% | "OK: Orquestacion saludable. Success rate: [rate]%." |
| Coste medio subiendo vs periodo anterior | "Trend: Coste medio subiendo [%]. Revisar model routing y complejidad de tareas." |
| Un patron tiene >90% success rate | "Target: Patron '[pattern]' es muy efectivo ([rate]%). Potenciar su uso." |
| Sesiones sin agentes usados | "Search: [N] sesiones sin orquestacion. Verificar que el lead mode esta activo." |

---

## PASO 3: GENERAR HTML

Crear un archivo HTML **standalone** (sin dependencias locales) con este diseno:

### Design System

**Paleta dark mode**:
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

**Tipografia**: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` (cargar Inter desde Google Fonts CDN)

**Layout**: CSS Grid responsive — 12 columns en desktop, 1 column en mobile

**Charts**: Usar Chart.js v4 desde CDN (`https://cdn.jsdelivr.net/npm/chart.js`). Todos los charts con theme dark (gridlines sutiles, labels claros, tooltips con fondo oscuro).

### Estructura del HTML

```
+-----------------------------------------------------+
|  HEADER                                              |
|  Logo + "Poneglyph Insights" + periodo + fecha gen.  |
|  Gradient accent line (blue -> purple)               |
+-----------------------------------------------------+
|  KPI CARDS (4 cards en fila)                         |
|  +------+ +------+ +------+ +------+                |
|  | Sess | | Rate | | Cost | |Tokens|                |
|  |  142 | | 94%  | |$12.50| | 2.1M |                |
|  +------+ +------+ +------+ +------+                |
+-----------------------------------------------------+
|  TIMELINE (full width)                               |
|  Line chart: sesiones + coste por dia                |
|  Dual Y axis: sesiones (izq), coste (der)           |
+-----------------------+-----------------------------+
|  MODEL DISTRIBUTION   |  SUCCESS RATE TREND          |
|  Doughnut chart       |  Line chart con media movil  |
|  opus/sonnet/haiku    |  3-day rolling average       |
+-----------------------+-----------------------------+
|  AGENT PERFORMANCE    |  SKILL EFFECTIVENESS         |
|  Horizontal bar       |  Horizontal bar chart        |
|  por success rate     |  con/sin skill comparison    |
+-----------------------+-----------------------------+
|  TOP PATTERNS (table)                                |
|  Pattern name | Success Rate | Cost | Samples | Trend|
+-----------------------------------------------------+
|  FAILURE ANALYSIS (2 columns)                        |
|  +-----------------+ +-----------------+             |
|  | Errores comunes  | | Sesiones caras  |             |
|  | (table)          | | sin resultado   |             |
|  +-----------------+ +-----------------+             |
+-----------------------------------------------------+
|  RECOMMENDATIONS (cards con iconos)                  |
|  Cards con borde de color segun tipo:                |
|  green=positivo, yellow=alerta, red=problema         |
+-----------------------------------------------------+
|  FOOTER                                              |
|  "Generated by Poneglyph v2.0 | {fecha} | {periodo}"|
|  + link a repo                                       |
+-----------------------------------------------------+
```

### Detalles de cada seccion

**Header**:
- Titulo grande "Poneglyph Insights" con gradiente text (azul a morado via `-webkit-background-clip: text`)
- Subtitulo: "Analytics Dashboard for Claude Code Orchestration"
- Badge con periodo analizado
- Timestamp de generacion

**KPI Cards**:
- 4 cards con: icono (emoji), valor grande (font-size: 2.5rem, font-weight: 700), label debajo, delta vs periodo anterior (green up or red down con porcentaje)
- Cards con `backdrop-filter: blur(10px)`, border sutil, box-shadow
- Hover: sutil elevation + border glow

**Timeline Chart**:
- Chart.js Line chart con 2 datasets en dual Y axis
- Dataset 1: Sessions per day (bar, azul con opacity 0.6)
- Dataset 2: Cost per day (line, naranja)
- Tooltip muestra: fecha, sesiones, coste, tokens
- X axis: fechas formateadas (dd/MM)

**Model Distribution**:
- Doughnut chart con 3 segmentos (opus=purple, sonnet=blue, haiku=green)
- Centro: total sesiones
- Legend debajo con porcentaje y coste por modelo

**Success Rate Trend**:
- Line chart con success rate diario (puntos) + media movil 3 dias (linea suave)
- Linea de referencia a 90% (dashed, green)
- Area bajo la linea con gradiente sutil

**Agent Performance**:
- Horizontal bar chart ordenado por success rate
- Colores: >90% green, 70-90% yellow, <70% red
- Label muestra: nombre, success rate, sample size

**Skill Effectiveness**:
- Grouped horizontal bars: success rate CON skill (blue) vs SIN skill (gray)
- Solo skills con >= 5 samples
- Ordenado por delta (mayor impacto arriba)

**Top Patterns**:
- Table estilizada con:
  - Columnas: Pattern, Type, Success Rate, Avg Cost, Samples, Trend
  - Success rate con progress bar inline (color-coded)
  - Trend con emoji (improving, stable, declining)
  - Hover highlight en filas
  - Zebra striping sutil

**Failure Analysis**:
- 2 cards lado a lado
- Card 1: "Errores mas frecuentes" — tabla con error type, count, last seen
- Card 2: "Sesiones caras sin resultado" — tabla con fecha, prompt (truncado), coste, modelo

**Recommendations**:
- Cards con borde izquierdo grueso de color (green/yellow/red/blue)
- Icono grande a la izquierda
- Titulo + descripcion + accion sugerida
- Ordenadas por prioridad (red > yellow > green)

### CSS Avanzado

Incluir estos efectos:
- `@keyframes fadeInUp` para entrada de cards
- `transition: all 0.2s ease` en hover de cards y filas
- `scroll-behavior: smooth` en html
- Media queries: responsive a mobile (stack cards vertical)
- `::selection` con color accent
- Scrollbar custom dark (webkit)
- Print styles que ocultan charts y muestran data en tablas

### Datos de ejemplo (fallback)

Si NO hay datos en alguna fuente, generar seccion con:
```html
<div class="empty-state">
  <span class="empty-icon">📊</span>
  <p>Sin datos disponibles para esta seccion</p>
  <p class="hint">Los datos se generan automaticamente con el uso de Claude Code</p>
</div>
```

---

## PASO 4: GUARDAR Y ABRIR

1. Guardar el HTML en: `~/.claude/reports/insights-{YYYY-MM-DD}.html`
   - Crear directorio `~/.claude/reports/` si no existe

2. Reportar al usuario:
```
Dashboard generado: ~/.claude/reports/insights-{fecha}.html

## Resumen
- Periodo: {desde} a {hasta}
- Sesiones: {N}
- Success rate: {%}
- Coste total: ${X.XX}
- Recomendaciones: {N} ({criticas} criticas, {alertas} alertas, {positivas} positivas)

Abre el archivo en tu navegador para ver el dashboard completo.
```

---

## ANTI-PATTERNS

| NO | SI |
|----|-----|
| Generar charts como imagenes | Usar Chart.js interactivo |
| Hardcodear datos de ejemplo | Leer datos reales de traces |
| HTML sin responsive | CSS Grid + media queries |
| Colores claros | Dark mode SIEMPRE |
| Tablas planas sin estilo | Tables con zebra, hover, progress bars |
| Omitir seccion si no hay datos | Mostrar empty state elegante |
| Archivo gigante sin estructura | HTML bien organizado con comments |

---

## EJEMPLO DE USO

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
