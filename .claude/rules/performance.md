# Performance & Navigation

## Tool Hierarchy (Single Source of Truth)

| Prioridad | Tool | Uso |
|-----------|------|-----|
| 1 | **LSP** | Navegacion semantica (type-aware) |
| 2 | Grep | Busqueda de texto (fallback) |
| 3 | Glob | Busqueda de archivos |

## LSP Operations

| Tarea | Operacion LSP |
|-------|---------------|
| Donde esta definida X? | `goToDefinition` |
| Donde se usa X? | `findReferences` |
| Que parametros acepta? | `hover` |
| Que funciones tiene este archivo? | `documentSymbol` |
| Quien llama a esta funcion? | `incomingCalls` |
| Que llama esta funcion? | `outgoingCalls` |

Usar Grep como fallback cuando: LSP no disponible, busqueda de texto literal, archivos no-codigo.

## Batch Operations (OBLIGATORIO)

| Paralelo (mismo mensaje) | Secuencial (esperar resultado) |
|--------------------------|--------------------------------|
| 3+ Read independientes | Edit despues de Read mismo archivo |
| 2+ Glob patterns diferentes | Write dependiente de Read |
| 2+ Task agents independientes | Task que necesita output previo |
| Multiple LSP en diferentes simbolos | LSP despues de crear archivo |
| LSP + Grep para busqueda comprehensiva | Bash con archivo recien creado |
| goToDefinition + findReferences | Nodo marcado "Blocking" |
| WebSearch + WebFetch | |

**Anti-pattern**: Si lees archivos uno por uno o corres agents secuencialmente -> BATCH en un mensaje.

## Anti-Patterns

| No hacer | Hacer |
|----------|-------|
| Read archivos uno por uno | Batch 3+ Reads en un mensaje |
| Task agents secuenciales sin dependencia | Lanzar agents en paralelo |
| Glob -> Read -> Grep | Glob + Grep paralelos |
| Edit sin Read previo | Read -> Edit secuencial |

## Quality Triggers

| Agent | Cuando |
|-------|--------|
| reviewer | Despues de implementar, refactoring, antes de commit, cambios significativos |

## Tips de Distribucion de Esfuerzo

- Dedicar suficiente tiempo a explorar ANTES de implementar — entender el contexto evita retrabajo
- La verificacion (tests, review) no es opcional — reservar tiempo para ella
- Si llevas mucho rato implementando sin verificar, es momento de un checkpoint

## Tip: Maximizar Paralelismo

- Si estas haciendo operaciones secuenciales que podrian ser paralelas, reagrupalas
- Preguntate: "¿Alguna de estas operaciones depende del resultado de otra?" Si no, batch.
- El objetivo es minimizar ida y vuelta innecesarios, no optimizar un score numerico

## Team Mode Efficiency

> **GUIDELINE**: Estas metricas son orientativas para el Lead cuando el planner recomienda team mode.

| Metrica | Guideline |
|---------|-----------|
| Min teammates | 3 (por debajo, subagents son mas baratos) |
| Max teammates | 5 (por encima, overhead de coordinacion domina) |
| Multiplicador de tokens | 3-7x vs subagents (cada teammate es instancia completa de Claude Code) |
| Cuando vale la pena | Dominios verdaderamente independientes, complejidad >60, negociacion de interfaces |
| Cuando NO vale la pena | <3 dominios, archivos compartidos, complejidad <60 |

### Team vs Subagents Cost

| Modo | Coste | Paralelismo | Comunicacion inter-agente |
|------|-------|-------------|---------------------------|
| Subagents | 1x (baseline) | Via Lead (hub-spoke) | No (solo Lead <-> agente) |
| Team Agents | 3-7x | Independiente (mesh) | Si (peer-to-peer directo) |

## Tip: Evitar Lecturas Redundantes

- No re-leer un archivo que acabas de leer y no ha cambiado
- No re-buscar con Grep lo mismo que ya encontraste
- Si un resultado LSP es reciente y el archivo no cambio, reutilizalo

## Tool Selection

| Tarea | Tool Primario | Fallback |
|-------|---------------|----------|
| Definicion de simbolo | LSP goToDefinition | Grep |
| Usos de simbolo | LSP findReferences | Grep |
| Buscar archivo | Glob | Bash find |
| Buscar texto | Grep | Bash grep |
| Leer archivo | Read | Bash cat |
| Editar archivo | Edit | Bash sed |

## Tools por Complejidad

| Trigger | Tool/Agent |
|---------|------------|
| >3 subtasks o complejidad >60 | planner |
| Prompt vago | AskUserQuestion para clarificar |
| Feature design | architect |
| Pre-implementacion | scout |
