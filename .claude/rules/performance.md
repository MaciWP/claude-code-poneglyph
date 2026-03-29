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

## Token Budget

> **GUIDELINE**: Esta distribucion es orientativa. No se mide ni se enforce por hooks — el Lead la sigue intuitivamente.

| Fase | Budget | Descripcion |
|------|--------|-------------|
| Exploracion | 20% | Glob, Grep, Read inicial |
| Implementacion | 60% | Edit, Write, codigo |
| Verificacion | 20% | Tests, review, docs |

## Parallel Efficiency Score

> **GUIDELINE**: Este score es orientativo. No se calcula realmente en runtime — es una guia mental para el Lead.

| Score | Significado | Accion |
|-------|-------------|--------|
| >80% | Excelente | Continuar |
| 50-80% | Aceptable | Revisar oportunidades |
| <50% | Pobre | STOP - refactorizar approach |

**Calculo**: (operaciones paralelas) / (total que PODRIAN ser paralelas) x 100

## Cache Strategy

> **GUIDELINE**: No hay mecanismo de cache real en el runtime. Estas duraciones son orientativas para evitar repetir operaciones innecesariamente.

| Resultado | Cache Duration | Condicion |
|-----------|----------------|-----------|
| LSP results | 5 min | Si archivo no modificado |
| Grep results | 2 min | Si directorio no modificado |
| Read files | 1 min | Si file mtime igual |
| Glob patterns | 30 sec | Si directorio no modificado |

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
