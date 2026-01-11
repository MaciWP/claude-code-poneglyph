# Orchestration

## Jerarquia de navegacion

| Prioridad | Tool | Uso |
|-----------|------|-----|
| 1 | LSP | Navegacion semantica (type-aware) |
| 2 | Grep | Busqueda de texto (fallback) |
| 3 | Glob | Busqueda de archivos |

## Tools por complejidad

| Trigger | Tool/Agent |
|---------|------------|
| >3 subtasks o complejidad >40 | task-decomposer |
| Prompt vago | prompt-engineer |
| Feature design | architect |
| Pre-implementacion | scout |

## Paralelizacion obligatoria

| Paralelo (mismo mensaje) | Secuencial |
|--------------------------|------------|
| Multiple Read/Glob/Grep independientes | Edit despues de Read |
| Multiple LSP en diferentes símbolos | LSP despues de crear archivo |
| LSP + Grep para búsqueda comprehensiva | |
| goToDefinition + findReferences | |
| scout + Context7 | Task que necesita output previo |
| code-quality + reviewer | Bash con archivo recien creado |
| WebSearch + WebFetch | |

**Anti-pattern**: Si lees archivos uno por uno o corres agents secuencialmente -> BATCH en un mensaje.

## Quality triggers

| Agent | Cuando |
|-------|--------|
| code-quality | Despues de implementar, refactoring |
| reviewer | Antes de commit, cambios significativos |
