# Self-Improvement Prompt for WebSocket Expert

## Contexto

Acabas de completar una tarea en el dominio WebSocket.
Este es el momento de evaluar si aprendiste algo nuevo.

## Tu Tarea de Self-Improvement

### 1. Revisar lo que hiciste

Analiza la tarea que acabas de completar:
- ¿Qué archivos tocaste?
- ¿Qué patrones usaste?
- ¿Encontraste algo inesperado?

### 2. Comparar con Mental Model

Lee tu expertise.yaml actual y compara:
- ¿Los archivos clave siguen siendo correctos?
- ¿Hay nuevos patrones que deberías documentar?
- ¿Algún issue conocido ya está resuelto?

### 3. Decidir Actualizaciones

#### Añadir al mental model SI:

- Descubriste un archivo importante no documentado
- Aprendiste un patrón nuevo que usarás de nuevo
- Encontraste un issue no documentado
- Algo cambió de ubicación o nombre

#### NO añadir SI:

- Es conocimiento de un solo uso
- Ya está documentado de otra forma
- Es demasiado específico del caso actual

### 4. Formato de Actualización

Si decides actualizar, genera:

```yaml
# UPDATES TO expertise.yaml

# Añadir a key_files (si nuevo archivo)
new_key_file:
  path: path/to/new/file.ts
  purpose: "Descripción del propósito"
  patterns: [patron1, patron2]
  last_verified: 2025-12-25

# Añadir a patterns (si nuevo patrón)
new_pattern:
  name: "Nombre del Patrón"
  confidence: 0.80
  usage: "Cuándo usar este patrón"
  example: |
    // código de ejemplo

# Añadir a known_issues (si nuevo issue)
new_issue:
  id: WS-XXX
  symptom: "Lo que observaste"
  solution: "Cómo lo resolviste"
  verified: true
  date_found: 2025-12-25

# Añadir a changelog (SIEMPRE)
changelog_entry:
  date: 2025-12-25
  type: learned
  source: task_completion
  change: "Descripción breve del aprendizaje"
  confidence_delta: 0.02
```

### 5. Validación Anti-Garbage

ANTES de añadir algo, pregúntate:

1. ¿Es información VERIFICABLE contra el código?
2. ¿Me ayudará en FUTURAS tareas?
3. ¿Es ESPECÍFICO de este proyecto (no genérico)?

Si alguna respuesta es NO → no lo añadas.

### 6. Output Esperado

```markdown
## Self-Improvement Report

### ¿Hubo aprendizajes? [SÍ/NO]

### Actualizaciones Propuestas
[YAML con cambios, o "Ninguna"]

### Confianza Actual
Antes: X.XX
Después: Y.YY
Delta: +0.0Z

### Razón del Delta
[Por qué subió/bajó la confianza]
```

## Archivos Clave del Dominio WebSocket

Para referencia, estos son los archivos que deberías conocer:

| Archivo | Propósito |
|---------|-----------|
| `server/src/routes/websocket.ts` | Handler principal WebSocket |
| `web/src/hooks/useWebSocket.ts` | React hook para conexión |
| `server/src/services/agent-registry.ts` | Registry con EventEmitter |
| `server/src/services/claude.ts` | Servicio que spawna CLI |

## Patrones Conocidos

- **JSON Streaming over WebSocket**: JSON individual por mensaje (frontend ↔ backend)
- **NDJSON Parser**: En claude.ts para comunicación con Claude CLI
- **Exponential Backoff**: Reconexión en useWebSocket.ts con Math.pow(2, retry)
- **Abort Handling**: Cancelación con SIGTERM, luego SIGKILL tras 500ms
- **Event-Driven**: Comunicación via EventEmitter (agent-registry)
- **Lead Orchestrator Events**: orchestrator_event, agent_event chunks

## Ejemplo de Mejora Válida

```yaml
new_pattern:
  name: "Lead Orchestrator Event Streaming"
  confidence: 0.85
  usage: "Streaming de eventos desde OrchestratorAgent al frontend"
  example: |
    leadOrchestrator.on('classified', (data) => {
      ws.send(JSON.stringify({
        type: 'orchestrator_event',
        event: 'classified',
        ...data
      }))
    })
  gotchas:
    - Limpiar listeners con .off() en finally block
    - Usar requestId para tracking

changelog_entry:
  date: 2025-12-25
  type: learned
  source: task_completion
  change: "Añadido patrón Lead Orchestrator Event Streaming"
  confidence_delta: 0.02
```

## Ejemplo de Mejora Rechazada

```yaml
# NO AÑADIR - demasiado específico
new_pattern:
  name: "Fix typo in line 42"
  # Esto no es un patrón, es un one-off fix

# NO AÑADIR - conocimiento genérico
new_pattern:
  name: "async/await usage"
  # Esto es conocimiento general de JavaScript, no específico del dominio
```
